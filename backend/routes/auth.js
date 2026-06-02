const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getIO, isUserOnline, getOnlineUsers } = require('../socket');

const notifyUser = (username, event, payload) => {
    try { getIO().to(`user:${username}`).emit(event, payload); } catch (e) { /* socket not ready */ }
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Create JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Create JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/auth/me (Get current user)
const authMiddleware = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /api/auth/profile (Update profile)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { username, bio, avatar, coverImage } = req.body;
        const user = await User.findById(req.user.id);
        
        if (username) user.username = username;
        if (bio !== undefined) user.bio = bio;
        if (avatar) user.avatar = avatar;
        if (coverImage) user.coverImage = coverImage;

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/auth/follow/:username
router.post('/follow/:username', authMiddleware, async (req, res) => {
    try {
        const userToFollow = await User.findOne({ username: req.params.username });
        const currentUser = await User.findById(req.user.id);

        if (!userToFollow) return res.status(404).json({ message: 'User not found' });
        if (userToFollow.username === currentUser.username) {
            return res.status(400).json({ message: 'Cannot follow yourself' });
        }

        const isFollowing = currentUser.following.includes(userToFollow.username);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(u => u !== userToFollow.username);
            userToFollow.followers = userToFollow.followers.filter(u => u !== currentUser.username);
        } else {
            // Follow
            currentUser.following.push(userToFollow.username);
            userToFollow.followers.push(currentUser.username);

            // Send follow notification
            try {
                const { createNotification } = require('./notifications');
                await createNotification(
                    userToFollow.username,
                    currentUser.username,
                    'follow',
                    `${currentUser.username} started following you`,
                    null
                );
            } catch (e) { /* notification is optional */ }
        }

        await currentUser.save();
        await userToFollow.save();

        // Real-time: notify the affected user, and broadcast follow update
        const payload = {
            by: currentUser.username,
            target: userToFollow.username,
            followersCount: userToFollow.followers.length,
            followingCount: currentUser.following.length,
            followers: userToFollow.followers,
            following: currentUser.following,
            action: isFollowing ? 'unfollow' : 'follow',
        };
        notifyUser(userToFollow.username, 'user:follow', payload);
        notifyUser(currentUser.username, 'user:follow', payload);

        res.json({ following: currentUser.following });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/auth/suggested-users - users to suggest in the right sidebar
router.get('/suggested-users', authMiddleware, async (req, res) => {
    try {
        const me = await User.findById(req.user.id);
        if (!me) return res.status(404).json({ message: 'User not found' });

        // Suggest users that I'm not following
        const users = await User.find({
            username: { $ne: me.username, $nin: me.following }
        })
            .select('username avatar bio followers following')
            .limit(8);

        // Add online status
        const enriched = users.map(u => ({
            ...u.toObject(),
            isOnline: isUserOnline(u.username),
        }));

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/auth/online-users - who is online right now
router.get('/online-users', authMiddleware, async (req, res) => {
    try {
        res.json({ onlineUsers: getOnlineUsers() });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/auth/search-users?q=query - search users
router.get('/search-users', authMiddleware, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json([]);
        const users = await User.find({
            username: { $regex: q, $options: 'i' }
        })
            .select('username avatar bio')
            .limit(15);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
