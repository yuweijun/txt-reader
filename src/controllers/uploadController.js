const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Configure multer for file upload with proper encoding
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploaded');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const fileId = uuidv4();
        // Handle UTF-8 filenames properly
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const fileName = `${fileId}_${originalName}`;
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept text files
        if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Only text files are allowed!'), false);
        }
    }
});

async function uploadController(req, res) {
    try {
        console.log('\n=== UPLOAD CONTROLLER CALLED ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('Content-Type header:', req.headers['content-type']);
        console.log('Content-Length header:', req.headers['content-length']);
        console.log('Request headers keys:', Object.keys(req.headers));
        
        // Log request body structure (without sensitive data)
        console.log('Request body keys:', req.body ? Object.keys(req.body) : 'no body');
        console.log('Request files:', req.files);
        console.log('Request file:', req.file);
        
        // Handle file upload
        upload.single('file')(req, res, async (err) => {
            console.log('\n=== MULTER CALLBACK EXECUTED ===');
            console.log('Multer error:', err);
            console.log('Request after multer processing:');
            console.log('  - req.file:', req.file);
            console.log('  - req.files:', req.files);
            console.log('  - req.body:', req.body);
            
            if (err) {
                console.error('Upload error:', err);
                let errorMessage = 'Failed to upload file: ' + err.message;
                if (err.code === 'LIMIT_FILE_SIZE') {
                    errorMessage = 'File size exceeds 100MB limit!';
                }
                return res.render('index', { 
                    error: errorMessage,
                    stories: await fs.readJson(path.join(__dirname, '../../data/stories.json')).catch(() => [])
                });
            }

            if (!req.file) {
                console.log('❌ NO FILE DETECTED BY MULTER');
                console.log('Full request object inspection:');
                console.log('  - req.headers:', req.headers);
                console.log('  - req.body keys:', Object.keys(req.body || {}));
                console.log('  - req.files:', req.files);
                console.log('  - req.file:', req.file);
                
                const stories = await fs.readJson(path.join(__dirname, '../../data/stories.json')).catch(() => []);
                return res.render('index', { 
                    error: 'No file selected!',
                    stories 
                });
            }
            
            console.log('✅ FILE SUCCESSFULLY RECEIVED BY MULTER:', {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                encoding: req.file.encoding,
                mimetype: req.file.mimetype,
                size: req.file.size
            });

            // Save story metadata with proper UTF-8 handling
            const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
            const story = {
                id: req.file.filename.split('_')[0],
                fileName: req.file.filename,
                originalFileName: originalFileName,
                fileSize: req.file.size,
                uploadDateTime: new Date().toISOString(),
                keywords: ''
            };

            const storiesFile = path.join(__dirname, '../../data/stories.json');
            let stories = await fs.readJson(storiesFile).catch(() => []);
            stories.push(story);
            await fs.writeJson(storiesFile, stories);

            // Redirect to viewer
            res.redirect(`/view/${story.id}`);
        });
    } catch (error) {
        console.error('Upload controller error:', error);
        const stories = await fs.readJson(path.join(__dirname, '../../data/stories.json')).catch(() => []);
        res.render('index', { 
            error: 'Failed to upload file: ' + error.message,
            stories 
        });
    }
}

module.exports = uploadController;