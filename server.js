const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'views/public')));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
const uploadedDir = path.join(__dirname, 'views/public/uploaded');

async function ensureDirectories() {
    await fs.ensureDir(dataDir);
    await fs.ensureDir(uploadedDir);
    
    // Create initial JSON files if they don't exist
    const storiesFile = path.join(dataDir, 'stories.json');

    if (!await fs.pathExists(storiesFile)) {
        await fs.writeJson(storiesFile, []);
    }
}

// Routes
app.get('/', async (req, res) => {
    try {
        const stories = await fs.readJson(path.join(dataDir, 'stories.json'));
        res.render('index', { stories });
    } catch (error) {
        console.error('Error loading stories:', error);
        res.render('index', { stories: [] });
    }
});

app.post('/upload', require('./src/controllers/uploadController'));
app.get('/view/:fileId', require('./src/controllers/viewController'));
app.delete('/api/story/:storyId', require('./src/controllers/deleteController'));

// Start server
async function startServer() {
    try {
        await ensureDirectories();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();