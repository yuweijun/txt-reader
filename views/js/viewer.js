/**
 * Viewer Script for Text Reader Application
 * Handles the text viewing functionality with chapter navigation
 */

// Auto-hide functionality variables
let db = null;
let localFileProcessor = null;
let storyId = null;

// Auto-hide functionality variables
let isHeaderHidden = false;  // Start visible
let isSidebarHidden = false; // Start visible
let isSidebarPinned = false;
let lastScrollTop = 0;
let lastScrollLeft = 0;
let hideTimeout = null;
let isScrollingInSidebar = false;

// Color Scheme Management
const themes = {
    default: 'theme-default',
    monokai: 'theme-monokai',
    dark: 'theme-dark',
    solarized: 'theme-solarized',
    dracula: 'theme-dracula',
    nord: 'theme-nord',
    gruvbox: 'theme-gruvbox',
    onedark: 'theme-onedark',
    darkgreen: 'theme-darkgreen'
};

function applyTheme(theme) {
    // Remove all theme classes
    Object.values(themes).forEach(themeClass => {
        document.body.classList.remove(themeClass);
    });

    // Apply selected theme
    if (themes[theme]) {
        document.body.classList.add(themes[theme]);
    }

    // Update dropdown button text
    const themeNames = {
        default: 'Default Dark',
        monokai: 'Monokai Pro',
        dark: 'Deep Dark',
        solarized: 'Solarized',
        dracula: 'Dracula',
        nord: 'Nord',
        gruvbox: 'Gruvbox',
        onedark: 'One Dark',
        darkgreen: 'Dark Green'
    };
    document.getElementById('themeDropdown').innerHTML = `<i class="fas fa-palette"></i> ${themeNames[theme]}`;

    // Save to localStorage
    localStorage.setItem('preferredViewerTheme', theme);
}

// Get story ID from URL hash
function getStoryIdFromUrl() {
    const hash = window.location.hash;
    if (hash.startsWith('#view/')) {
        return hash.substring(6); // Remove '#view/' prefix
    }
    return null;
}

let fileContent = '';
let chapters = [];
let currentChapter = null;
let chaptersVisible = true;
let totalPages = 1;
let filteredChapters = [];
let storySegments = [];
let currentSegmentIndex = 0;
let readingHistory = null;

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        
        // Initial load
        await initializeViewer();
        
    } catch (error) {
        document.querySelector('.text-content').textContent = 'Error initializing viewer: ' + error.message;
    }
});

async function initializeViewer() {
    // Get story ID from URL
    storyId = getStoryIdFromUrl();
    if (!storyId) {
        document.querySelector('.text-content').textContent = 'Invalid story ID';
        return;
    }

    // Initialize database and processor
    db = new TextReaderDB();
    localFileProcessor = new LocalFileProcessor();
    window.localFileProcessor = localFileProcessor;

    // Initialize database
    await db.init();
    
    // Load story data from database to get the title
    const storyData = await db.getStoryById(storyId);
    if (storyData) {
        // Display story title
        const titleElement = document.getElementById('storyTitleDisplay');
        if (titleElement) {
            titleElement.innerHTML = `<span>${escapeHtml(storyData.customTitle || storyData.extractedTitle || storyData.originalFileName.replace(/\.txt$/i, ''))}</span>`;
        }
    }
    
    // Load story segments if they exist
    if (storyData && storyData.segments) {
        storySegments = storyData.segments;
    }
    
    // Load reading history
    readingHistory = await db.getReadingHistory(storyId);
    
    // Load the TXT file content
    await loadFileContent();
    
    // Initialize chapters sidebar (always visible)
    document.getElementById('chaptersSidebar').classList.add('visible');
    
    // Add search functionality
    const searchInput = document.getElementById('chapterSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterChapters(this.value);
        });
    }
    
    // Save reading progress periodically
    setInterval(saveReadingProgress, 30000); // Save every 30 seconds
    
    // Save on page unload
    window.addEventListener('beforeunload', saveReadingProgress);

    // Load saved theme
    const savedTheme = localStorage.getItem('preferredViewerTheme') || 'default';
    applyTheme(savedTheme);

    // Add event listeners to theme options
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const theme = this.getAttribute('data-theme');
            applyTheme(theme);
        });
    });
    
    // Setup auto-hide functionality
    setupAutoHide();
    
    // Setup pin toggle button
    const togglePinBtn = document.getElementById('togglePinBtn');
    if (togglePinBtn) {
        togglePinBtn.addEventListener('click', togglePinSidebar);
    }
    
    // Load saved pin state
    const savedPinState = localStorage.getItem('sidebarPinned');
    if (savedPinState === 'true') {
        isSidebarPinned = true;
        const sidebar = document.getElementById('chaptersSidebar');
        const pinIcon = document.getElementById('pinIcon');
        if (sidebar && pinIcon) {
            sidebar.classList.add('pinned');
            pinIcon.classList.remove('fa-thumbtack');
            pinIcon.classList.add('fa-lock');
            pinIcon.parentElement.title = 'Unpin sidebar';
        }
    }
}

