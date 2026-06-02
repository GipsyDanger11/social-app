const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO } = require('../socket');

const notifyUser = (username, event, payload) => {
    try { getIO().to(`user:${username}`).emit(event, payload); } catch (e) { /* socket not ready */ }
};

const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        req.username = user.username;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// GET /api/notifications
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.username })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res) => {
    try {
        const count = await Notification.countDocuments({ 
            recipient: req.username, 
            read: false 
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /api/notifications/mark-read
router.put('/mark-read', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.username, read: false },
            { $set: { read: true } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Helper to create notifications
const createNotification = async (recipient, sender, type, message, postId = null) => {
    if (recipient === sender) return; // Don't notify yourself
    try {
        const notification = new Notification({
            recipient, sender, type, message, postId
        });
        await notification.save();
        // Real-time: push the new notification to the recipient
        notifyUser(recipient, 'notification:new', notification);
    } catch (err) {
        console.error('Notification error:', err);
    }
};

module.exports = { router, createNotification };
