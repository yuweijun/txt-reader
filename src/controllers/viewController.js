const fs = require('fs-extra');
const path = require('path');

async function viewController(req, res) {
    try {
        const { storyId } = req.params;
        const { page = 0, theme = 'monokai', fontSize = 18 } = req.query;
        
        // For the new architecture, we just need to serve the viewer template
        // All story data will be loaded client-side from the browser database
        
        res.render('viewer', {
            storyId,
            currentPage: parseInt(page),
            theme,
            fontSize: parseInt(fontSize)
        });
        
    } catch (error) {
        console.error('View controller error:', error);
        res.redirect('/');
    }
}

module.exports = viewController;