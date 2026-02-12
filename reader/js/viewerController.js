/**
 * Viewer Controller for Text Reader SPA
 * Handles the text viewing functionality with chapter navigation
 */

const ViewerController = {
  // State
  state: {
    db: null,
    localFileProcessor: null,
    storyId: null,
    fileContent: '',
    chapters: [],
    currentChapter: null,
    totalPages: 1,
    filteredChapters: [],
    readingHistory: null,
    isSidebarHidden: false,
    isSidebarPinned: false,
    lastScrollTop: 0,
    isScrollingInSidebar: false,
    savedScrollPosition: 0,
    initialized: false,
    eventListenersAttached: false,
    // Speech synthesis
    speechSynthesis: window.speechSynthesis,
    speechUtterance: null,
    isSpeaking: false,
    isPaused: false,
    speechTextQueue: [],
    currentSpeechIndex: 0,
    chineseVoice: null,
    speechRate: 1.3,
    MIN_SPEECH_RATE: 0.5,
    MAX_SPEECH_RATE: 2.0,
    SPEECH_RATE_STEP: 0.1,
    // Intervals and timers
    saveProgressInterval: null,
    scrollTimer: null
  },

  /**
   * Initialize the viewer with route params
   */
  async init(params) {
    try {
      this.state.storyId = params.id;
      
      if (!this.state.storyId) {
        this.showContent('Invalid story ID');
        return;
      }

      // Initialize database and processor
      if (!this.state.db) {
        this.state.db = new TextReaderDB();
        await this.state.db.init();
      }
      if (!this.state.localFileProcessor) {
        this.state.localFileProcessor = new LocalFileProcessor();
        window.localFileProcessor = this.state.localFileProcessor;
      }

      // Load reading history
      this.state.readingHistory = await this.state.db.getReadingHistory(this.state.storyId);

      // Load the TXT file content
      await this.loadFileContent();

      // Initialize chapters sidebar
      this.initSidebar();

      // Setup event listeners (only once)
      if (!this.state.eventListenersAttached) {
        this.setupEventListeners();
        this.state.eventListenersAttached = true;
      }

      // Setup auto-hide functionality
      this.setupAutoHide();

      // Load saved theme
      this.loadTheme();

      // Setup speech synthesis
      this.initSpeechSynthesis();

      // Load saved pin state
      this.loadPinState();

      // Save reading progress periodically
      this.state.saveProgressInterval = setInterval(() => this.saveReadingProgress(), 30000);

      this.state.initialized = true;
    } catch (error) {
      console.error('Error initializing viewer:', error);
      this.showContent('Error initializing viewer: ' + error.message);
    }
  },

  /**
   * Cleanup when leaving the view
   */
  destroy() {
    // Stop speech
    this.stopSpeech();
    
    // Clear intervals
    if (this.state.saveProgressInterval) {
      clearInterval(this.state.saveProgressInterval);
      this.state.saveProgressInterval = null;
    }

    // Save reading progress before leaving
    this.saveReadingProgress();

    // Reset sidebar state for next visit
    this.state.isSidebarHidden = false;
    
    // Unlock body scroll if it was locked
    document.body.classList.remove('sidebar-open');
    document.body.style.top = '';
  },

  showContent(message) {
    const textContent = document.getElementById('viewerTextContent');
    if (textContent) {
      textContent.textContent = message;
    }
  },

  initSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    if (sidebar) {
      if (this.isMobileView()) {
        sidebar.style.display = 'block';
        sidebar.classList.add('hidden-bottom');
        sidebar.classList.remove('visible', 'hidden-left');
        this.state.isSidebarHidden = true;
      } else {
        sidebar.classList.add('visible');
        sidebar.classList.remove('hidden-bottom', 'hidden-left');
        sidebar.style.display = 'block';
        this.state.isSidebarHidden = false;
      }
    }
  },

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('chapterSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterChapters(e.target.value));
    }

    // Theme options
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const theme = e.currentTarget.getAttribute('data-theme');
        this.applyTheme(theme);
      });
    });

    // Pin toggle button
    const togglePinBtn = document.getElementById('togglePinBtn');
    if (togglePinBtn) {
      togglePinBtn.addEventListener('click', () => this.togglePinSidebar());
    }

    // Setup pagination click handler
    this.setupPaginationClickHandler();

    // Setup double-tap/click to toggle sidebar
    this.setupSidebarToggle();

    // Window resize handler
    window.addEventListener('resize', () => this.handleResize());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Before unload - save progress
    window.addEventListener('beforeunload', () => {
      this.saveReadingProgress();
      this.stopSpeech();
    });
  },

  setupPaginationClickHandler() {
    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer) return;

    const BOTTOM_TAP_THRESHOLD = 0.80;
    const SIDE_TAP_THRESHOLD = 0.25;

    // Check if coordinate is in center area (for double-tap detection)
    const isInCenterArea = (rect, x, y) => {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const centerAreaWidth = rect.width * 0.5;
      const centerAreaHeight = rect.height * 0.5;
      const centerLeft = centerX - centerAreaWidth / 2;
      const centerRight = centerX + centerAreaWidth / 2;
      const centerTop = centerY - centerAreaHeight / 2;
      const centerBottom = centerY + centerAreaHeight / 2;

      return x >= centerLeft && x <= centerRight &&
             y >= centerTop && y <= centerBottom;
    };

    const handlePaginationClick = (e) => {
      const rect = contentContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const containerHeight = rect.height;
      const containerWidth = rect.width;
      const bottomThreshold = containerHeight * BOTTOM_TAP_THRESHOLD;
      const leftSideThreshold = containerWidth * SIDE_TAP_THRESHOLD;
      const rightSideThreshold = containerWidth * (1 - SIDE_TAP_THRESHOLD);

      if (clickY >= bottomThreshold || clickX <= leftSideThreshold || clickX >= rightSideThreshold) {
        const scrollAmount = containerHeight * 0.9;
        contentContainer.scrollBy({
          top: scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    contentContainer.addEventListener('click', handlePaginationClick);

    // Store reference for touch handling
    this._paginationTouchHandler = (e) => {
      const touch = e.touches[0];
      const rect = contentContainer.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Skip pagination if in center area (reserved for double-tap)
      if (isInCenterArea(rect, touchX, touchY)) {
        return;
      }

      const containerHeight = rect.height;
      const containerWidth = rect.width;
      const bottomThreshold = containerHeight * BOTTOM_TAP_THRESHOLD;
      const leftSideThreshold = containerWidth * SIDE_TAP_THRESHOLD;
      const rightSideThreshold = containerWidth * (1 - SIDE_TAP_THRESHOLD);

      if (touchY >= bottomThreshold || touchX <= leftSideThreshold || touchX >= rightSideThreshold) {
        e.preventDefault();
        const scrollAmount = containerHeight * 0.9;
        contentContainer.scrollBy({
          top: scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    contentContainer.addEventListener('touchstart', this._paginationTouchHandler, { passive: false });
  },

  setupSidebarToggle() {
    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer) return;

    const isInCenterArea = (rect, x, y) => {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const centerAreaWidth = rect.width * 0.5;
      const centerAreaHeight = rect.height * 0.5;
      const centerLeft = centerX - centerAreaWidth / 2;
      const centerRight = centerX + centerAreaWidth / 2;
      const centerTop = centerY - centerAreaHeight / 2;
      const centerBottom = centerY + centerAreaHeight / 2;

      return x >= centerLeft && x <= centerRight &&
             y >= centerTop && y <= centerBottom;
    };

    // Double-click for desktop
    contentContainer.addEventListener('dblclick', (e) => {
      const rect = contentContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (isInCenterArea(rect, clickX, clickY)) {
        this.toggleSidebar();
      }
    });

    // Double-tap for touch devices
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    const doubleTapDelay = 300;
    const doubleTapDistance = 30;
    let justToggledSidebar = false;

    contentContainer.addEventListener('touchstart', (e) => {
      const rect = contentContainer.getBoundingClientRect();
      const touch = e.touches[0];
      const tapX = touch.clientX - rect.left;
      const tapY = touch.clientY - rect.top;

      if (!isInCenterArea(rect, tapX, tapY)) {
        return;
      }

      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastTapTime;
      const distance = Math.sqrt(
        Math.pow(tapX - lastTapX, 2) + Math.pow(tapY - lastTapY, 2)
      );

      if (timeDiff < doubleTapDelay && distance < doubleTapDistance) {
        e.preventDefault();
        e.stopPropagation();
        justToggledSidebar = true;
        this.toggleSidebar();
        lastTapTime = 0;
      } else {
        lastTapTime = currentTime;
        lastTapX = tapX;
        lastTapY = tapY;
      }
    }, { passive: false });

    // Tap outside sidebar to close (for mobile)
    document.addEventListener('touchend', (e) => {
      // Skip if we just toggled sidebar via double-tap
      if (justToggledSidebar) {
        justToggledSidebar = false;
        return;
      }

      if (!this.isMobileView()) return;

      const sidebar = document.getElementById('chaptersSidebar');
      if (!sidebar || !sidebar.classList.contains('visible')) return;

      if (contentContainer.contains(e.target)) {
        this.hideSidebar();
      }
    }, { passive: true });
  },

  handleResize() {
    const sidebar = document.getElementById('chaptersSidebar');
    if (!sidebar) return;

    if (this.isMobileView()) {
      sidebar.style.display = 'block';
      if (this.state.isSidebarHidden) {
        sidebar.classList.add('hidden-bottom');
        sidebar.classList.remove('visible', 'hidden-left');
        document.body.classList.remove('sidebar-open');
        document.body.style.top = '';
      } else {
        sidebar.classList.add('visible');
        sidebar.classList.remove('hidden-bottom', 'hidden-left');
        this.state.savedScrollPosition = window.scrollY || document.documentElement.scrollTop;
        document.body.classList.add('sidebar-open');
        document.body.style.top = `-${this.state.savedScrollPosition}px`;
      }
    } else {
      document.body.classList.remove('sidebar-open');
      document.body.style.top = '';

      if (this.state.isSidebarHidden) {
        sidebar.classList.add('hidden-left');
        sidebar.classList.remove('visible', 'hidden-bottom');
      } else {
        sidebar.classList.add('visible');
        sidebar.style.display = 'block';
        sidebar.classList.remove('hidden-left', 'hidden-bottom');
      }
    }
  },

  handleKeydown(e) {
    // Only handle if viewer is active
    const viewerView = document.querySelector('.viewer-view');
    if (!viewerView || viewerView.style.display === 'none') return;

    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.navigateToPreviousChapter();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.navigateToNextChapter();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.navigateWithinChapter(-1);
        break;
      case 'ArrowDown':
      case ' ':
        e.preventDefault();
        this.navigateWithinChapter(1);
        break;
    }

    if (e.key >= '1' && e.key <= '9') {
      const chapterIndex = parseInt(e.key) - 1;
      if (chapterIndex < this.state.chapters.length) {
        e.preventDefault();
        this.scrollToChapter(chapterIndex);
      }
    }
  },

  isMobileView() {
    return window.innerWidth <= 768;
  },

  // Theme methods
  loadTheme() {
    const savedTheme = localStorage.getItem('preferredViewerTheme') || 'default';
    this.applyTheme(savedTheme);
  },

  applyTheme(theme) {
    // Remove all theme classes
    if (window.themes) {
      Object.values(window.themes).forEach(themeClass => {
        document.body.classList.remove(themeClass);
      });
    }

    // Apply selected theme
    if (window.themes && window.themes[theme]) {
      document.body.classList.add(window.themes[theme]);
    }

    // Save to localStorage
    localStorage.setItem('preferredViewerTheme', theme);
  },

  // Sidebar methods
  toggleSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    if (!sidebar) return;

    if (this.isMobileView()) {
      if (this.state.isSidebarHidden) {
        this.state.savedScrollPosition = window.scrollY || document.documentElement.scrollTop;
        document.body.classList.add('sidebar-open');
        document.body.style.top = `-${this.state.savedScrollPosition}px`;

        sidebar.style.display = 'block';
        sidebar.classList.remove('hidden-bottom', 'hidden-left');
        sidebar.classList.add('visible');
        this.state.isSidebarHidden = false;
      } else {
        sidebar.classList.add('hidden-bottom');
        sidebar.classList.remove('visible');

        document.body.classList.remove('sidebar-open');
        document.body.style.top = '';
        window.scrollTo(0, this.state.savedScrollPosition);

        this.state.isSidebarHidden = true;
      }
    } else {
      if (this.state.isSidebarHidden) {
        sidebar.classList.remove('hidden-left', 'hidden-bottom');
        sidebar.classList.add('visible');
        sidebar.style.display = 'block';
        this.state.isSidebarHidden = false;
      } else {
        sidebar.classList.add('hidden-left');
        sidebar.classList.remove('visible');
        this.state.isSidebarHidden = true;
      }
    }
  },

  showSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    if (sidebar && !this.state.isSidebarPinned) {
      if (this.isMobileView()) {
        this.state.savedScrollPosition = window.scrollY || document.documentElement.scrollTop;
        document.body.classList.add('sidebar-open');
        document.body.style.top = `-${this.state.savedScrollPosition}px`;

        sidebar.style.display = 'block';
        sidebar.classList.remove('hidden-bottom', 'hidden-left');
        sidebar.classList.add('visible');
      } else {
        sidebar.classList.remove('hidden-left', 'hidden-bottom');
        sidebar.classList.add('visible');
        sidebar.style.display = 'block';
      }
      this.state.isSidebarHidden = false;
    }
  },

  hideSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    if (sidebar && !this.state.isSidebarPinned && !this.state.isSidebarHidden) {
      if (this.isMobileView()) {
        sidebar.classList.add('hidden-bottom');
        sidebar.classList.remove('visible');

        document.body.classList.remove('sidebar-open');
        document.body.style.top = '';
        window.scrollTo(0, this.state.savedScrollPosition);
      } else {
        sidebar.classList.add('hidden-left');
        sidebar.classList.remove('visible');
      }
      this.state.isSidebarHidden = true;
    }
  },

  loadPinState() {
    const savedPinState = localStorage.getItem('sidebarPinned');
    if (savedPinState === 'true') {
      this.state.isSidebarPinned = true;
      const sidebar = document.getElementById('chaptersSidebar');
      const pinIcon = document.getElementById('pinIcon');
      if (sidebar && pinIcon) {
        sidebar.classList.add('pinned');
        pinIcon.classList.remove('fa-thumbtack');
        pinIcon.classList.add('fa-lock');
        pinIcon.parentElement.title = 'Unpin sidebar';
      }
    }
  },

  togglePinSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    const pinIcon = document.getElementById('pinIcon');

    if (!sidebar || !pinIcon) return;

    this.state.isSidebarPinned = !this.state.isSidebarPinned;

    if (this.state.isSidebarPinned) {
      sidebar.classList.add('pinned');
      pinIcon.classList.remove('fa-thumbtack');
      pinIcon.classList.add('fa-lock');
      pinIcon.parentElement.title = 'Unpin sidebar';
      this.showSidebar();
    } else {
      sidebar.classList.remove('pinned');
      pinIcon.classList.remove('fa-lock');
      pinIcon.classList.add('fa-thumbtack');
      pinIcon.parentElement.title = 'Pin sidebar';
    }

    localStorage.setItem('sidebarPinned', this.state.isSidebarPinned.toString());
  },

  // Auto-hide functionality
  setupAutoHide() {
    const sidebar = document.getElementById('chaptersSidebar');
    const contentContainer = document.querySelector('.viewer-view .content-container');
    const textContent = document.getElementById('viewerTextContent');

    if (!sidebar || !contentContainer) return;

    sidebar.classList.add('auto-hide');

    if (textContent) {
      textContent.addEventListener('click', () => {
        if (!this.state.isSidebarPinned && !this.state.isSidebarHidden) {
          this.hideSidebar();
        }
      });
    }

    contentContainer.addEventListener('scroll', () => {
      const currentScrollTop = contentContainer.scrollTop;
      this.state.lastScrollTop = currentScrollTop;

      clearTimeout(this.state.scrollTimer);
      this.state.scrollTimer = setTimeout(() => {
        this.updateCurrentChapterFromScroll();
      }, 100);
    });

    const sidebarContent = document.querySelector('.chapters-sidebar-content');
    if (sidebarContent) {
      sidebarContent.addEventListener('scroll', () => {
        this.state.isScrollingInSidebar = true;
        setTimeout(() => {
          this.state.isScrollingInSidebar = false;
        }, 150);
      });
    }
  },

  // File content methods
  async loadFileContent() {
    try {
      const storyData = await this.state.localFileProcessor.db.getStoryById(this.state.storyId);
      if (!storyData) {
        throw new Error('Story not found');
      }

      this.state.fileContent = storyData.processedContent || storyData.content || '';

      const contentForParsing = storyData.content || '';
      if (contentForParsing) {
        const originalFileContent = this.state.fileContent;
        this.state.fileContent = contentForParsing;
        this.parseChapters();
        this.state.fileContent = originalFileContent;
      }

      if (storyData.processedContent) {
        const textContent = document.getElementById('viewerTextContent');
        if (textContent) {
          textContent.innerHTML = this.state.fileContent;
        }
      } else {
        this.displayCurrentPage();
      }

      this.updateChaptersList();

      if (this.state.readingHistory) {
        this.restoreReadingPosition(this.state.readingHistory);
      } else {
        this.state.currentChapter = this.getCurrentChapterFromPage(0);
        setTimeout(() => this.highlightCurrentChapter(), 100);
      }

    } catch (error) {
      this.showContent('Error loading file content: ' + error.message);
    }
  },

  parseChapters() {
    this.state.chapters = [];
    const lines = this.state.fileContent.split('\n');
    let chapterIndex = 0;

    const chapterPatterns = LocalFileProcessor.CHAPTER_PATTERNS;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      for (const pattern of chapterPatterns) {
        if (pattern.test(line)) {
          chapterIndex++;
          const chapterNum = window.extractChapterNumber(line);
          const anchorId = chapterNum !== null
            ? `chapter-${chapterNum}`
            : `chapter-${chapterIndex}`;
          this.state.chapters.push({
            id: `chapter_${this.state.chapters.length}`,
            title: line,
            anchorId: anchorId
          });
          break;
        }
      }
    }

    this.updateChaptersList();
  },

  truncateChapterTitle(title) {
    const maxChars = 32;
    let charCount = 0;
    let truncateIndex = title.length;

    for (let i = 0; i < title.length; i++) {
      const char = title[i];
      const isChinese = /[\u4e00-\u9fa5]/.test(char);
      charCount += isChinese ? 1 : 0.5;

      if (charCount > maxChars) {
        truncateIndex = i;
        break;
      }
    }

    if (truncateIndex < title.length) {
      return title.substring(0, truncateIndex) + '...';
    }
    return title;
  },

  updateChaptersList() {
    const chapterList = document.getElementById('chapterList');
    if (!chapterList) return;

    chapterList.innerHTML = '';

    const chaptersToShow = this.state.filteredChapters.length > 0 
      ? this.state.filteredChapters 
      : this.state.chapters;

    chaptersToShow.forEach((chapter, index) => {
      const li = document.createElement('li');
      li.className = 'chapter-item';
      const chapterNum = window.extractChapterNumber(chapter.title);
      li.dataset.index = chapterNum !== null ? chapterNum : index;
      li.textContent = this.truncateChapterTitle(chapter.title);
      li.title = chapter.title;
      li.addEventListener('click', () => {
        const chapterIndex = parseInt(li.dataset.index);
        this.scrollToChapter(chapterIndex);
      });
      chapterList.appendChild(li);
    });
  },

  filterChapters(searchTerm) {
    if (!searchTerm.trim()) {
      this.state.filteredChapters = [];
      this.updateChaptersList();
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    this.state.filteredChapters = this.state.chapters.filter((chapter) => {
      return chapter.title.toLowerCase().includes(term);
    }).map((chapter) => {
      return {
        ...chapter,
        originalIndex: this.state.chapters.indexOf(chapter)
      };
    });

    this.updateChaptersList();
  },

  displayCurrentPage() {
    const textContent = document.getElementById('viewerTextContent');

    if (textContent) {
      textContent.textContent = this.state.fileContent;
      textContent.style.fontSize = '20px';
    }

    this.state.totalPages = 1;
  },

  // Chapter navigation
  scrollToChapter(chapterIndexOrNum) {
    if (!this.state.chapters || this.state.chapters.length === 0) return;

    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer) return;

    if (this.state.isSpeaking) {
      this.stopSpeech();
    }

    const anchorId = `chapter-${chapterIndexOrNum}`;
    const chapter = this.state.chapters.find(ch => ch.anchorId === anchorId) || this.state.chapters[chapterIndexOrNum];

    if (!chapter) return;

    const targetAnchorId = chapter.anchorId || anchorId;
    const anchorElement = document.getElementById(targetAnchorId);

    if (anchorElement) {
      const containerRect = contentContainer.getBoundingClientRect();
      const anchorRect = anchorElement.getBoundingClientRect();
      const scrollPosition = contentContainer.scrollTop +
        (anchorRect.top - containerRect.top) - 20;

      contentContainer.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });

      this.state.currentChapter = {
        id: chapter.id,
        title: chapter.title
      };
      this.highlightCurrentChapter();
    }
  },

  getCurrentChapterFromPage(page) {
    if (!this.state.chapters || this.state.chapters.length === 0) return null;

    for (let i = this.state.chapters.length - 1; i >= 0; i--) {
      return {
        id: this.state.chapters[i].id,
        title: this.state.chapters[i].title
      };
    }
    return this.state.chapters[0];
  },

  highlightCurrentChapter() {
    document.querySelectorAll('.chapter-item').forEach(item => {
      item.classList.remove('active', 'current');
    });

    if (!this.state.currentChapter) return;

    const chapterNum = window.extractChapterNumber(this.state.currentChapter.title);
    const dataIndex = chapterNum !== null 
      ? chapterNum 
      : this.state.chapters.findIndex(ch => ch.title === this.state.currentChapter.title);

    const currentChapterElement = document.querySelector(
      `.chapter-item[data-index="${dataIndex}"]`
    );
    if (currentChapterElement) {
      currentChapterElement.classList.add('current');
      currentChapterElement.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  },

  updateCurrentChapterFromScroll() {
    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer || !this.state.chapters || this.state.chapters.length === 0) return;

    const containerRect = contentContainer.getBoundingClientRect();
    const scrollOffset = 150;

    let newCurrentIndex = 0;
    for (let i = this.state.chapters.length - 1; i >= 0; i--) {
      const anchorId = this.state.chapters[i].anchorId || `chapter-${i + 1}`;
      const anchorElement = document.getElementById(anchorId);
      if (anchorElement) {
        const anchorRect = anchorElement.getBoundingClientRect();
        if (anchorRect.top <= containerRect.top + scrollOffset) {
          newCurrentIndex = i;
          break;
        }
      }
    }

    if (!this.state.currentChapter || this.state.chapters[newCurrentIndex].title !== this.state.currentChapter.title) {
      this.state.currentChapter = {
        id: this.state.chapters[newCurrentIndex].id,
        title: this.state.chapters[newCurrentIndex].title
      };
      this.highlightCurrentChapter();
    }
  },

  navigateToPreviousChapter() {
    if (!this.state.chapters || this.state.chapters.length === 0) return;

    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer) return;

    const currentScrollTop = contentContainer.scrollTop;

    let currentChapterIndex = 0;
    for (let i = this.state.chapters.length - 1; i >= 0; i--) {
      const position = this.getChapterScrollPosition(i);
      if (position <= currentScrollTop + 100) {
        currentChapterIndex = i;
        break;
      }
    }

    if (currentChapterIndex > 0) {
      this.scrollToChapter(currentChapterIndex - 1);
    }
  },

  navigateToNextChapter() {
    if (!this.state.chapters || this.state.chapters.length === 0) return;

    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer) return;

    const currentScrollTop = contentContainer.scrollTop;

    let currentChapterIndex = 0;
    for (let i = this.state.chapters.length - 1; i >= 0; i--) {
      const position = this.getChapterScrollPosition(i);
      if (position <= currentScrollTop + 100) {
        currentChapterIndex = i;
        break;
      }
    }

    if (currentChapterIndex < this.state.chapters.length - 1) {
      this.scrollToChapter(currentChapterIndex + 1);
    }
  },

  getChapterScrollPosition(chapterIndex) {
    if (!this.state.chapters || chapterIndex >= this.state.chapters.length) return 0;

    const chapter = this.state.chapters[chapterIndex];
    const contentContainer = document.querySelector('.viewer-view .content-container');

    if (!contentContainer) return 0;

    const anchorId = chapter.anchorId || `chapter-${chapterIndex + 1}`;
    const anchorElement = document.getElementById(anchorId);

    if (anchorElement) {
      const containerRect = contentContainer.getBoundingClientRect();
      const anchorRect = anchorElement.getBoundingClientRect();
      return contentContainer.scrollTop +
        (anchorRect.top - containerRect.top) - 20;
    }

    return 0;
  },

  navigateWithinChapter(direction) {
    const contentContainer = document.querySelector('.viewer-view .content-container');
    const textContent = document.getElementById('viewerTextContent');

    if (!contentContainer || !textContent) return;

    const containerHeight = contentContainer.clientHeight;
    const scrollAmount = containerHeight * 0.8;

    if (direction > 0) {
      contentContainer.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    } else if (direction < 0) {
      contentContainer.scrollBy({
        top: -scrollAmount,
        behavior: 'smooth'
      });
    }
  },

  // Reading progress
  restoreReadingPosition(history) {
    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (contentContainer && history.lastScrollPosition) {
      setTimeout(() => {
        contentContainer.scrollTo({
          top: history.lastScrollPosition,
          behavior: 'smooth'
        });
      }, 500);
    }

    if (history.lastChapterTitle && this.state.chapters.length > 0) {
      const matchingChapter = this.state.chapters.find(ch =>
        ch.title.includes(history.lastChapterTitle) ||
        history.lastChapterTitle.includes(ch.title)
      );

      if (matchingChapter) {
        this.state.currentChapter = {
          id: matchingChapter.id,
          title: matchingChapter.title
        };
        setTimeout(() => this.highlightCurrentChapter(), 1000);
      }
    }
  },

  async saveReadingProgress() {
    try {
      const contentContainer = document.querySelector('.viewer-view .content-container');
      if (!contentContainer) return;

      const scrollPosition = contentContainer.scrollTop;

      let currentChapterTitle = '';
      if (this.state.currentChapter) {
        currentChapterTitle = this.state.currentChapter.title;
      } else {
        const currentChapterObj = this.getCurrentChapterFromScrollPosition(scrollPosition);
        if (currentChapterObj) {
          currentChapterTitle = currentChapterObj.title;
        }
      }

      const historyData = {
        storyId: this.state.storyId,
        lastChapterTitle: currentChapterTitle,
        lastScrollPosition: scrollPosition
      };

      await this.state.db.saveReadingHistory(historyData);
    } catch (error) {
      // Silently handle saving errors
    }
  },

  getCurrentChapterFromScrollPosition(scrollPosition) {
    if (!this.state.chapters || this.state.chapters.length === 0) return null;

    const textContent = document.getElementById('viewerTextContent');
    if (!textContent) return null;

    const estimatedCharPos = Math.floor((scrollPosition / textContent.scrollHeight) * this.state.fileContent.length);

    for (let i = this.state.chapters.length - 1; i >= 0; i--) {
      const chapter = this.state.chapters[i];
      if (estimatedCharPos >= chapter.charPosition) {
        return chapter;
      }
    }

    return this.state.chapters[0];
  },

  // Speech synthesis methods
  initSpeechSynthesis() {
    if (!this.state.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    this.state.chineseVoice = this.selectChineseMaleVoice();

    if (this.state.speechSynthesis.getVoices().length === 0) {
      this.state.speechSynthesis.onvoiceschanged = () => {
        this.state.chineseVoice = this.selectChineseMaleVoice();
      };
    }

    this.setupSpeechButton();
  },

  selectChineseMaleVoice() {
    const voices = this.state.speechSynthesis.getVoices();

    const chineseVoices = voices.filter(voice =>
      voice.lang.includes('zh') || voice.lang.includes('cmn')
    );

    if (chineseVoices.length === 0) {
      return null;
    }

    const maleVoice = chineseVoices.find(voice => {
      const name = voice.name.toLowerCase();
      return name.includes('male') ||
             name.includes('nan') ||
             name.includes('nanxing') ||
             name.includes('xiansheng') ||
             name.includes('yong') ||
             name.includes('wei') ||
             name.includes('qiang') ||
             name.includes('gang');
    });

    if (maleVoice) {
      return maleVoice;
    }

    const nonFemaleVoice = chineseVoices.find(voice => {
      const name = voice.name.toLowerCase();
      return !name.includes('female') &&
             !name.includes('nv') &&
             !name.includes('nvxing');
    });

    if (nonFemaleVoice) {
      return nonFemaleVoice;
    }

    return chineseVoices[0];
  },

  setupSpeechButton() {
    const speechBtn = document.getElementById('speechBtn');
    if (speechBtn) {
      speechBtn.addEventListener('click', () => this.toggleSpeech());
    }

    const speedDownBtn = document.getElementById('speechSpeedDownBtn');
    const speedUpBtn = document.getElementById('speechSpeedUpBtn');

    if (speedDownBtn) {
      speedDownBtn.addEventListener('click', () => this.decreaseSpeechSpeed());
    }
    if (speedUpBtn) {
      speedUpBtn.addEventListener('click', () => this.increaseSpeechSpeed());
    }
  },

  decreaseSpeechSpeed() {
    const newRate = Math.max(this.state.MIN_SPEECH_RATE, this.state.speechRate - this.state.SPEECH_RATE_STEP);
    if (newRate !== this.state.speechRate) {
      this.state.speechRate = Math.round(newRate * 10) / 10;
      this.applySpeechSpeedChange();
    }
  },

  increaseSpeechSpeed() {
    const newRate = Math.min(this.state.MAX_SPEECH_RATE, this.state.speechRate + this.state.SPEECH_RATE_STEP);
    if (newRate !== this.state.speechRate) {
      this.state.speechRate = Math.round(newRate * 10) / 10;
      this.applySpeechSpeedChange();
    }
  },

  applySpeechSpeedChange() {
    if (this.state.isSpeaking) {
      const wasPaused = this.state.isPaused;
      const currentIndex = this.state.currentSpeechIndex;

      this.state.speechSynthesis.cancel();

      this.state.isPaused = false;
      this.updateSpeechButton();

      this.state.currentSpeechIndex = currentIndex;
      this.speakNext();

      if (wasPaused) {
        setTimeout(() => {
          this.state.speechSynthesis.pause();
          this.state.isPaused = true;
          this.updateSpeechButton();
        }, 100);
      }
    }
  },

  getTextForSpeech() {
    const textContent = document.getElementById('viewerTextContent');
    if (!textContent) return [];

    const text = textContent.innerText || textContent.textContent || '';
    return text.split('\n').filter(line => line.trim().length > 0);
  },

  toggleSpeech() {
    if (!this.state.speechSynthesis) {
      window.showAlert && window.showAlert('Speech synthesis not supported in this browser');
      return;
    }

    if (this.state.isSpeaking && !this.state.isPaused) {
      this.pauseSpeech();
    } else if (this.state.isSpeaking && this.state.isPaused) {
      this.resumeSpeech();
    } else {
      this.startSpeech();
    }
  },

  startSpeech() {
    this.state.speechTextQueue = this.getTextForSpeech();
    if (this.state.speechTextQueue.length === 0) return;

    const contentContainer = document.querySelector('.viewer-view .content-container');
    const scrollTop = contentContainer ? contentContainer.scrollTop : 0;

    this.state.currentSpeechIndex = this.getTextIndexFromScrollPosition(scrollTop);

    this.state.isSpeaking = true;
    this.state.isPaused = false;
    this.updateSpeechButton();
    this.speakNext();
  },

  pauseSpeech() {
    if (this.state.speechSynthesis) {
      this.state.speechSynthesis.cancel();
      this.state.isPaused = true;
      this.updateSpeechButton();
    }
  },

  resumeSpeech() {
    if (this.state.speechSynthesis) {
      this.state.isPaused = false;
      this.updateSpeechButton();
      this.speakNext();
    }
  },

  stopSpeech() {
    if (this.state.speechSynthesis) {
      this.state.speechSynthesis.cancel();
    }
    this.state.isSpeaking = false;
    this.state.isPaused = false;
    this.state.currentSpeechIndex = 0;
    this.updateSpeechButton();
  },

  speakNext() {
    if (!this.state.isSpeaking || this.state.isPaused || this.state.currentSpeechIndex >= this.state.speechTextQueue.length) {
      if (this.state.currentSpeechIndex >= this.state.speechTextQueue.length) {
        this.stopSpeech();
      }
      return;
    }

    const text = this.state.speechTextQueue[this.state.currentSpeechIndex];

    this.state.speechUtterance = new SpeechSynthesisUtterance(text);

    if (this.state.chineseVoice) {
      this.state.speechUtterance.voice = this.state.chineseVoice;
    }
    this.state.speechUtterance.lang = 'zh-CN';
    this.state.speechUtterance.rate = this.state.speechRate;
    this.state.speechUtterance.pitch = 1.0;

    this.state.speechUtterance.onend = () => {
      if (this.state.isSpeaking && !this.state.isPaused) {
        this.state.currentSpeechIndex++;
        this.checkAutoScroll();
        setTimeout(() => this.speakNext(), 0);
      }
    };

    this.state.speechUtterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.error('Speech error:', event.error);
      }
    };

    this.highlightSpeechLine(this.state.currentSpeechIndex);

    this.state.speechSynthesis.speak(this.state.speechUtterance);
  },

  getTextIndexFromScrollPosition(scrollTop) {
    const textContent = document.getElementById('viewerTextContent');
    if (!textContent) return 0;

    const lines = this.state.speechTextQueue;
    const totalHeight = textContent.scrollHeight;
    const approximateIndex = Math.floor((scrollTop / totalHeight) * lines.length);

    return Math.max(0, Math.min(approximateIndex, lines.length - 1));
  },

  highlightSpeechLine(index) {
    document.querySelectorAll('.speech-highlight').forEach(el => {
      el.classList.remove('speech-highlight');
    });

    const textContent = document.getElementById('viewerTextContent');
    if (!textContent || !this.state.speechTextQueue[index]) return;

    const targetText = this.state.speechTextQueue[index].trim();
    if (!targetText) return;

    const contentDivs = textContent.querySelectorAll('.chapter-content');
    if (contentDivs.length === 0) {
      this.highlightInElement(textContent, targetText);
      return;
    }

    for (const div of contentDivs) {
      if (this.highlightInElement(div, targetText)) {
        return;
      }
    }
  },

  highlightInElement(element, targetText) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const nodeText = node.textContent;
      const trimmedText = nodeText.trim();

      if (trimmedText === targetText || nodeText.includes(targetText)) {
        const parent = node.parentElement;
        if (parent && parent !== element) {
          parent.classList.add('speech-highlight');
          this.scrollToSpeechLine(parent);
          return true;
        }
      }
    }
    return false;
  },

  scrollToSpeechLine(element) {
    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer || !element) return;

    const containerRect = contentContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 24;
    const visibleHeight = containerRect.height;
    const elementTop = elementRect.top - containerRect.top;

    if (elementTop > visibleHeight - lineHeight * 2) {
      const scrollAmount = elementTop - lineHeight;
      contentContainer.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
  },

  checkAutoScroll() {
    const contentContainer = document.querySelector('.viewer-view .content-container');
    if (!contentContainer) return;

    const containerHeight = contentContainer.clientHeight;

    const highlighted = document.querySelector('.speech-highlight');
    if (!highlighted) return;

    const elementRect = highlighted.getBoundingClientRect();
    const containerRect = contentContainer.getBoundingClientRect();
    const elementTop = elementRect.top - containerRect.top;
    const lineHeight = parseInt(getComputedStyle(highlighted).lineHeight) || 24;

    if (elementTop > containerHeight - lineHeight * 2) {
      contentContainer.scrollBy({
        top: lineHeight * 2,
        behavior: 'smooth'
      });
    }
  },

  updateSpeechButton() {
    const speechIcon = document.getElementById('speechIcon');
    if (!speechIcon) return;

    if (this.state.isSpeaking) {
      if (this.state.isPaused) {
        speechIcon.className = 'fas fa-play';
      } else {
        speechIcon.className = 'fas fa-pause';
      }
    } else {
      speechIcon.className = 'fas fa-play';
    }
  }
};

// Export to window
window.ViewerController = ViewerController;