function handleHashChange() {
    const newStoryId = getStoryIdFromUrl();
    if (newStoryId && newStoryId !== storyId) {
        storyId = newStoryId;
        initializeViewer();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-hide functionality
function setupAutoHide() {
    const header = document.querySelector('.navigation-header');
    const sidebar = document.getElementById('chaptersSidebar');
    const contentContainer = document.querySelector('.content-container');
    
    if (!header || !sidebar || !contentContainer) return;
    
    // Add auto-hide classes
    header.classList.add('auto-hide');
    sidebar.classList.add('auto-hide');
    
    // Mouse movement detection
    let mouseMoveTimer = null;
    
    document.addEventListener('mousemove', function(e) {
        // Check if mouse is near top (within 50px)
        if (e.clientY <= 50) {
            showHeader();
            clearTimeout(hideTimeout);
        }
        // Check if mouse is near left edge (within 50px)
        else if (e.clientX <= 50 && !isSidebarPinned) {
            showSidebar();
            clearTimeout(hideTimeout);
        }
        // Auto-hide after delay when mouse moves away
        // But don't hide if user is scrolling in sidebar
        else if (!isSidebarPinned && !isScrollingInSidebar) {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                if (!isSidebarPinned && !isScrollingInSidebar) {
                    hideElements();
                }
            }, 1000);
        }
    });
    
    // Scroll detection for main content
    contentContainer.addEventListener('scroll', function() {
        const currentScrollTop = contentContainer.scrollTop;
        const currentScrollLeft = contentContainer.scrollLeft;
        
        // Show header when scrolling up
        if (currentScrollTop < lastScrollTop) {
            showHeader();
        }
        // Hide header when scrolling down
        else if (currentScrollTop > lastScrollTop && currentScrollTop > 100) {
            hideHeader();
        }
        
        lastScrollTop = currentScrollTop;
        lastScrollLeft = currentScrollLeft;
    });
    
    // Scroll detection for chapters sidebar
    const sidebarContent = document.querySelector('.chapters-sidebar-content');
    if (sidebarContent) {
        let scrollEndTimer = null;
        
        sidebarContent.addEventListener('scroll', function() {
            // User is actively scrolling in sidebar
            isScrollingInSidebar = true;
            
            // Clear any existing hide timeout
            clearTimeout(hideTimeout);
            
            // Clear previous scroll end timer
            clearTimeout(scrollEndTimer);
            
            // Set timer to detect when scrolling stops
            scrollEndTimer = setTimeout(() => {
                isScrollingInSidebar = false;
                // Only hide if not pinned and mouse is not over sidebar
                if (!isSidebarPinned) {
                    hideTimeout = setTimeout(() => {
                        if (!isSidebarPinned && !isScrollingInSidebar) {
                            hideElements();
                        }
                    }, 1000);
                }
            }, 150); // Wait 150ms after scrolling stops
        });
    }
    
    // Mouse over/out detection for sidebar area
    if (sidebar) {
        sidebar.addEventListener('mouseenter', function() {
            isScrollingInSidebar = true;
            clearTimeout(hideTimeout);
            showSidebar();
        });
        
        sidebar.addEventListener('mouseleave', function() {
            isScrollingInSidebar = false;
            if (!isSidebarPinned) {
                // Don't hide immediately, give some time for user interaction
                hideTimeout = setTimeout(() => {
                    if (!isSidebarPinned && !isScrollingInSidebar) {
                        hideElements();
                    }
                }, 1000); // 1 second delay before hiding
            }
        });
    }
    
    // Touch devices support
    document.addEventListener('touchstart', function() {
        showElements();
    });
    
    // Initially hide elements after delay
    setTimeout(() => {
        if (!isSidebarPinned) {
            hideElements();
        }
    }, 1000);
}

