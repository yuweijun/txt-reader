# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

Advanced text reader web application built with Node.js and Express.js that provides rich text viewing capabilities with chapter parsing, file management, and customizable reading experience.

## Code Style Guidelines

- **JavaScript code line wrapping**: Use 100 characters maximum line length
- **Indentation**: 2 spaces for JavaScript code
- **Naming conventions**: Follow standard JavaScript camelCase for variables/functions, PascalCase for constructors/classes
- **Variable declarations**: Use `const` for immutable values, `let` for mutable values, avoid `var`
- **Function style**: Use arrow functions for callbacks and concise functions
- **Async/Await**: Prefer async/await over callbacks and .then() chains
- **Module imports**: Use ES6 import/export syntax when possible, CommonJS require/module.exports for compatibility
- **Error handling**: Use try/catch blocks for async operations
- **Logging**: Use console.log/warn/error appropriately for debugging and monitoring

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
- Outdated packages that should be updated

Run `npm audit` and `npm outdated` regularly to check for security vulnerabilities and outdated packages.

### Test Method Naming Convention

Follow descriptive naming for test functions using the pattern:
`should_[expected_behavior]_when_[conditions]`

Examples:
- `should_load_file_content_when_valid_path_provided`
- `should_reject_upload_when_file_size_exceeds_limit`
- `should_parse_chapters_correctly_from_text_content`

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

# Build for production (if applicable)
npm run build
```

### Testing
```bash
# Run tests (when test suite is implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## Architecture

### Core Components

**Main Application** (`server.js`)
- Express.js application entry point
- Configures middleware and routes
- Sets up template engine and static file serving
- Initializes data directories

**File Upload System**
- Handles multipart file uploads with 50MB size limit
- Stores files in `views/public/uploaded/` directory
- Validates file types and sizes using multer
- Generates unique file IDs with uuid

**Text Processing Pipeline**
- Parses text files for chapter detection and structure
- Client-side chapter parsing using JavaScript regex
- Real-time content display without pagination
- Dynamic chapter navigation and scrolling

**Chapter Management**
- Automatic chapter detection using regex patterns
- Multiple format support (English, Chinese, technical documents)
- JSON persistence for chapter metadata
- Real-time chapter navigation with smooth scrolling

**Theme Engine**
- Multiple color schemes (Monokai, Dark, Light, Default)
- Real-time theme switching without page reload
- Font size customization
- Responsive design for all device sizes

### Data Models

**Story Object**
- Represents uploaded text files
- Contains metadata: id, filename, originalFileName, fileSize, uploadDateTime, keywords
- Stored in `data/stories.json`

**Chapter Object**
- Chapter title and position data
- Character position mapping
- Support for hierarchical structure

### Services Layer

**Upload Service** (`src/controllers/uploadController.js`)
- Handles file storage and metadata creation
- Manages uploaded directory structure
- Validates file types and sizes

**View Service** (`src/controllers/viewController.js`)
- Serves viewer pages with story metadata
- Prepares data for client-side rendering

**Delete Service** (`src/controllers/deleteController.js`)
- Handles file deletion and cleanup
- Removes associated metadata

### Data Storage

**JSON Files** (`data/`)
- `stories.json`: Story metadata persistence
- `chapters.json`: Chapter structure data (future expansion)
- Simple file-based storage instead of database

### Controllers

**Upload Controller** (`src/controllers/uploadController.js`)
- File upload endpoint with validation
- Story metadata creation
- Redirects to viewer after successful upload

**View Controller** (`src/controllers/viewController.js`)
- Serves viewer pages with story data
- Prepares template variables

**Delete Controller** (`src/controllers/deleteController.js`)
- File deletion endpoint
- Metadata cleanup

### Frontend Components

**Main Templates**
- `views/index.ejs`: File upload and library view
- `views/viewer.ejs`: Advanced text reading interface

**Key Features**
- Drag-and-drop file upload
- Real-time theme switching
- Keyboard navigation shortcuts
- Chapters sidebar with TOC
- Smooth scrolling navigation
- Responsive design for mobile/desktop

### Configuration System

**Environment Variables**
- `PORT`: Server port (default: 3000)
- Future expansion for database connections, API keys, etc.

### Data Flow

1. User uploads text file through web interface
2. File is stored in `views/public/uploaded/` directory with unique ID
3. Story metadata saved to `data/stories.json`
4. User accesses viewer page with story ID
5. Client-side JavaScript loads and parses text content
6. Chapters are detected and displayed in collapsible sidebar
7. Users navigate through content with keyboard shortcuts or chapter clicks

### Chapter Detection Patterns

Supports multiple chapter formats:
- `CHAPTER 1`, `CHAPTER 2` (English)
- `第1章`, `第2章` (Chinese)
- `SECTION 1`, `SECTION 2` (Technical)
- `PART I`, `PART II` (Roman numerals)
- `1.1`, `1.2` (Decimal numbering)
- Uppercase standalone titles

## Project Structure

```
txt-reader/
├── server.js                         # Main application file
├── package.json                      # Project configuration and dependencies
├── src/
│   └── controllers/
│       ├── uploadController.js       # File upload handling
│       ├── viewController.js         # View page serving
│       └── deleteController.js       # File deletion handling
├── views/
│   ├── index.ejs                     # Main upload/library page
│   ├── viewer.ejs                    # Text reading interface
│   └── public/
│       ├── css/                      # Stylesheets
│       ├── js/                       # Client-side JavaScript
│       └── uploaded/                 # Uploaded text files
├── data/
│   ├── stories.json                  # Story metadata
│   └── chapters.json                 # Chapter structure data
└── README.md                         # Project documentation
```

## Dependencies

- **Express.js**: Web framework for Node.js
- **Multer**: Middleware for handling multipart/form-data
- **EJS**: Embedded JavaScript templating
- **fs-extra**: File system operations with extra methods
- **uuid**: UUID generation for unique identifiers
- **nodemon**: Development tool for auto-restarting server

## Runtime Artifacts

- `views/public/uploaded/`: Directory for uploaded text files
- `data/stories.json`: JSON file storing story metadata
- `data/chapters.json`: JSON file storing chapter structure data (future use)

## Key Features Summary

✅ **File Upload**: Drag-and-drop with 50MB limit and validation
✅ **Chapter Detection**: Automatic parsing of various chapter formats
✅ **Real-time Content**: Full text display with smooth scrolling
✅ **Multiple Themes**: Monokai, Dark, Light, and Default color schemes
✅ **Font Customization**: Adjustable size through URL parameters
✅ **Keyboard Navigation**: Comprehensive shortcut system
✅ **Chapters Sidebar**: Collapsible table of contents with navigation
✅ **Responsive Design**: Works on desktop, tablet, and mobile
✅ **Client-side Processing**: JavaScript-based text parsing and navigation

## Development Guidelines

- Use npm for package management (`npm install`)
- Follow Express.js best practices
- Maintain consistent code formatting
- Use async/await for asynchronous operations
- Handle errors gracefully with try/catch
- Validate user input on both client and server side
- Test across different browser environments
- Validate file upload security
- Handle edge cases for large files
- Ensure mobile responsiveness
- Keep dependencies up to date
- Monitor for security vulnerabilities