/**
 * @file Task + leaderboard routes.
 * @description Mounted at `/api/tasks`. Provides:
 *   - Full CRUD over the current user's tasks
 *   - Real-time events (`task:new` / `task:update` / `task:delete`)
 *   - A MongoDB-aggregation-powered leaderboard that ranks users by
 *     count of completed tasks
 *
 * Every create / update / delete that affects the leaderboard emits a
 * `leaderboard:update` event so connected leaderboard views refresh live.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
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
 * Broadcast an event to every connected client.
 * @param {string} event
 * @param {*}      payload
 */
const broadcast = (event, payload) => {
    try { getIO().emit(event, payload); } catch (e) { /* socket not ready */ }
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
        req.user = decoded;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        req.username = user.username;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

/**
 * @route   GET /api/tasks
 * @desc    List every task owned by the current user, newest first.
 * @access  Private
 * @returns {200} Array of Task documents
 */
router.get('/', auth, async (req, res) => {
    try {
        const tasks = await Task.find({ author: req.username }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task for the current user. Emits `task:new` to the
 *          owner's socket room.
 * @access  Private
 * @param   {string}      req.body.title
 * @param   {string}      [req.body.description]
 * @param   {TaskStatus}  [req.body.status='todo']
 * @param   {TaskPriority}[req.body.priority='medium']
 * @param   {string}      [req.body.dueDate]   ISO-8601 date string
 * @returns {201} The newly-created task
 */
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

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update an existing task. Owner-only. Emits `task:update` to the
 *          owner and, if status changed to/from `completed`, broadcasts
 *          a `leaderboard:update` so the rankings refresh.
 * @access  Private
 * @param   {string} req.params.id
 * @returns {200} Updated task
 */
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

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task. Owner-only. Emits `task:delete` to the owner and
 *          `leaderboard:update` so rankings refresh.
 * @access  Private
 * @param   {string} req.params.id
 * @returns {200} { message: "Task removed" }
 */
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

/**
 * @route   GET /api/tasks/leaderboard/all
 * @desc    Top-10 leaderboard: groups all completed tasks by author,
 *          sorts by count, and enriches with the user's avatar. Public —
 *          the leaderboard is shown to every visitor.
 * @access  Public
 * @returns {200} Array of `{ username, completedTasks, avatar }`
 */
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