function showElements() {
    showHeader();
    if (!isSidebarPinned) {
        showSidebar();
    }
}

function hideElements() {
    hideHeader();
    if (!isSidebarPinned) {
        hideSidebar();
    }
}

function showHeader() {
    const header = document.querySelector('.navigation-header');
    if (header) {
        header.classList.remove('hidden-top');
        isHeaderHidden = false;
    }
}

function hideHeader() {
    const header = document.querySelector('.navigation-header');
    if (header && !isHeaderHidden) {
        header.classList.add('hidden-top');
        isHeaderHidden = true;
    }
}

function showSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    if (sidebar && !isSidebarPinned) {
        sidebar.classList.remove('hidden-left');
        isSidebarHidden = false;
    }
}

function hideSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    if (sidebar && !isSidebarPinned && !isSidebarHidden) {
        sidebar.classList.add('hidden-left');
        isSidebarHidden = true;
    }
}

function togglePinSidebar() {
    const sidebar = document.getElementById('chaptersSidebar');
    const pinIcon = document.getElementById('pinIcon');
    
    if (!sidebar || !pinIcon) return;
    
    isSidebarPinned = !isSidebarPinned;
    
    if (isSidebarPinned) {
        sidebar.classList.add('pinned');
        pinIcon.classList.remove('fa-thumbtack');
        pinIcon.classList.add('fa-lock');
        pinIcon.parentElement.title = 'Unpin sidebar';
        showSidebar(); // Ensure sidebar is visible when pinned
    } else {
        sidebar.classList.remove('pinned');
        pinIcon.classList.remove('fa-lock');
        pinIcon.classList.add('fa-thumbtack');
        pinIcon.parentElement.title = 'Pin sidebar';
        // Sidebar will auto-hide based on mouse movement
    }
    
    // Save pin state to localStorage
    localStorage.setItem('sidebarPinned', isSidebarPinned.toString());
}

async function loadFileContent() {
    try {
        // Get story content from local database
        fileContent = await window.localFileProcessor.getStoryContent(storyId);

        // Parse chapters from content
        parseChapters();

        // Display current page content
        displayCurrentPage();

        // Set initial current chapter and position
        if (readingHistory) {
            // Restore from reading history
            restoreReadingPosition(readingHistory);
        } else {
            // Set initial current chapter
            currentChapter = getCurrentChapterFromPage(0);
            setTimeout(highlightCurrentChapter, 100);
        }

    } catch (error) {
        document.querySelector('.text-content').textContent = 'Error loading file content: ' + error.message;
    }
}

function restoreReadingPosition(history) {
    console.log('Restoring reading position from history:', history);
    
    // Scroll to last position
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer && history.lastScrollPosition) {
        setTimeout(() => {
            contentContainer.scrollTo({
                top: history.lastScrollPosition,
                behavior: 'smooth'
            });
        }, 500);
    }
    
    // Highlight last chapter if available
    if (history.lastChapterTitle && chapters.length > 0) {
        const matchingChapter = chapters.find(ch => 
            ch.title.includes(history.lastChapterTitle) || 
            history.lastChapterTitle.includes(ch.title)
        );
        
        if (matchingChapter) {
            currentChapter = {
                id: matchingChapter.id,
                title: matchingChapter.title,
                pageNumber: matchingChapter.pageNumber
            };
            setTimeout(highlightCurrentChapter, 1000);
        }
    }
}

