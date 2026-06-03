/**
 * @file File upload route.
 * @description Receives multipart form-data, stores files under `backend/uploads/`,
 *              and returns the public URL. The frontend prepends the API base URL
 *              to display images in posts and avatars.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/* ------------------------------------------------------------------ *
 *  Storage configuration
 * ------------------------------------------------------------------ */

/** Absolute path to the uploads directory (auto-created on boot). */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Build a safe, random filename preserving the original extension.
 * @param {string} originalname Original file name from the client
 * @returns {string} Sanitized file name
 */
const makeFilename = (originalname) => {
    const ext = path.extname(originalname || '').toLowerCase().slice(0, 8) || '.bin';
    const id = crypto.randomBytes(8).toString('hex');
    const ts = Date.now();
    return `${ts}-${id}${ext}`;
};

/** Multer disk storage engine. */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, makeFilename(file.originalname)),
});

/* ------------------------------------------------------------------ *
 *  File filter — only allow common image types (max 8 MB)
 * ------------------------------------------------------------------ */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error('Only image files (jpeg, png, gif, webp, avif) are allowed.'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_BYTES },
});

/* ------------------------------------------------------------------ *
 *  Auth middleware for upload route (reused logic)
 * ------------------------------------------------------------------ */
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.username = decoded.username;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

/* ------------------------------------------------------------------ *
 *  POST /api/uploads/image
 *  Body: multipart/form-data  (field: "image")
 *  Returns: { url, filename, size, mimetype }
 * ------------------------------------------------------------------ */
router.post('/image', auth, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image file provided (field name: image)' });
    }
    // The public URL is relative to the API; the frontend prepends VITE_API_URL.
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
        url,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
    });
});

/* ------------------------------------------------------------------ *
 *  Multer error handler
 * ------------------------------------------------------------------ */
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
});

module.exports = router;
