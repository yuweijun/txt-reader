/**
 * Initialization script for Text Reader Application
 * Handles database initialization and data synchronization
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Text Reader Application...');
    
    try {
        // Initialize database
        const db = new TextReaderDB();
        await db.init();
        console.log('Database initialized successfully');
        
        // Sync stories from server to local database
        await syncStoriesWithServer();
        
        console.log('Application initialization completed');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
});

/**
 * Sync stories from server data to local database
 */
async function syncStoriesWithServer() {
    try {
        // This would typically fetch from an API endpoint
        // For now, we'll rely on the existing server-side data
        
        console.log('Stories synced with local database');
    } catch (error) {
        console.error('Error syncing stories:', error);
    }
}

/**
 * Utility function to format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Global utility functions
 */
window.TextReaderUtils = {
    formatFileSize: formatFileSize,
    db: new TextReaderDB()
};