async function saveReadingProgress() {
    try {
        const contentContainer = document.querySelector('.content-container');
        if (!contentContainer) return;
        
        // Get current scroll position
        const scrollPosition = contentContainer.scrollTop;
        
        // Get current chapter
        let currentChapterTitle = '';
        if (currentChapter) {
            currentChapterTitle = currentChapter.title;
        } else {
            // Try to determine current chapter from scroll position
            const currentChapterObj = getCurrentChapterFromScrollPosition(scrollPosition);
            if (currentChapterObj) {
                currentChapterTitle = currentChapterObj.title;
            }
        }
        
        // Save to database
        const historyData = {
            storyId: storyId,
            lastChapterTitle: currentChapterTitle,
            lastScrollPosition: scrollPosition
        };
        
        await db.saveReadingHistory(historyData);
        
    } catch (error) {
        // Silently handle saving errors
    }
}

function getCurrentChapterFromScrollPosition(scrollPosition) {
    if (!chapters || chapters.length === 0) return null;
    
    const textContent = document.getElementById('textContent');
    if (!textContent) return null;
    
    // Estimate character position from scroll position
    const estimatedCharPos = Math.floor((scrollPosition / textContent.scrollHeight) * fileContent.length);
    
    // Find chapter containing this position
    for (let i = chapters.length - 1; i >= 0; i--) {
        const chapter = chapters[i];
        if (estimatedCharPos >= chapter.charPosition) {
            return chapter;
        }
    }
    
    return chapters[0];
}

function parseChapters() {
    chapters = [];
    const lines = fileContent.split('\n');
    let lineNumber = 0;
    let charPosition = 0;

    // Common chapter patterns
    const chapterPatterns = [
        /^第?\s*([一二三四五六七八九十百千万\d]+)\s*[章节卷部篇回]/, // Chinese chapters
        /^Chapter\s+(\d+)/i, // English chapters
        /^Section\s+(\d+)/i, // Sections
        /^[IVXLCDM]+\.\s/, // Roman numerals
        /^\d+\.\d+/ // Decimal numbering
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            // Check for chapter patterns
            for (const pattern of chapterPatterns) {
                if (pattern.test(line)) {
                    chapters.push({
                        id: `chapter_${chapters.length}`,
                        title: line,
                        pageNumber: lineNumber,
                        charPosition: charPosition,
                        charLength: 0
                    });
                    break;
                }
            }
        }
        charPosition += lines[i].length + 1;
        lineNumber++;
    }

    // Calculate chapter lengths
    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const nextChapter = chapters[i + 1];
        if (nextChapter) {
            chapter.charLength = nextChapter.charPosition - chapter.charPosition;
        } else {
            chapter.charLength = fileContent.length - chapter.charPosition;
        }
    }

    // If no chapters found, create one for the whole document
    if (chapters.length === 0) {
        chapters.push({
            id: 'full_text',
            title: '全文',
            pageNumber: 0,
            charPosition: 0,
            charLength: fileContent.length
        });
    }

    // Update chapters list in sidebar
    updateChaptersList();
}

function updateChaptersList() {
    const chapterList = document.getElementById('chapterList');
    if (!chapterList) return;

    chapterList.innerHTML = '';

    // Use filtered chapters if search is active, otherwise use all chapters
    const chaptersToShow = filteredChapters.length > 0 ? filteredChapters : chapters;

    chaptersToShow.forEach((chapter, index) => {
        const li = document.createElement('li');
        li.className = 'chapter-item';
        li.dataset.page = chapter.pageNumber;
        li.dataset.index = chapter.originalIndex !== undefined ? chapter.originalIndex : index;
        li.textContent = chapter.title;
        li.addEventListener('click', function() {
            const chapterIndex = parseInt(this.dataset.index);
            scrollToChapter(chapterIndex);
        });
        chapterList.appendChild(li);
    });
}

