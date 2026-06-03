/**
 * @file File upload route.
 * @description Receives multipart form-data via multer, stores the file
 *              under `backend/uploads/`, and returns its public URL.
 *              The frontend prepends the API base URL to display images
 *              inline in posts, comments, and avatars.
 *
 *   POST /api/uploads/image   (field: "image", max 8 MB, jpeg/png/gif/webp/avif)
 *
 *  Files are written to local disk for simplicity. To swap in Cloudinary
 *  or S3, replace the `multer.diskStorage` engine with a `multer-storage-*`
 *  adapter and forward the resulting URL.
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
 * Format: `<timestamp>-<8-byte-hex>.<ext>` — e.g. `1717412345678-1a2b3c4d5e.png`.
 *
 * @param {string} originalname Original file name from the client
 * @returns {string} Sanitized file name
 */
const makeFilename = (originalname) => {
    const ext = path.extname(originalname || '').toLowerCase().slice(0, 8) || '.bin';
    const id = crypto.randomBytes(8).toString('hex');
    const ts = Date.now();
    return `${ts}-${id}${ext}`;
};

/** Multer disk storage engine that writes to `UPLOAD_DIR` with our safe naming. */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, makeFilename(file.originalname)),
});

/* ------------------------------------------------------------------ *
 *  File filter — only allow common image types (max 8 MB)
 * ------------------------------------------------------------------ */

/** MIME types accepted by the upload route. */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);

/** Maximum upload size in bytes. */
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Multer file filter. Rejects non-image MIME types with a clear message.
 * @param {import('express').Request}  req
 * @param {Express.Multer.File}        file
 * @param {(error: Error|null, accept: boolean) => void} cb
 */
const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error('Only image files (jpeg, png, gif, webp, avif) are allowed.'), false);
    }
    cb(null, true);
};

/** Configured multer instance. */
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_BYTES },
});

/* ------------------------------------------------------------------ *
 *  Auth middleware for upload route (reused logic)
 * ------------------------------------------------------------------ */

/**
 * JWT auth middleware. Verifies `x-auth-token` and populates
 * `req.user` and `req.username`. 401 on failure.
 *
 * @param   {import('express').Request}  req
 * @param   {import('express').Response} res
 * @param   {import('express').NextFunction} next
 */
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

/**
 * @route   POST /api/uploads/image
 * @desc    Upload an image. The returned `url` is a server-relative
 *          path (`/uploads/<filename>`) that the frontend prepends with
 *          `VITE_API_URL` to display the image.
 * @access  Private
 * @param   {File} req.file.image   The uploaded file (multipart field name: `image`)
 * @returns {201} { url, filename, size, mimetype }
 * @returns {400} { message }   Bad request / multer error
 */
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

/**
 * Error-handling middleware that translates multer / file-size errors
 * into friendly 400 responses instead of generic 500s.
 */
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
