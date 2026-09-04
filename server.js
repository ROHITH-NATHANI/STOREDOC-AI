const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Storage Quota: 1 TB
const MAX_STORAGE = 1 * 1024 * 1024 * 1024 * 1024; // 1 TB total storage allocation
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file

// Setup directories and files
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data.json');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (index.html, css, js)

// Database helpers
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getTotalStorageUsed() {
    const files = readData();
    return files.reduce((total, f) => total + (f.size || 0), 0);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Create unique filename to prevent overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: MAX_FILE_SIZE } });

// API: Get all files
app.get('/api/files', (req, res) => {
    const files = readData();
    res.json(files);
});

// API: Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Enforce 1 TB storage quota
    const usedStorage = getTotalStorageUsed();
    if (usedStorage + req.file.size > MAX_STORAGE) {
        // Remove the uploaded file since quota exceeded
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(507).json({ error: 'Storage quota exceeded. 1 TB limit reached.' });
    }

    const { uploader, type, name, mimeType } = req.body;
    const fileRecord = {
        id: req.file.filename,
        name: name || req.file.originalname,
        size: req.file.size,
        type: type,
        mimeType: mimeType || req.file.mimetype,
        uploader: uploader || 'Anonymous',
        uploadDate: new Date().toISOString(),
        path: req.file.path,
        filename: req.file.filename
    };

    const files = readData();
    files.push(fileRecord);
    writeData(files);

    res.status(201).json(fileRecord);
});

// API: Delete file
app.delete('/api/files/:id', (req, res) => {
    const files = readData();
    const index = files.findIndex(f => f.id === req.params.id);
    
    if (index !== -1) {
        const fileRecord = files[index];
        
        // Delete physical file
        if (fs.existsSync(fileRecord.path)) {
            try {
                fs.unlinkSync(fileRecord.path);
            } catch (err) {
                console.error("Failed to delete physical file", err);
            }
        }
        
        // Remove from db
        files.splice(index, 1);
        writeData(files);
        res.status(200).json({ message: 'File deleted' });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// API: Download/View file
app.get('/api/files/:id/download', (req, res) => {
    const files = readData();
    const fileRecord = files.find(f => f.id === req.params.id);
    
    if (fileRecord && fs.existsSync(fileRecord.path)) {
        res.download(fileRecord.path, fileRecord.name);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.get('/api/files/:id/view', (req, res) => {
    const files = readData();
    const fileRecord = files.find(f => f.id === req.params.id);
    
    if (fileRecord && fs.existsSync(fileRecord.path)) {
        res.sendFile(fileRecord.path);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
