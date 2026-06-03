/**
 * @file Authentication & user-management routes.
 * @description Mounted at `/api/auth`. Provides:
 *   - Sign up / log in / current-user / profile update
 *   - Follow / unfollow
 *   - User discovery (suggestions, online list, search)
 *   - Full password-reset flow (forgot-password → reset-token → reset-password)
 *
 *  Authenticated endpoints require a JWT in the `x-auth-token` header.
 *  The token is produced by `/signup` and `/login` and expires after 7 days.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { getIO, isUserOnline, getOnlineUsers } = require('../socket');
const { sendPasswordResetEmail } = require('../utils/mailer');

/**
 * Safely emit an event to a single user's private room (`user:<username>`).
 * Wrapped in try/catch so the request flow isn't broken when the Socket.IO
 * server is not yet initialised (e.g. during boot or unit tests).
 *
 * @param {string} username  Recipient username
 * @param {string} event     Event name to emit
 * @param {*}      payload   Serializable payload
 */
const notifyUser = (username, event, payload) => {
    try { getIO().to(`user:${username}`).emit(event, payload); } catch (e) { /* socket not ready */ }
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user and return a fresh JWT + minimal user profile.
 * @access  Public
 * @param   {string} req.body.username
 * @param   {string} req.body.email
 * @param   {string} req.body.password  Minimum 6 chars (enforced by the client).
 * @returns {201} { token, user: { id, username, email, avatar } }
 * @returns {400} { message: "User already exists" }
 */
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

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate by email + password and return a fresh JWT.
 * @access  Public
 * @param   {string} req.body.email
 * @param   {string} req.body.password
 * @returns {200} { token, user: { id, username, email, avatar } }
 * @returns {400} { message: "Invalid Credentials" }
 */
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

/**
 * JWT-based authentication middleware. Populates `req.user = { id }` and
 * forwards to the next handler. Used by every authenticated route below.
 *
 * @param   {import('express').Request}  req
 * @param   {import('express').Response} res
 * @param   {import('express').NextFunction} next
 * @returns {void}
 */
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

/**
 * @route   GET /api/auth/me
 * @desc    Get the currently authenticated user (without the password hash).
 * @access  Private
 * @returns {200} User document (minus `password`)
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update editable fields on the current user's profile.
 * @access  Private
 * @param   {string} [req.body.username]    New display name
 * @param   {string} [req.body.bio]         New bio
 * @param   {string} [req.body.avatar]      New avatar URL (from /uploads or external)
 * @param   {string} [req.body.coverImage]  New cover image URL
 * @returns {200} Updated user document
 */
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

/**
 * @route   POST /api/auth/follow/:username
 * @desc    Toggle follow / unfollow for the user identified by `:username`.
 *          Sends a `follow` notification on the new-follow edge and emits
 *          a `user:follow` socket event to both users in real time.
 * @access  Private
 * @param   {string} req.params.username
 * @returns {200} { following: string[] }   The current user's updated following list.
 */
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

/**
 * @route   GET /api/auth/suggested-users
 * @desc    List up to 8 users that the current user is not following, with
 *          online status. Powers the "Who to follow" sidebar widget.
 * @access  Private
 * @returns {200} Array of suggested user documents with `isOnline` boolean
 */
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

/**
 * @route   GET /api/auth/online-users
 * @desc    Return the current list of online usernames (maintained by Socket.IO).
 * @access  Private
 * @returns {200} { onlineUsers: string[] }
 */
router.get('/online-users', authMiddleware, async (req, res) => {
    try {
        res.json({ onlineUsers: getOnlineUsers() });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   GET /api/auth/search-users?q=query
 * @desc    Case-insensitive prefix search across usernames. Used by the
 *          top-bar @mention and search dropdowns.
 * @access  Private
 * @param   {string} req.query.q   Search term (required)
 * @returns {200} Up to 15 matching user documents
 */
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
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

/* ------------------------------------------------------------------ *
 *  PASSWORD RESET FLOW
 *  ----------------------------------------------------------------
 *  POST /api/auth/forgot-password   { email }   -> send reset email
 *  GET  /api/auth/reset-token/:token            -> validate token
 *  POST /api/auth/reset-password    { token, newPassword }
 * ------------------------------------------------------------------ */

/**
 * Generate a cryptographically secure random token (32 bytes -> 64 hex chars).
 * @returns {string}
 */
const generateResetToken = () => crypto.randomBytes(32).toString('hex');

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request a password-reset email. Always responds with a generic
 *          message to avoid leaking which emails are registered. If the
 *          user exists, a single-use 1-hour token is saved and a reset
 *          email is dispatched via SMTP (or logged + returned in dev).
 * @access  Public
 * @param   {string} req.body.email
 * @returns {200} { message, devResetUrl? }   `devResetUrl` only when SMTP is not configured.
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // Always respond 200 even when the user doesn't exist (prevents enumeration)
        if (!user) {
            return res.json({ message: 'If that email is registered, a reset link has been sent.' });
        }

        const token = generateResetToken();
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        // Build the reset URL. In production it's the deployed frontend URL.
        const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const resetUrl = `${frontendBase}/reset-password?token=${token}`;

        const result = await sendPasswordResetEmail({
            to: user.email,
            username: user.username,
            resetUrl,
        });

        // In dev (no SMTP), return the URL so the UI can show a "click here" link
        if (!result.delivered && result.preview) {
            return res.json({
                message: 'If that email is registered, a reset link has been sent.',
                devResetUrl: result.preview,
            });
        }

        res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (err) {
        console.error('forgot-password error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   GET /api/auth/reset-token/:token
 * @desc    Validate a password-reset token (used by the frontend to decide
 *          whether to show the "new password" form or an error).
 * @access  Public
 * @param   {string} req.params.token
 * @returns {200} { valid: true, username, email }
 * @returns {400} { message: "Invalid or expired reset link" }
 */
router.get('/reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() },
        }).select('username email');
        if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' });
        res.json({ valid: true, username: user.username, email: user.email });
    } catch (err) {
        console.error('reset-token error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Set a new password using a valid token. The token is
 *          invalidated atomically with the password update.
 * @access  Public
 * @param   {string} req.body.token         Single-use reset token
 * @param   {string} req.body.newPassword   New password (min 6 chars)
 * @returns {200} { message: "Password updated successfully. You can now log in." }
 * @returns {400} { message }   Validation or token-expiry error
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required' });
        if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' });

        // Hash the new password and clear the reset token in a single write
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({ message: 'Password updated successfully. You can now log in.' });
    } catch (err) {
        console.error('reset-password error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
