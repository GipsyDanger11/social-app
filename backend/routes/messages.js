const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const { createNotification } = require('./notifications');
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

// GET /api/messages/conversations
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

// GET /api/messages/:username
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

// POST /api/messages
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

// GET /api/messages/users/all - Get all users to chat with
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
