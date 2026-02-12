# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Pure frontend text reader web application. All processing occurs in the browser with zero server-side file storage. Data is persisted in IndexedDB.

## Build and Run Commands

```bash
# Start development server (serves from reader/ directory on port 8000)
./start.sh

# Alternative: run directly
cd reader && python -m http.server 8000

# Custom port
cd reader && python -m http.server 8001

# Check if port is in use
lsof -i :8000
```

Access the app at `http://localhost:8000`. No build step required - static file server only.

## Code Style

- 100 char line length, 2-space indentation
- `const`/`let` only (no `var`), arrow functions for callbacks
- Async/await over `.then()` chains
- Classes exposed via `window.ClassName` pattern (no module bundler)

**DRY**: Extract common CSS into reusable classes, use CSS variables for theme colors, refactor repeated code into shared functions.

## Architecture

### Data Flow

1. User pastes text or selects file → `LocalFileProcessor` (FileReader API)
2. Processor creates Book + Story objects → `TextReaderDB` stores in IndexedDB
3. Viewer loads story by ID from IndexedDB → renders with chapter navigation
4. Reading position auto-saved to `histories` store

### IndexedDB Schema (version 2)

- **books**: `{ id, bookName, uploadTime, originalFileName }`
- **stories**: `{ id, bookId, fileName, content, processedContent, chapters[], extractedTitle, isSplitFile, splitIndex, totalChunks }`
- **histories**: `{ id, storyId, lastChapterTitle, lastScrollPosition, lastReadTime, totalTimeRead }`

### Core JavaScript Classes

- `TextReaderDB` (`reader/js/database.js`) - IndexedDB wrapper with CRUD for books/stories/histories
- `LocalFileProcessor` (`reader/js/fileProcessor.js`) - File reading, chapter detection, content processing
- `init.js` (`reader/js/init.js`) - App initialization, event binding, pagination for index page
- `viewer.js` (`reader/js/viewer.js`) - Reader UI, theme switching, keyboard navigation

### Chapter Detection

Patterns in `LocalFileProcessor.CHAPTER_PATTERNS`:
- Chinese: `第N章`, `第N节`, etc.
- English: `Chapter N`, `Section N`, `PART N`
- Numbering: Roman numerals (`I.`, `II.`), decimal (`1.1`, `1.2`)
- Special: `PROLOGUE`, `EPILOGUE`

Files with >50 chapters are auto-split into multiple stories under one book.

### URL Routing

- Main page: `http://localhost:8000/` → `index.html`
- Viewer: `http://localhost:8000/viewer.html#view/{storyId}`

### Themes

14 color schemes in `reader/css/colorscheme/`. Applied via `theme-{name}` class on body. Saved to `localStorage.preferredViewerTheme`.

## Git Commit Guidelines

Do not add AI attribution to commit messages (no `co-authored-by: AI Assistant` or similar).
