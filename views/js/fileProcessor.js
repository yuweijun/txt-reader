/**
 * Local File Processor for Text Reader Application
 * Handles file processing entirely in the browser without server upload
 */

class LocalFileProcessor {
    constructor() {
        this.db = new TextReaderDB();
        this.chaptersPerFile = 50; // Split files into chunks of 50 chapters
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
            
            // Extract title from first line (max 15 characters)
            const firstLine = fileContent.split('\n')[0] || '';
            const storyTitle = firstLine.substring(0, 15).trim() || 'Untitled';

            // Create filename based on title
            const generatedFileName = `${storyTitle}.txt`;
            
            // Process content with chapter formatting
            const processingResult = this.processContentWithChapters(fileContent);
            
            // Save to database with chapter information
            const storyData = {
                id: storyId,
                fileName: generatedFileName,
                originalFileName: file.name,
                fileSize: file.size,
                uploadTime: new Date().toISOString(),
                content: fileContent, // Store original content
                processedContent: processingResult.htmlContent, // Store HTML formatted content
                chapters: processingResult.chapters, // Store chapter objects
                extractedTitle: storyTitle // Store the extracted title
            };

            await this.db.addStory(storyData);
            return storyId;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Process and split large file into chunks of specified chapter count
     */
    async processAndSplitFile(file) {
        try {
            // Read file content
            const fileContent = await this.readFileAsText(file);
            const lines = fileContent.split('\n');

            // Detect all chapters first
            const chapterBoundaries = this.detectChapterBoundaries(lines);

            // If file has few chapters, process normally
            if (chapterBoundaries.length <= this.chaptersPerFile) {
                return [await this.processFile(file)];
            }

            // Split file into chunks by chapters
            const storyIds = [];
            const baseFileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            const totalChunks = Math.ceil(chapterBoundaries.length / this.chaptersPerFile);

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const startChapterIdx = chunkIndex * this.chaptersPerFile;
                const endChapterIdx = Math.min((chunkIndex + 1) * this.chaptersPerFile,
                    chapterBoundaries.length);

                // Get line boundaries for this chunk
                const startLineIdx = chapterBoundaries[startChapterIdx].lineIndex;
                const endLineIdx = endChapterIdx < chapterBoundaries.length
                    ? chapterBoundaries[endChapterIdx].lineIndex
                    : lines.length;

                // Extract chunk lines
                const chunkLines = lines.slice(startLineIdx, endLineIdx);
                const chunkContent = chunkLines.join('\n');

                // Generate chunk file name with zero-padded index (3 digits)
                const paddedIndex = (chunkIndex + 1).toString().padStart(3, '0');
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
                    originalFileName: file.name,
                    fileSize: new Blob([chunkContent]).size,
                    uploadTime: new Date().toISOString(),
                    content: chunkContent,
                    processedContent: processingResult.htmlContent,
                    chapters: processingResult.chapters,
                    extractedTitle: chunkTitle,
                    isSplitFile: true,
                    splitParentFile: file.name,
                    splitIndex: chunkIndex + 1,
                    totalChunks: totalChunks
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
     * Detect chapter boundaries in the content
     * Returns array of { lineIndex, title } objects for each chapter
     */
    detectChapterBoundaries(lines) {
        const chapterBoundaries = [];

        // Common chapter patterns
        const chapterPatterns = [
            /^第?\s*([一二三四五六七八九十百千万\d]+)\s*[章节卷部篇回]/, // Chinese chapters
            /^Chapter\s+(\d+)/i, // English chapters
            /^Section\s+(\d+)/i, // Sections
            /^[IVXLCDM]+\.\s/, // Roman numerals
            /^\d+\.\d+/, // Decimal numbering
            /^PART\s+[A-Z]+/i, // PART headings
            /^PROLOGUE/i, // Prologue
            /^EPILOGUE/i // Epilogue
        ];

        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();

            // Check if this line matches chapter pattern
            for (const pattern of chapterPatterns) {
                if (pattern.test(trimmedLine)) {
                    chapterBoundaries.push({
                        lineIndex: i,
                        title: trimmedLine
                    });
                    break;
                }
            }
        }

        return chapterBoundaries;
    }

    /**
     * Public method to detect chapter boundaries from file content
     * Returns array of { lineIndex, title } objects for each chapter
     */
    detectChapters(content) {
        const lines = content.split('\n');
        return this.detectChapterBoundaries(lines);
    }

    /**
     * Process text content from textarea - save directly without splitting
     */
    async processTextContent(content, fileName = 'pasted_content.txt') {
        try {
            // Generate story ID
            const storyId = this.generateStoryId();
            
            // Extract title from first line (max 15 characters)
            const firstLine = content.split('\n')[0] || '';
            const storyTitle = firstLine.substring(0, 15).trim() || 'Untitled';

            // Create filename based on title
            const generatedFileName = `${storyTitle}.txt`;
            
            // Process content with chapter formatting
            const processingResult = this.processContentWithChapters(content);
            
            // Save to database with chapter information
            const storyData = {
                id: storyId,
                fileName: generatedFileName,
                originalFileName: fileName,
                fileSize: new Blob([content]).size,
                uploadTime: new Date().toISOString(),
                content: content, // Store original content
                processedContent: processingResult.htmlContent, // Store HTML formatted content
                chapters: processingResult.chapters, // Store chapter objects
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
     * Only matched chapter patterns get anchors and are added to chapter list
     * Returns object with { htmlContent, chapters }
     */
    processContentWithChapters(content) {
        const lines = content.split('\n');
        let htmlContent = '';
        let chapters = [];
        let chapterIndex = 0;
        let inChapterContent = false;

        // Common chapter patterns - only these get anchors
        const chapterPatterns = [
            /^第?\s*([一二三四五六七八九十百千万\d]+)\s*[章节卷部篇回]/, // Chinese chapters
            /^Chapter\s+(\d+)/i, // English chapters
            /^Section\s+(\d+)/i, // Sections
            /^[IVXLCDM]+\.\s/, // Roman numerals
            /^\d+\.\d+/, // Decimal numbering
            /^PART\s+[A-Z]+/i, // PART headings
            /^PROLOGUE/i, // Prologue
            /^EPILOGUE/i // Epilogue
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip empty lines at the very beginning
            if (i === 0 && trimmedLine === '') continue;

            // Check if this line matches chapter pattern
            let isChapterHeading = false;
            for (const pattern of chapterPatterns) {
                if (pattern.test(trimmedLine)) {
                    isChapterHeading = true;
                    break;
                }
            }

            if (isChapterHeading) {
                // Close previous chapter content if exists
                if (inChapterContent) {
                    htmlContent += '</div>\n';
                    inChapterContent = false;
                }

                // Start new chapter
                chapterIndex++;
                const anchorId = `chapter-${chapterIndex}`;

                // Add to chapter list
                chapters.push({
                    title: trimmedLine,
                    anchorId: anchorId
                });

                // Add anchor and heading to HTML
                htmlContent += `<div id="${anchorId}" class="chapter-anchor"></div>\n`;
                htmlContent += `<div class="chapter-heading">${this.escapeHtml(trimmedLine)}</div>\n`;
                htmlContent += '<div class="chapter-content">\n';
                inChapterContent = true;
            } else {
                // Regular content line
                if (!inChapterContent) {
                    // Content before first chapter - wrap in default content div
                    htmlContent += '<div class="chapter-content">\n';
                    inChapterContent = true;
                }
                htmlContent += `${this.escapeHtml(line)}\n`;
            }
        }

        // Close final chapter content div
        if (inChapterContent) {
            htmlContent += '</div>\n';
        }

        return {
            htmlContent: htmlContent,
            chapters: chapters
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