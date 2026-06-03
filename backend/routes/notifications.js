/**
 * @file Notification routes + helper.
 * @description Mounted at `/api/notifications`. Provides:
 *   - List the 50 most recent notifications for the current user
 *   - Count of unread notifications (drives the navbar bell badge)
 *   - Mark-all-as-read bulk action
 *
 * The module also exports a `createNotification` helper used by the
 * posts / follow / messages routes to record a notification AND push
 * it to the recipient's socket in real time.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO } = require('../socket');

/**
 * Emit an event to a single user's private Socket.IO room.
 * @param {string} username
 * @param {string} event
 * @param {*}      payload
 */
const notifyUser = (username, event, payload) => {
    try { getIO().to(`user:${username}`).emit(event, payload); } catch (e) { /* socket not ready */ }
};

/**
 * JWT authentication middleware. Verifies the `x-auth-token` header, loads
 * the user, and populates `req.user.id` + `req.username`.
 *
 * @param   {import('express').Request}  req
 * @param   {import('express').Response} res
 * @param   {import('express').NextFunction} next
 */
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            // Same 401 message the auth.js middleware uses, so the frontend
            // 401 interceptor can clear the stale JWT and bounce the user
            // back to /auth.
            return res.status(401).json({ message: 'User no longer exists. Please log in again.' });
        }
        req.user = { id: user._id.toString() };
        req.username = user.username;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

/**
 * @route   GET /api/notifications
 * @desc    Return the 50 most recent notifications for the current user,
 *          newest first.
 * @access  Private
 * @returns {200} Array of Notification documents
 */
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

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Quick count of unread notifications — polled by the navbar
 *          bell badge so the count can refresh without a full list fetch.
 * @access  Private
 * @returns {200} { count: number }
 */
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

/**
 * @route   PUT /api/notifications/mark-read
 * @desc    Mark every notification belonging to the current user as read.
 * @access  Private
 * @returns {200} { success: true }
 */
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

/**
 * Create a new notification, save it, AND push it to the recipient via
 * Socket.IO. Used by posts/likes/comments/shares, follow, and messages.
 *
 * @param   {string}  recipient   Recipient username
 * @param   {string}  sender      Username of the actor (the one who liked/followed/...)
 * @param   {('like'|'comment'|'share'|'follow'|'message')} type
 * @param   {string}  message     Human-readable copy
 * @param   {import('mongoose').Types.ObjectId|null} [postId]
 * @returns {Promise<import('../models/Notification').NotificationDoc|null>}
 */
const createNotification = async (recipient, sender, type, message, postId = null) => {
    if (recipient === sender) return null; // Don't notify yourself
    try {
        const notification = new Notification({
            recipient, sender, type, message, postId
        });
        await notification.save();
        // Real-time: push the new notification to the recipient
        notifyUser(recipient, 'notification:new', notification);
        return notification;
    } catch (err) {
        console.error('Notification error:', err);
        return null;
    }
};

module.exports = { router, createNotification };
