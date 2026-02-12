/**
 * Library Controller for Text Reader SPA
 * Handles the book library view functionality
 */

const LibraryController = {
  // Application state
  state: {
    currentPage: 1,
    itemsPerPage: 30,
    totalPages: 1,
    allBooks: [],
    expandedBooks: new Set(),
    processor: null,
    db: null,
    isProcessing: false,
    initialized: false,
    eventListenersAttached: false
  },

  /**
   * Initialize the library view
   */
  async init() {
    try {
      // Apply theme
      this.applyTheme();

      // Initialize database and processor if not already done
      if (!this.state.db) {
        this.state.db = new TextReaderDB();
        await this.state.db.init();
      }
      if (!this.state.processor) {
        this.state.processor = new LocalFileProcessor();
      }

      // Setup event listeners (only once)
      if (!this.state.eventListenersAttached) {
        this.setupEventListeners();
        this.state.eventListenersAttached = true;
      }

      // Load initial data
      await this.loadBooks();

      this.state.initialized = true;
    } catch (error) {
      console.error('Failed to initialize library:', error);
      this.showError('Failed to initialize application: ' + error.message);
    }
  },

  /**
   * Cleanup when leaving the view
   */
  destroy() {
    // Hide any loading overlays
    this.hideLoading();
  },

  applyTheme() {
    const savedTheme = localStorage.getItem('preferredViewerTheme') || 'default';
    if (window.themes && window.themes[savedTheme]) {
      // Remove all theme classes first
      Object.values(window.themes).forEach(themeClass => {
        document.body.classList.remove(themeClass);
      });
      document.body.classList.add(window.themes[savedTheme]);
    }
  },

  setupEventListeners() {
    // Text content input
    const textContent = document.getElementById('textContent');
    const processTextBtn = document.getElementById('processTextBtn');

    if (textContent && processTextBtn) {
      textContent.addEventListener('input', function() {
        processTextBtn.disabled = this.value.trim().length === 0;
      });
    }

    // File input
    const fileInput = document.getElementById('fileInput');
    const processFileBtn = document.getElementById('processFileBtn');

    if (fileInput && processFileBtn) {
      fileInput.addEventListener('change', function() {
        processFileBtn.disabled = !this.files || this.files.length === 0;
      });
    }

    // Process buttons
    if (processTextBtn) {
      processTextBtn.addEventListener('click', () => this.processTextContent());
    }
    if (processFileBtn) {
      processFileBtn.addEventListener('click', () => this.processSelectedFile());
    }

    // Navigation buttons
    const refreshBtn = document.getElementById('refreshBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadBooks());
    }

    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.state.currentPage > 1) {
          this.state.currentPage--;
          this.displayBooks();
          this.updatePagination();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (this.state.currentPage < this.state.totalPages) {
          this.state.currentPage++;
          this.displayBooks();
          this.updatePagination();
        }
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', async () => {
        const confirmed = await window.showConfirm({
          title: 'Delete All Books',
          message: 'Are you sure you want to delete all books? This cannot be undone.',
          confirmText: 'Delete All',
          cancelText: 'Cancel',
          destructive: true
        });
        
        if (confirmed) {
          try {
            await this.state.db.clearAllData();
            await this.loadBooks();
            this.showSuccess('All books deleted successfully');
          } catch (error) {
            this.showError('Failed to clear data: ' + error.message);
          }
        }
      });
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', window.debounce(() => {
        this.state.currentPage = 1;
        this.displayBooks();
        this.updatePagination();
      }, 300));
    }
  },

  async processTextContent() {
    const textContent = document.getElementById('textContent');
    const processTextBtn = document.getElementById('processTextBtn');

    if (!textContent || !textContent.value.trim()) {
      this.showError('Please enter some text content');
      return;
    }

    this.state.isProcessing = true;
    if (processTextBtn) processTextBtn.disabled = true;

    try {
      this.showLoading('Processing text content...');

      const result = await this.state.processor.processTextContent(textContent.value);

      // Clear input
      textContent.value = '';
      if (processTextBtn) processTextBtn.disabled = true;

      // Reload books
      await this.loadBooks();

      this.hideLoading();
      this.showSuccess('Text content processed successfully!');

      // Navigate to view using SPA router
      window.router.navigate(`/view/${result.storyIds[0]}`);

    } catch (error) {
      this.hideLoading();
      this.showError('Failed to process text: ' + error.message);
      if (processTextBtn) processTextBtn.disabled = false;
    } finally {
      this.state.isProcessing = false;
    }
  },

  async processSelectedFile() {
    const fileInput = document.getElementById('fileInput');
    const processFileBtn = document.getElementById('processFileBtn');

    if (!fileInput.files || fileInput.files.length === 0) {
      this.showError('Please select a file');
      return;
    }

    const file = fileInput.files[0];

    // Validate file
    if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
      this.showError('Only text files (.txt) are allowed!');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      this.showError('File size exceeds 100MB limit!');
      return;
    }

    this.state.isProcessing = true;
    if (processFileBtn) processFileBtn.disabled = true;

    try {
      this.showLoading(`Processing file: ${file.name}...`);

      // Read file content with automatic encoding detection
      const fileContent = await this.state.processor.readFileAsText(file);

      // Validate UTF-8 encoding
      if (!LocalFileProcessor.isUtf8Encoded(fileContent)) {
        this.hideLoading();
        this.showError('上传的文本文件编码必须为UTF-8格式。请将文件转换为UTF-8编码后重新上传。');
        if (processFileBtn) processFileBtn.disabled = false;
        return;
      }

      // Detect chapters to decide if splitting is needed
      const chapterBoundaries = this.state.processor.detectChapters(fileContent);
      let result;

      if (chapterBoundaries.length > 50) {
        // Use splitting functionality for files with more than 50 chapters
        result = await this.state.processor.processAndSplitFile(file);
        this.hideLoading();
        this.showSuccess(`File "${file.name}" split into ${result.storyIds.length} parts successfully!`);
      } else {
        // Process normally
        result = await this.state.processor.processFile(file);
        this.hideLoading();
        this.showSuccess(`File "${file.name}" processed successfully!`);
      }

      // Clear input
      fileInput.value = '';

      // Reload books
      await this.loadBooks();

      // Navigate to first story using SPA router
      window.router.navigate(`/view/${result.storyIds[0]}`);

    } catch (error) {
      this.hideLoading();
      this.showError('Failed to process file: ' + error.message);
      if (processFileBtn) processFileBtn.disabled = false;
    } finally {
      this.state.isProcessing = false;
    }
  },

  async loadBooks() {
    try {
      this.showLoading('Loading books...');

      // Get all books with stories in a single batch query
      const books = await this.state.db.getAllBooksWithStories();

      this.state.allBooks = books;
      this.state.totalPages = Math.ceil(books.length / this.state.itemsPerPage);

      // Automatically expand the first book if there are books
      if (books.length > 0 && !this.state.expandedBooks.has(books[0].id)) {
        this.state.expandedBooks.add(books[0].id);
      }

      // Reset to first page if current page is invalid
      if (this.state.currentPage > this.state.totalPages) {
        this.state.currentPage = 1;
      }

      this.displayBooks();
      this.updatePagination();
      this.hideLoading();

    } catch (error) {
      this.hideLoading();
      this.showError('Failed to load books: ' + error.message);
    }
  },

  displayBooks() {
    const booksList = document.getElementById('storiesList');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');

    // Hide loading and empty states
    if (loadingState) loadingState.style.display = 'none';

    if (this.state.allBooks.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (booksList) booksList.style.display = 'none';
      const paginationControls = document.getElementById('paginationControls');
      if (paginationControls) paginationControls.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (booksList) booksList.style.display = 'block';

    // Filter books based on search
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredBooks = this.state.allBooks;
    if (searchTerm) {
      filteredBooks = this.state.allBooks.filter(book =>
        book.bookName.toLowerCase().includes(searchTerm) ||
        book.stories.some(story =>
          story.extractedTitle.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Calculate pagination
    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const endIndex = Math.min(startIndex + this.state.itemsPerPage, filteredBooks.length);
    const pageBooks = filteredBooks.slice(startIndex, endIndex);

    // Generate HTML for books
    let html = '';
    pageBooks.forEach(book => {
      const isExpanded = this.state.expandedBooks.has(book.id);
      const expandIcon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
      const storiesDisplay = isExpanded ? 'block' : 'none';

      html += `
        <div class="book-item" data-book-id="${book.id}">
          <div class="book-header d-flex justify-content-between align-items-center">
            <div class="flex-grow-1" onclick="LibraryController.toggleBook('${book.id}')" style="cursor: pointer;">
              <h5 class="mb-1">
                <i class="fas ${expandIcon} me-2 text-muted"></i>
                <i class="fas fa-book text-primary me-2"></i>
                ${window.escapeHtml(book.bookName)}
              </h5>
            </div>
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-link text-danger delete-book-btn" data-book-id="${book.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="book-stories ms-4 mt-2" style="display: ${storiesDisplay}">
      `;

      // Add stories under book
      book.stories.forEach(story => {
        const fileSize = window.formatFileSize(story.fileSize);
        const storyTitle = window.escapeHtml(story.extractedTitle || story.originalFileName.replace(/\.txt$/i, ''));

        html += `
          <div class="story-item d-flex justify-content-between align-items-center py-2 border-bottom">
            <div class="d-flex align-items-center">
              <a href="#/view/${story.id}" class="text-decoration-none">
                <i class="fas fa-file-alt text-muted me-2"></i>
                ${storyTitle}
              </a>
            </div>
            <div class="text-muted small">
              ${fileSize}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    if (booksList) booksList.innerHTML = html;

    // Attach event listeners to delete buttons
    this.attachDeleteListeners();
  },

  toggleBook(bookId) {
    if (this.state.expandedBooks.has(bookId)) {
      this.state.expandedBooks.delete(bookId);
    } else {
      this.state.expandedBooks.add(bookId);
    }
    this.displayBooks();
  },

  attachDeleteListeners() {
    // Use event delegation
    const booksList = document.getElementById('storiesList');
    if (!booksList || booksList.dataset.delegated) return;
    
    booksList.dataset.delegated = 'true';
    booksList.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.delete-book-btn');
      if (!deleteBtn) return;
      
      e.stopPropagation();
      const bookId = deleteBtn.dataset.bookId;
      const book = this.state.allBooks.find(b => b.id === bookId);

      const confirmed = await window.showConfirm({
        title: 'Delete Book',
        message: `Are you sure you want to delete "${book?.bookName || 'this book'}" and all its parts?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        destructive: true
      });

      if (confirmed) {
        try {
          await this.state.processor.deleteBook(bookId);
          this.state.expandedBooks.delete(bookId);
          await this.loadBooks();
          this.showSuccess('Book deleted successfully');
        } catch (error) {
          this.showError('Failed to delete book: ' + error.message);
        }
      }
    });
  },

  updatePagination() {
    const currentPageEl = document.getElementById('currentPage');
    const totalPagesEl = document.getElementById('totalPages');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const paginationControls = document.getElementById('paginationControls');

    if (this.state.totalPages <= 1) {
      if (paginationControls) paginationControls.style.display = 'none';
      return;
    }

    if (paginationControls) paginationControls.style.display = 'flex';
    if (currentPageEl) currentPageEl.textContent = this.state.currentPage;
    if (totalPagesEl) totalPagesEl.textContent = this.state.totalPages;

    if (prevPageBtn) prevPageBtn.disabled = this.state.currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = this.state.currentPage >= this.state.totalPages;
  },

  showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    if (loadingText) loadingText.textContent = message;
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
  },

  hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  },

  showError(message) {
    if (window.iosModal) {
      window.iosModal.error(message);
    } else {
      window.showAlert({
        title: 'Error',
        message: message
      });
    }
  },

  showSuccess(message) {
    if (window.iosModal) {
      window.iosModal.success(message);
    } else {
      window.showAlert({
        title: 'Success',
        message: message
      });
    }
  }
};

// Export to window
window.LibraryController = LibraryController;
