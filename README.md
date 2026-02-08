# Advanced Text Reader Web Application

A modern Node.js web application for uploading, reading, and managing large text files with advanced features including chapter detection, real-time navigation, and customizable reading experience.

## 🚀 Features

### Core Functionality
- **Smart File Upload**: Drag-and-drop or browse to upload TXT files (100MB limit)
- **Automatic Chapter Detection**: Intelligently identifies chapters using multiple pattern recognition algorithms
- **Real-time Content Display**: Full text viewing without pagination for seamless reading experience
- **Smooth Navigation**: Keyboard shortcuts and chapter-based scrolling
- **Persistent Library**: Maintains history of uploaded files with metadata

### Reading Experience
- **Multiple Themes**: Monokai, Dark, Light, and Default color schemes
- **Font Customization**: Adjustable font sizes for comfortable reading
- **Chapter Sidebar**: Always-visible table of contents with search functionality
- **Smart Scrolling**: Navigate between chapters or scroll within content
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Advanced Features
- **Chapter Search**: Real-time filtering of chapter titles
- **Keyboard Navigation**: Comprehensive shortcut system
- **URL Parameters**: Customize font size and theme via URL
- **File Management**: Delete functionality for uploaded files
- **UTF-8 Support**: Proper handling of international character sets

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Template Engine**: EJS
- **File Handling**: Multer middleware
- **Frontend**: Vanilla JavaScript with Bootstrap 5
- **Styling**: CSS3 with modern features
- **Icons**: Font Awesome

## 📋 Prerequisites

- Node.js v14 or higher
- npm package manager

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd txt-reader

# Install dependencies
npm install
```

### Development

```bash
# Start development server with auto-restart
npm run dev

# Or start with custom port
PORT=3001 npm run dev
```

### Production

```bash
# Build for production (if applicable)
npm run build

# Start production server
npm start
```

## 🎯 Usage

### Uploading Files
1. Navigate to `http://localhost:3000` (or your configured port)
2. Upload a TXT file by:
   - Clicking "Browse Files" button
   - Dragging and dropping files onto the upload area
3. The application will automatically detect chapters and display the content

### Reading Features
- **Navigation**: Use arrow keys or click on chapters in the sidebar
- **Search**: Type in the chapter search box to filter chapter titles
- **Themes**: Switch between different color schemes using theme controls
- **Font Size**: Adjust text size using +/- controls or URL parameters

### Keyboard Shortcuts
- **← Arrow Left**: Previous chapter
- **→ Arrow Right**: Next chapter  
- **↑ Arrow Up**: Scroll up within current content
- **↓ Arrow Down** or **Space**: Scroll down within current content
- **1-9 Keys**: Jump to specific chapters (1st through 9th)

## 📁 Project Structure

```
txt-reader/
├── server.js                         # Main application entry point
├── package.json                      # Project dependencies and scripts
├── src/
│   └── controllers/
│       ├── uploadController.js       # File upload handling
│       ├── viewController.js         # View page serving
│       └── deleteController.js       # File deletion handling
├── views/
│   ├── index.ejs                     # Main upload/library page
│   ├── viewer.ejs                    # Advanced text reading interface
│   └── public/
│       ├── css/                      # Stylesheets
│       ├── js/                       # Client-side JavaScript
│       └── uploaded/                 # Uploaded text files storage
├── data/
│   ├── stories.json                  # Story metadata persistence
│   └── chapters.json                 # Chapter structure data
└── README.md                         # This documentation
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- File size limit: 100MB (configured in uploadController.js)

### URL Parameters
- `fontSize`: Font size in pixels (e.g., `?fontSize=18`)
- `theme`: Theme selection (monokai, dark, light, default)

## 🧪 Testing

### Sample Files
The application works with any plain text (.txt) files. For testing chapter detection, use files with common chapter formats:
- `Chapter 1`, `Chapter 2`, etc.
- `第1章`, `第2章`, etc. (Chinese chapters)
- `Section 1`, `Section 2`, etc.
- Roman numerals: `I.`, `II.`, etc.

### Test Commands
```bash
# Test file upload via curl
curl -F "file=@sample.txt" http://localhost:3000/upload

# Test with Chinese filename
curl -F "file=@测试文件.txt" http://localhost:3000/upload
```

## 🔒 Security Features

- File type validation (TXT files only)
- File size limiting (100MB maximum)
- UTF-8 encoding support for international characters
- Secure file storage with unique identifiers

## 🐛 Troubleshooting

### Common Issues
1. **"No file selected!" error**: Usually resolved by refreshing the page or checking browser console
2. **File upload fails**: Verify file size is under 100MB and file type is .txt
3. **Chinese characters display incorrectly**: The application now properly handles UTF-8 encoding

### Debugging
- Check browser console for JavaScript errors
- Server logs show detailed upload processing information
- Enable development mode for detailed error messages

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
- Express.js community for excellent documentation
- Multer for robust file upload handling