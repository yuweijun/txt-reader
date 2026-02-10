/**
 * Local File Processor for Text Reader Application
 * Handles file processing entirely in the browser without server upload
 */

class LocalFileProcessor {
    constructor() {
        this.db = new TextReaderDB();
    }

    /**
     * Process file locally - save directly to database without splitting
     */
    async processFile(file) {
        try {
            // Read file content
            const fileContent = await this.readFileAsText(file);
            
            // Generate story ID
            const storyId = this.generateStoryId();
            
            // Extract title from first line (max 100 characters)
            const firstLine = fileContent.split('\n')[0] || '';
            const storyTitle = firstLine.substring(0, 100).trim() || 'Untitled';
            
            // Create filename based on title
            const generatedFileName = `${storyTitle}.txt`;
            
            // Save to database (simple structure, no segments)
            const storyData = {
                id: storyId,
                fileName: generatedFileName,
                originalFileName: generatedFileName,
                fileSize: file.size,
                uploadTime: new Date().toISOString(),
                content: fileContent, // Store full content only
                extractedTitle: storyTitle // Store the extracted title
            };
            
            await this.db.addStory(storyData);
            return storyId;
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Process text content from textarea - save directly without splitting
     */
    async processTextContent(content, fileName = 'pasted_content.txt') {
        try {
            // Generate story ID
            const storyId = this.generateStoryId();
            
            // Extract title from first line (max 100 characters)
            const firstLine = content.split('\n')[0] || '';
            const storyTitle = firstLine.substring(0, 100).trim() || 'Untitled';
            
            // Create filename based on title
            const generatedFileName = `${storyTitle}.txt`;
            
            // Save to database (simple structure, no segments)
            const storyData = {
                id: storyId,
                fileName: generatedFileName,
                originalFileName: generatedFileName,
                fileSize: new Blob([content]).size,
                uploadTime: new Date().toISOString(),
                content: content, // Store full content only
                extractedTitle: storyTitle // Store the extracted title
            };
            
            await this.db.addStory(storyData);
            return storyId;
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Generate unique story ID
     */
    generateStoryId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get story content directly from database
     */
    async getStoryContent(storyId) {
        try {
            const story = await this.db.getStoryById(storyId);
            
            if (!story) {
                throw new Error('Story not found for ID: ' + storyId);
            }
            
            // Return the full content directly
            return story.content || '';
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete story and all its segments
     */
    async deleteStory(storyId) {
        try {
            await this.db.deleteStory(storyId);
            console.log('Story deleted:', storyId);
            return true;
        } catch (error) {
            console.error('Error deleting story:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.LocalFileProcessor = LocalFileProcessor;