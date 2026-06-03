/**
 * @file Direct messaging routes.
 * @description Mounted at `/api/messages`. Provides:
 *   - Per-conversation timeline (`GET /api/messages/:username`)
 *   - Per-user conversation list (`GET /api/messages/conversations`)
 *   - Sending a new message + Socket.IO push to the recipient
 *   - Browseable user list to start new conversations
 *
 * Real-time delivery: every POST also emits a `message:new` event to the
 * recipient's private room AND to the shared chat room so any open chat
 * tab sees the message instantly.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const { createNotification } = require('./notifications');
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
 * @route   GET /api/messages/conversations
 * @desc    Build a list of conversation partners, each with the most
 *          recent message exchanged. Used to render the chat sidebar.
 * @access  Private
 * @returns {200} Array of `{ partner, lastMessage }`
 */
router.get('/conversations', auth, async (req, res) => {
    try {
        // Get all messages involving the current user
        const messages = await Message.find({
            $or: [{ sender: req.username }, { receiver: req.username }]
        }).sort({ createdAt: -1 });

        // Extract unique conversation partners
        const conversationsMap = new Map();
        messages.forEach(msg => {
            const partner = msg.sender === req.username ? msg.receiver : msg.sender;
            if (!conversationsMap.has(partner)) {
                conversationsMap.set(partner, msg);
            }
        });

        const conversations = Array.from(conversationsMap.entries()).map(([partner, lastMessage]) => ({
            partner,
            lastMessage
        }));

        res.json(conversations);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   GET /api/messages/:username
 * @desc    Return the full message history between the current user and
 *          `:username`, oldest first. Also marks the partner's messages
 *          as read in the same call.
 * @access  Private
 * @param   {string} req.params.username
 * @returns {200} Array of Message documents
 */
router.get('/:username', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.username, receiver: req.params.username },
                { sender: req.params.username, receiver: req.username }
            ]
        }).sort({ createdAt: 1 });

        // Mark messages from this user as read
        await Message.updateMany(
            { sender: req.params.username, receiver: req.username, read: false },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   POST /api/messages
 * @desc    Send a direct message. Persists the message, creates a
 *          `message` notification for the recipient, and emits
 *          `message:new` to the shared chat room + the recipient's
 *          private room.
 * @access  Private
 * @param   {string} req.body.receiver  Recipient username
 * @param   {string} req.body.text      Message body
 * @returns {201} The persisted Message document
 */
router.post('/', auth, async (req, res) => {
    try {
        const { receiver, text } = req.body;
        const message = new Message({
            sender: req.username,
            receiver,
            text
        });
        await message.save();

        // Create notification
        await createNotification(
            receiver,
            req.username,
            'message',
            `${req.username} sent you a message`,
            null
        );

        // Real-time: notify receiver (and sender's other tabs) of the new message
        const chatRoom = `chat:${[req.username, receiver].sort().join(':')}`;
        try { getIO().to(chatRoom).emit('message:new', message); } catch (e) { /* socket not ready */ }
        notifyUser(receiver, 'message:new', message);

        res.status(201).json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   GET /api/messages/users/all
 * @desc    List up to 50 users (other than the current user) to start a
 *          new conversation with. Powers the "new chat" picker.
 * @access  Private
 * @returns {200} Array of `{ username, avatar }`
 */
router.get('/users/all', auth, async (req, res) => {
    try {
        const users = await User.find({
            username: { $ne: req.username }
        }).select('username avatar').limit(50);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
