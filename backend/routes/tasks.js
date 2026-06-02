const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
const User = require('../models/User');
const { getIO } = require('../socket');

const notifyUser = (username, event, payload) => {
    try { getIO().to(`user:${username}`).emit(event, payload); } catch (e) { /* socket not ready */ }
};
const broadcast = (event, payload) => {
    try { getIO().emit(event, payload); } catch (e) { /* socket not ready */ }
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

// GET /api/tasks
router.get('/', auth, async (req, res) => {
    try {
        const tasks = await Task.find({ author: req.username }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, status, priority, dueDate } = req.body;
        const task = new Task({
            title,
            description,
            status: status || 'todo',
            priority: priority || 'medium',
            dueDate,
            author: req.username
        });
        await task.save();
        // Real-time: notify owner
        notifyUser(req.username, 'task:new', task);
        res.status(201).json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        if (task.author !== req.username) return res.status(401).json({ message: 'Not authorized' });

        const { title, description, status, priority, dueDate } = req.body;
        if (title) task.title = title;
        if (description !== undefined) task.description = description;
        if (status) task.status = status;
        if (priority) task.priority = priority;
        if (dueDate !== undefined) task.dueDate = dueDate;

        await task.save();
        // Real-time: broadcast leaderboard-relevant updates (e.g., completed task)
        if (status === 'completed' || task.status === 'completed') {
            broadcast('leaderboard:update', { username: req.username });
        }
        notifyUser(req.username, 'task:update', task);
        res.json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        if (task.author !== req.username) return res.status(401).json({ message: 'Not authorized' });

        await task.deleteOne();
        // Real-time
        notifyUser(req.username, 'task:delete', { id: req.params.id });
        broadcast('leaderboard:update', { username: req.username });
        res.json({ message: 'Task removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/tasks/leaderboard
router.get('/leaderboard/all', async (req, res) => {
    try {
        // Aggregate users by completed task count
        const leaderboard = await Task.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: '$author',
                    completedTasks: { $sum: 1 }
                }
            },
            { $sort: { completedTasks: -1 } },
            { $limit: 10 }
        ]);

        // Enrich with user data
        const enriched = await Promise.all(leaderboard.map(async (entry) => {
            const user = await User.findOne({ username: entry._id }).select('username avatar');
            return {
                username: entry._id,
                completedTasks: entry.completedTasks,
                avatar: user?.avatar
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
