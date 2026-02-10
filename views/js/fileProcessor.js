/**
 * Local File Processor for Text Reader Application
 * Handles file processing entirely in the browser without server upload
 */

class LocalFileProcessor {
    constructor() {
        this.db = new TextReaderDB();
        this.linesPerFile = 10000; // Split files into chunks of 10,000 lines
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
            
            // Process content with chapter formatting
            const processingResult = this.processContentWithChapters(fileContent);
            
            // Save to database with chapter information
            const storyData = {
                id: storyId,
                fileName: generatedFileName,
                originalFileName: generatedFileName,
                fileSize: file.size,
                uploadTime: new Date().toISOString(),
                content: fileContent, // Store original content
                processedContent: processingResult.htmlContent, // Store HTML formatted content
                chapters: processingResult.chapters, // Store chapter objects
                chapterTitles: processingResult.chapterTitles, // Store chapter titles array
                extractedTitle: storyTitle // Store the extracted title
            };
            
            await this.db.addStory(storyData);
            return storyId;
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Process and split large file into chunks of specified line count
     */
    async processAndSplitFile(file) {
        try {
            // Read file content
            const fileContent = await this.readFileAsText(file);
            const lines = fileContent.split('\n');
            
            // If file is small enough, process normally
            if (lines.length <= this.linesPerFile) {
                return [await this.processFile(file)];
            }
            
            // Split file into chunks
            const storyIds = [];
            const baseFileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            
            for (let i = 0; i < lines.length; i += this.linesPerFile) {
                const chunkLines = lines.slice(i, i + this.linesPerFile);
                const chunkContent = chunkLines.join('\n');
                
                // Generate chunk file name with zero-padded index (3 digits)
                const chunkIndex = Math.floor(i / this.linesPerFile) + 1;
                const paddedIndex = chunkIndex.toString().padStart(3, '0');
                const chunkFileName = `${baseFileName}-${paddedIndex}.txt`;
                
                // Generate story ID for this chunk
                const storyId = this.generateStoryId();
                
                // Use chunk file name as title (e.g., "filename-001")
                const chunkTitle = `${baseFileName}-${paddedIndex}`;
                
                // Process content with chapter formatting
                const processingResult = this.processContentWithChapters(chunkContent);
                
                // Save chunk to database
                const storyData = {
                    id: storyId,
                    fileName: chunkFileName,
                    originalFileName: chunkFileName,
                    fileSize: new Blob([chunkContent]).size,
                    uploadTime: new Date().toISOString(),
                    content: chunkContent,
                    processedContent: processingResult.htmlContent,
                    chapters: processingResult.chapters,
                    chapterTitles: processingResult.chapterTitles,
                    extractedTitle: chunkTitle,
                    isSplitFile: true,
                    splitParentFile: file.name,
                    splitIndex: chunkIndex,
                    totalChunks: Math.ceil(lines.length / this.linesPerFile)
                };
                
                await this.db.addStory(storyData);
                storyIds.push(storyId);
            }
            
            return storyIds;
            
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
            
            // Process content with chapter formatting
            const processingResult = this.processContentWithChapters(content);
            
            // Save to database with chapter information
            const storyData = {
                id: storyId,
                fileName: generatedFileName,
                originalFileName: generatedFileName,
                fileSize: new Blob([content]).size,
                uploadTime: new Date().toISOString(),
                content: content, // Store original content
                processedContent: processingResult.htmlContent, // Store HTML formatted content
                chapters: processingResult.chapters, // Store chapter objects
                chapterTitles: processingResult.chapterTitles, // Store chapter titles array
                extractedTitle: storyTitle // Store the extracted title
            };
            
            await this.db.addStory(storyData);
            return storyId;
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Process content by detecting chapters and extracting chapter list
     * Returns object with { htmlContent, chapters, chapterTitles }
     */
    processContentWithChapters(content) {
        const lines = content.split('\n');
        let htmlContent = '';
        let chapters = []; // Array to store chapter objects
        let chapterTitles = []; // Array to store just chapter titles
        let currentChapter = null;
        let currentContentLines = [];
        let chapterIndex = 0;

        // Common chapter patterns
        const chapterPatterns = [
            /^第?\s*([一二三四五六七八九十百千万\d]+)\s*[章节卷部篇回]/, // Chinese chapters
            /^Chapter\s+(\d+)/i, // English chapters
            /^Section\s+(\d+)/i, // Sections
            /^[IVXLCDM]+\.\s/, // Roman numerals
            /^\d+\.\d+/, // Decimal numbering
            /^[A-Z][^.]+$/, // Uppercase standalone titles (potential chapters)
            /^PART\s+[A-Z]+/i, // PART headings
            /^PROLOGUE/i, // Prologue
            /^EPILOGUE/i // Epilogue
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip empty lines at the very beginning
            if (i === 0 && line.trim() === '') continue;

            // Check if this line is a chapter heading
            let isChapterHeading = false;
            for (const pattern of chapterPatterns) {
                if (pattern.test(line.trim())) {
                    isChapterHeading = true;
                    break;
                }
            }

            // Special case: Very long uppercase lines might be chapter titles
            if (!isChapterHeading && line.trim().length > 5 && line.trim().length < 100 &&
                line.trim() === line.trim().toUpperCase() && /[A-Z]/.test(line.trim())) {
                isChapterHeading = true;
            }

            if (isChapterHeading) {
                // Save previous chapter if exists
                if (currentChapter) {
                    const chapterContent = currentContentLines.join('\n');
                    chapters.push({
                        title: currentChapter,
                        content: chapterContent,
                        htmlContent: this.formatChapterContentWithoutTags(currentContentLines),
                        anchorId: `chapter-${chapterIndex}`
                    });
                    chapterTitles.push(currentChapter);
                }

                // Start new chapter
                chapterIndex++;
                currentChapter = line.trim();
                currentContentLines = [];
                const anchorId = `chapter-${chapterIndex}`;
                htmlContent += `<div id="${anchorId}" class="chapter-anchor"></div>\n`;
                htmlContent += `<div class="chapter-heading">${this.escapeHtml(currentChapter)}</div>\n`;
                htmlContent += '<div class="chapter-content">\n';
            } else if (line.trim() !== '') {
                // Regular content line - preserve original formatting
                currentContentLines.push(line);
                htmlContent += `${this.escapeHtml(line)}\n`;
            } else if (line.trim() === '' && currentContentLines.length > 0) {
                // Empty line - preserve spacing
                currentContentLines.push(line);
                htmlContent += '\n';
            }
        }

        // Handle last chapter
        if (currentChapter && currentContentLines.length > 0) {
            const chapterContent = currentContentLines.join('\n');
            chapters.push({
                title: currentChapter,
                content: chapterContent,
                htmlContent: this.formatChapterContentWithoutTags(currentContentLines),
                anchorId: `chapter-${chapterIndex}`
            });
            chapterTitles.push(currentChapter);
            htmlContent += '</div>\n'; // Close the last chapter-content div
        } else if (currentChapter) {
            // Close the chapter-content div even if no content
            htmlContent += '</div>\n';
        }

        // If no chapters were detected, treat entire content as one chapter
        if (chapters.length === 0) {
            const allContentLines = lines.filter(line => line.trim() !== '');
            htmlContent = '<div id="chapter-1" class="chapter-anchor"></div>\n';
            htmlContent += '<div class="chapter-content">\n';
            htmlContent += allContentLines.map(line => this.escapeHtml(line)).join('\n');
            htmlContent += '\n</div>\n';
            chapters.push({
                title: '全文',
                content: allContentLines.join('\n'),
                htmlContent: this.formatChapterContentWithoutTags(allContentLines),
                anchorId: 'chapter-1'
            });
            chapterTitles.push('全文');
        }

        return {
            htmlContent: htmlContent,
            chapters: chapters,
            chapterTitles: chapterTitles
        };
    }
    
    /**
     * Format content without adding paragraph or break tags - preserve original line breaks
     */
    formatChapterContentWithoutTags(lines) {
        if (lines.length === 0) return '';
        
        let html = '<div class="chapter-content">\n';
        
        // Simply escape each line and join with newlines - no additional tags
        html += lines.map(line => this.escapeHtml(line)).join('\n');
        
        html += '\n</div>\n';
        return html;
    }
    
    /**
     * Format content with simple paragraph grouping (no individual line wrapping)
     */
    formatChapterContentSimple(lines) {
        if (lines.length === 0) return '';
        
        let html = '<div class="chapter-content">\n';
        let currentParagraph = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim() === '') {
                // Empty line indicates paragraph break
                if (currentParagraph.length > 0) {
                    html += `<p>${this.escapeHtml(currentParagraph.join(' '))}</p>\n`;
                    currentParagraph = [];
                }
                html += '<br>\n'; // Add visual spacing
            } else {
                // Collect lines for paragraph
                currentParagraph.push(line.trim());
            }
        }
        
        // Handle remaining paragraph
        if (currentParagraph.length > 0) {
            html += `<p>${this.escapeHtml(currentParagraph.join(' '))}</p>\n`;
        }
        
        html += '</div>\n';
        return html;
    }
    
    /**
     * Escape HTML characters for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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