const fs = require('fs-extra');
const path = require('path');

async function viewController(req, res) {
    try {
        const { fileId } = req.params;
        const { page = 0, theme = 'monokai', fontSize = 18 } = req.query;
        
        // Get story metadata
        const storiesFile = path.join(__dirname, '../../data/stories.json');
        const stories = await fs.readJson(storiesFile);
        const story = stories.find(s => s.id === fileId);
        
        if (!story) {
            return res.redirect('/');
        }
        
        // Get file path
        const filePath = `/uploaded/${story.fileName}`;
        
        // For now, we'll pass minimal data and let the client handle chapter parsing
        // In a production app, you might want to pre-parse chapters on upload
        
        res.render('viewer', {
            fileId,
            currentPage: parseInt(page),
            fileName: story.originalFileName,
            filePath,
            theme,
            fontSize: parseInt(fontSize),
            storyId: fileId,
            chapters: [], // Will be parsed client-side
            currentChapter: null
        });
        
    } catch (error) {
        console.error('View controller error:', error);
        res.redirect('/');
    }
}

module.exports = viewController;