const fs = require('fs-extra');
const path = require('path');

async function deleteController(req, res) {
    try {
        const { storyId } = req.params;
        
        // Get story metadata
        const storiesFile = path.join(__dirname, '../../data/stories.json');
        let stories = await fs.readJson(storiesFile);
        
        const storyIndex = stories.findIndex(s => s.id === storyId);
        if (storyIndex === -1) {
            return res.status(404).json({ error: 'Story not found' });
        }
        
        const story = stories[storyIndex];
        
        // Delete the physical file
        const filePath = path.join(__dirname, '../../uploaded', story.fileName);
        await fs.remove(filePath);
        
        // Remove from stories array
        stories.splice(storyIndex, 1);
        await fs.writeJson(storiesFile, stories);
        
        // Also remove from chapters data
        const chaptersFile = path.join(__dirname, '../../data/chapters.json');
        let chapters = await fs.readJson(chaptersFile).catch(() => []);
        chapters = chapters.filter(c => c.storyId !== storyId);
        await fs.writeJson(chaptersFile, chapters);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Delete controller error:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = deleteController;