function filterChapters(searchTerm) {
    if (!searchTerm.trim()) {
        filteredChapters = [];
        updateChaptersList();
        return;
    }

    const term = searchTerm.toLowerCase().trim();
    filteredChapters = chapters.filter((chapter, index) => {
        return chapter.title.toLowerCase().includes(term);
    }).map((chapter, index) => {
        return {
            ...chapter,
            originalIndex: chapters.indexOf(chapter)
        };
    });

    updateChaptersList();
}

function displayCurrentPage() {
    const textContent = document.getElementById('textContent');

    // Display entire content instead of paginated content
    if (textContent) {
        textContent.textContent = fileContent;
        textContent.style.fontSize = '18px';
    }

    // Set totalPages to 1 since we're showing entire content
    totalPages = 1;
}

function scrollToChapter(chapterIndex) {
    if (!chapters || chapterIndex >= chapters.length) return;

    const chapter = chapters[chapterIndex];
    const textContent = document.getElementById('textContent');
    const contentContainer = document.querySelector('.content-container');

    if (!textContent || !contentContainer) return;

    // Find the chapter title position in the text content
    const chapterTitle = chapter.title;
    const textContentStr = textContent.textContent;

    // Find the position of the chapter title in the text
    const titleIndex = findChapterTitlePosition(textContentStr, chapterTitle);

    if (titleIndex !== -1) {
        // Calculate the approximate scroll position
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            height: auto;
            width: ${textContent.offsetWidth}px;
            font-size: ${getComputedStyle(textContent).fontSize};
            font-family: ${getComputedStyle(textContent).fontFamily};
            line-height: ${getComputedStyle(textContent).lineHeight};
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        tempDiv.textContent = textContentStr.substring(0, titleIndex);
        document.body.appendChild(tempDiv);

        const scrollPosition = tempDiv.offsetHeight;
        document.body.removeChild(tempDiv);

        // Scroll to the chapter position with smooth animation
        contentContainer.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });

        // Update current page and chapter tracking
        currentChapter = chapter;
        highlightCurrentChapter();
    }
}

function findChapterTitlePosition(textContent, chapterTitle) {
    // Normalize the chapter title for better matching
    const normalizedTitle = chapterTitle.trim();

    // Try exact match first
    let position = textContent.indexOf(normalizedTitle);

    if (position === -1) {
        // Try fuzzy matching
        const simplifiedTitle = normalizedTitle
            .replace(/^[第章卷部篇回\s]+/, '')
            .replace(/^[Chapter\s]+/i, '')
            .trim();

        if (simplifiedTitle.length > 0) {
            position = textContent.indexOf(simplifiedTitle);

            if (position === -1) {
                const chapterNumberMatch = normalizedTitle.match(/[\d零一二三四五六七八九十百千万]+/);
                if (chapterNumberMatch) {
                    const chapterNumber = chapterNumberMatch[0];
                    const numberPatterns = [
                        `第${chapterNumber}[章节卷部篇回]`,
                        `Chapter\\s*${chapterNumber}`,
                        `${chapterNumber}\\s*[章节卷部篇回]`
                    ];

                    for (const pattern of numberPatterns) {
                        const regex = new RegExp(pattern, 'i');
                        const match = textContent.match(regex);
                        if (match) {
                            position = match.index;
                            break;
                        }
                    }
                }
            }
        }
    }

    return position;
}

function getCurrentChapterFromPage(page) {
    if (!chapters || chapters.length === 0) return null;

    for (let i = chapters.length - 1; i >= 0; i--) {
        const chapter = chapters[i];
        if (page >= chapter.pageNumber) {
            return {
                id: chapter.id,
                title: chapter.title,
                pageNumber: chapter.pageNumber
            };
        }
    }
    return chapters[0];
}

