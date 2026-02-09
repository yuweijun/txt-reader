# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

Pure frontend text reader web application that provides rich text viewing capabilities with chapter parsing, local document management, and customizable reading experience. All processing occurs in the browser with zero server-side file storage.

## Code Style Guidelines

- **JavaScript code line wrapping**: Use 100 characters maximum line length
- **Indentation**: 2 spaces for JavaScript code
- **Naming conventions**: Follow standard JavaScript camelCase for variables/functions, PascalCase for constructors/classes
- **Variable declarations**: Use `const` for immutable values, `let` for mutable values, avoid `var`
- **Function style**: Use arrow functions for callbacks and concise functions
- **Async/Await**: Prefer async/await over callbacks and .then() chains
- **Module imports**: Use ES6 import/export syntax when possible
- **Error handling**: Use try/catch blocks for async operations
- **Logging**: Minimize console output in production code

### Git Commit Guidelines

**Do not add AI attribution** to commit messages such as:
- `co-authored-by: AI Assistant`
- `Generated with [AI Tool Name]`
- `AI-assisted commit`
- Any other AI-generated attribution metadata

Keep commit messages focused on describing the actual changes made to the codebase.

### Package Management

**Always remove unused dependencies** after making changes to the project. This includes:
- Dependencies that were used previously but are no longer needed
- Dev dependencies that aren't actually used in development

Run `npm audit` regularly to check for security vulnerabilities.

## Build and Run Commands

### Installing Dependencies
```bash
npm install
```

### Development
```bash
# Start development server with nodemon
npm run dev

# Run with custom port
PORT=3001 npm run dev
```

### Production
```bash
# Start production server
npm start
```

## Architecture

### Core Philosophy

**Pure Frontend Approach**: 
- Zero server-side file processing or storage
- All file operations handled by browser APIs
- Data persisted in browser's IndexedDB
- Server only serves static files and routes

### Core Components

**Main Application** (`server.js`)
- Minimal Express.js server for static file serving
- No file upload processing
- Simple routing for viewer pages
- No data persistence layer

**Local File Processing** (`views/public/js/fileProcessor.js`)
- Handles FileReader API operations
- Processes text content from files or paste operations
- Manages story object creation and storage
- No server communication for file handling

**Database Layer** (`views/public/js/database.js`)
- IndexedDB wrapper for local storage
- Manages stories and reading history collections
- Provides CRUD operations for local data
- Handles data synchronization and querying

**Document Management** (`views/index.ejs`)
- Primary interface for adding and managing documents
- Supports both file upload and text pasting
- Displays paginated list of local documents
- Provides search and filtering capabilities

**Reading Interface** (`views/viewer.ejs`)
- Advanced text viewing with chapter navigation
- Real-time theme switching and customization
- Automatic position saving and restoration
- Keyboard navigation and search functionality

### Data Models

**Story Object** (Stored in IndexedDB)
```javascript
{
    id: "unique_identifier",
    fileName: "display_filename.txt",
    originalFileName: "original_filename.txt", 
    fileSize: 123456,
    uploadTime: "ISO_timestamp",
    content: "complete_file_content..."
}
```

**History Object** (Stored in IndexedDB)
```javascript
{
    id: "history_entry_id",
    storyId: "associated_story_id",
    lastChapterTitle: "chapter_title",
    lastScrollPosition: 12345,
    lastReadTime: "ISO_timestamp",
    totalTimeRead: 3600
}
```

### Frontend Components

**Database Service** (`database.js`)
- IndexedDB initialization and schema management
- Story and history CRUD operations
- Query optimization and indexing
- Error handling and data integrity

**File Processor** (`fileProcessor.js`)
- FileReader API integration
- Text content processing and validation
- Story object creation and management
- Content retrieval and manipulation

**Application Initialization** (`init.js`)
- Database initialization on startup
- Global utility functions
- Error boundary handling
- Performance monitoring setup

### Data Flow

1. User adds content via paste or file selection
2. Browser FileReader API processes the content
3. FileProcessor creates story object with metadata
4. Database service stores story in IndexedDB
5. User navigates to viewer via document list
6. Viewer loads content directly from local database
7. Reading positions automatically saved during use
8. History restoration on subsequent visits

### Chapter Detection Patterns

Supports multiple chapter formats:
- `Chapter 1`, `Chapter 2` (English)
- `第1章`, `第2章` (Chinese)
- `Section 1`, `Section 2` (Technical)
- `PART I`, `PART II` (Roman numerals)
- `1.1`, `1.2` (Decimal numbering)
- Uppercase standalone titles

## Project Structure

```
txt-reader/
├── server.js                         # Minimal Express server
├── package.json                      # Project dependencies
├── src/
│   └── controllers/
│       └── viewController.js         # Viewer route handling
├── views/
│   ├── index.ejs                     # Document management interface
│   ├── viewer.ejs                    # Reading interface
│   └── public/
│       ├── css/                      # Stylesheets
│       └── js/                       # Client-side JavaScript
│           ├── database.js           # IndexedDB operations
│           ├── fileProcessor.js      # Local file handling
│           └── init.js               # Application startup
└── README.md                         # Project documentation
```

## Dependencies

- **Express.js**: Minimal web framework for static file serving
- **EJS**: Embedded JavaScript templating
- **Bootstrap 5**: CSS framework for responsive design
- **Font Awesome**: Icon library

## Key Features Summary

✅ **Pure Frontend**: Zero server-side file storage
✅ **Local Processing**: All operations in browser
✅ **Text Pasting**: Direct content input without file upload
✅ **IndexedDB Storage**: Persistent local data storage
✅ **Chapter Detection**: Automatic parsing of various chapter formats
✅ **Real-time Content**: Full text display with smooth scrolling
✅ **Multiple Themes**: 9 professional dark themes
✅ **Font Customization**: Adjustable size and styling
✅ **Keyboard Navigation**: Comprehensive shortcut system
✅ **Reading History**: Automatic position saving and restoration
✅ **Pagination**: 30 items per page document listing
✅ **Responsive Design**: Works on desktop, tablet, and mobile

## Development Guidelines

- Prioritize browser compatibility and performance
- Minimize external dependencies
- Follow progressive enhancement principles
- Implement proper error handling for browser APIs
- Test across different browser environments
- Optimize for large text file handling
- Ensure mobile responsiveness
- Monitor IndexedDB storage quotas
- Handle browser data clearing scenarios
- Maintain clean separation of concerns