# Text Reader - Pure Frontend Application

A modern web application for reading and managing text files with advanced features including chapter detection, real-time navigation, and customizable reading experience. All processing happens directly in the browser with no server-side file storage.

## 🚀 Key Features

### Core Functionality
- **Browser-Based Processing**: All file handling occurs in the browser - no server uploads
- **Direct Text Pasting**: Paste content directly into the application without file upload
- **Local Storage**: Files stored entirely in browser's IndexedDB database
- **Automatic Chapter Detection**: Intelligently identifies chapters using multiple pattern recognition algorithms
- **Real-time Content Display**: Full text viewing without pagination for seamless reading experience
- **Smooth Navigation**: Keyboard shortcuts and chapter-based scrolling

### Reading Experience
- **Multiple Themes**: 9 professional dark themes (Monokai Pro, Deep Dark, Solarized, Dracula, Nord, Gruvbox, One Dark, Dark Green, Default)
- **Font Customization**: Adjustable font sizes for comfortable reading
- **Chapter Sidebar**: Always-visible table of contents with search functionality
- **Smart Scrolling**: Navigate between chapters or scroll within content
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Advanced Features
- **Chapter Search**: Real-time filtering of chapter titles
- **Keyboard Navigation**: Comprehensive shortcut system
- **Reading History**: Automatic position saving and restoration
- **Pagination**: 30 items per page with navigation controls
- **File Management**: Complete CRUD operations for local documents

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Database**: IndexedDB for local storage
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome
- **Server**: Python built-in http.server module for static file serving only

## 📋 Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.6 or higher (for development server)

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd txt-reader

# No dependencies to install - uses Python built-in modules
```

### Development

```bash
# Start development server with the start script
./start.sh

# Or run directly with Python's built-in HTTP server
cd reader && python -m http.server 8000

# Run with custom port
cd reader && python -m http.server 8001
```

### Access the Application

Open your browser and navigate to `http://localhost:8000`

The application uses client-side routing with hash URLs for viewer pages (e.g., `http://localhost:8000/#view/storyId`)

## 🎯 Usage

### Adding Content
1. Navigate to `http://localhost:8000`
2. Add content by either:
   - **Pasting text**: Type or paste content directly into the text area
   - **File upload**: Select a TXT file from your computer
3. Click the appropriate "Process" button
4. The content will be saved to your local browser database

### Reading Features
- **Navigation**: Use arrow keys or click on chapters in the sidebar
- **Search**: Type in the chapter search box to filter chapter titles
- **Themes**: Switch between different color schemes using theme controls
- **Font Size**: Adjust text size using the viewer controls
- **Position Memory**: Automatically returns to your last reading position
- **Viewer Pages**: Accessed via hash URLs like `http://localhost:8000/#view/storyId`

### Keyboard Shortcuts
- **← Arrow Left**: Previous chapter
- **→ Arrow Right**: Next chapter  
- **↑ Arrow Up**: Scroll up within current content
- **↓ Arrow Down** or **Space**: Scroll down within current content
- **1-9 Keys**: Jump to specific chapters (1st through 9th)

## 📁 Project Structure

```
txt-reader/
├── start.sh                          # Convenience script to start the server
├── requirements.txt                  # Python dependencies (minimal - mostly built-ins)
├── reader/
│   ├── index.html                    # Main document management page
│   ├── viewer.html                   # Advanced text reading interface
│   ├── viewController.js             # Legacy route handler (no longer used)
│   └── public/
│       ├── css/                      # Stylesheets
│       └── js/                       # Client-side JavaScript
│           ├── database.js           # IndexedDB wrapper
│           ├── fileProcessor.js      # Local file processing
│           ├── init.js               # Application initialization
│           └── viewer.js             # Viewer-specific functionality
└── README.md                         # This documentation
```

## 🔧 Architecture

### Pure Frontend Design
This application follows a pure frontend architecture where:
- **No server-side file storage**: All files remain in the browser
- **Client-side processing**: File reading, parsing, and storage handled by browser APIs
- **Local database**: IndexedDB provides persistent storage within the browser
- **Minimal server**: Python's built-in HTTP server only serves static files

### Client-Side Routing
The application uses hash-based routing for viewer pages:
- Main page: `http://localhost:8000`
- Viewer pages: `http://localhost:8000/#view/{storyId}`

### Data Flow
1. User inputs text via paste or file selection
2. Browser FileReader API reads the content
3. Content is stored in IndexedDB local database
4. Viewer loads content directly from local storage
5. Reading positions are automatically saved and restored

## 🧪 Supported Formats

### File Types
- Plain text files (.txt)
- UTF-8 encoded content
- Maximum file size: 100MB

### Chapter Detection Patterns
- English: `Chapter 1`, `Chapter 2`, etc.
- Chinese: `第1章`, `第2章`, etc.
- Technical: `Section 1`, `Section 2`, etc.
- Roman numerals: `I.`, `II.`, etc.
- Decimal numbering: `1.1`, `1.2`, etc.

## 🔒 Privacy & Security

- **Zero server storage**: Files never leave your browser
- **Local processing**: All operations happen on your device
- **No internet required**: Works offline once loaded
- **Private browsing**: Content remains on your machine only
- **Secure deletion**: Files can be permanently removed from local storage

## 🐛 Troubleshooting

### Common Issues
1. **Content not displaying**: Check browser console for IndexedDB errors
2. **Large files slow to load**: Browser processing time increases with file size
3. **Data loss concerns**: Regular browser clearing will remove local data
4. **Cross-browser compatibility**: Modern browsers with IndexedDB support required

### Browser Support
- Chrome 50+
- Firefox 50+
- Safari 10+
- Edge 79+

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Bootstrap 5 for responsive UI components
- Font Awesome for iconography
- IndexedDB API for local storage capabilities