function highlightCurrentChapter() {
    // Remove all active/current classes
    document.querySelectorAll('.chapter-item').forEach(item => {
        item.classList.remove('active', 'current');
    });

    // Find and highlight current chapter
    const currentChapterElement = document.querySelector(`.chapter-item[data-page="${0}"]`);
    if (currentChapterElement) {
        currentChapterElement.classList.add('current');
        currentChapterElement.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
}

function navigateToPreviousChapter() {
    if (!chapters || chapters.length === 0) return;

    const contentContainer = document.querySelector('.content-container');
    if (!contentContainer) return;

    const currentScrollTop = contentContainer.scrollTop;

    let currentChapterIndex = 0;
    for (let i = chapters.length - 1; i >= 0; i--) {
        const position = getChapterScrollPosition(i);
        if (position <= currentScrollTop + 100) {
            currentChapterIndex = i;
            break;
        }
    }

    if (currentChapterIndex > 0) {
        scrollToChapter(currentChapterIndex - 1);
    }
}

function navigateToNextChapter() {
    if (!chapters || chapters.length === 0) return;

    const contentContainer = document.querySelector('.content-container');
    if (!contentContainer) return;

    const currentScrollTop = contentContainer.scrollTop;

    let currentChapterIndex = 0;
    for (let i = chapters.length - 1; i >= 0; i--) {
        const position = getChapterScrollPosition(i);
        if (position <= currentScrollTop + 100) {
            currentChapterIndex = i;
            break;
        }
    }

    if (currentChapterIndex < chapters.length - 1) {
        scrollToChapter(currentChapterIndex + 1);
    }
}

function getChapterScrollPosition(chapterIndex) {
    if (!chapters || chapterIndex >= chapters.length) return 0;

    const chapter = chapters[chapterIndex];
    const textContent = document.getElementById('textContent');
    const contentContainer = document.querySelector('.content-container');

    if (!textContent || !contentContainer) return 0;

    const chapterTitle = chapter.title;
    const textContentStr = textContent.textContent;

    const titleIndex = findChapterTitlePosition(textContentStr, chapterTitle);

    if (titleIndex !== -1) {
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            height: auto;
            width: ${textContent.offsetWidth}px;
            font-size: ${getComputedStyle(textContent).fontSize};
            font-family: ${getComputedStyle(textContent).fontFamily};
            line-height: ${getComputedStyle(textContent).lineHeight};
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        tempDiv.textContent = textContentStr.substring(0, titleIndex);
        document.body.appendChild(tempDiv);

        const scrollPosition = tempDiv.offsetHeight;
        document.body.removeChild(tempDiv);

        return scrollPosition;
    }

    return 0;
}

function navigateWithinChapter(direction) {
    const contentContainer = document.querySelector('.content-container');
    const textContent = document.getElementById('textContent');

    if (!contentContainer || !textContent) return;

    const containerHeight = contentContainer.clientHeight;
    const contentHeight = textContent.clientHeight;
    const scrollTop = contentContainer.scrollTop;
    const scrollAmount = containerHeight * 0.8;

    if (direction > 0) {
        if (scrollTop + containerHeight >= contentHeight - 10) {
            console.log('Reached bottom of content');
        } else {
            contentContainer.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            });
        }
    } else if (direction < 0) {
        if (scrollTop <= 10) {
            console.log('Reached top of content');
        } else {
            contentContainer.scrollBy({
                top: -scrollAmount,
                behavior: 'smooth'
            });
        }
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    // Arrow key navigation
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            navigateToPreviousChapter();
            break;
        case 'ArrowRight':
            e.preventDefault();
            navigateToNextChapter();
            break;
        case 'ArrowUp':
            e.preventDefault();
            navigateWithinChapter(-1);
            break;
        case 'ArrowDown':
        case ' ':
            e.preventDefault();
            navigateWithinChapter(1);
            break;
    }
    
    // Number key navigation (1-9)
    if (e.key >= '1' && e.key <= '9') {
        const chapterIndex = parseInt(e.key) - 1;
        if (chapterIndex < chapters.length) {
            e.preventDefault();
            scrollToChapter(chapterIndex);
        }
    }
});