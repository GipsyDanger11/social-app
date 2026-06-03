/**
 * @file Post CRUD + interaction routes.
 * @description Mounted at `/api/posts`. Provides:
 *   - Paginated, sortable feed (latest / most-liked / most-commented / most-shared)
 *   - Text search across post body and author username
 *   - Post CRUD with ownership checks
 *   - Like / share / comment interactions, each emitting a Socket.IO
 *     event so every connected client sees the change in real time
 *   - Per-user profile timeline + profile metadata
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const User = require('../models/User');
const { createNotification } = require('./notifications');
const { getIO } = require('../socket');

/**
 * Broadcast an event to ALL connected Socket.IO clients.
 * @param {string} event
 * @param {*}      payload
 */
const broadcast = (event, payload) => {
    try { getIO().emit(event, payload); } catch (e) { /* socket not ready */ }
};

/**
 * Emit an event to a single user's private room.
 * @param {string} username
 * @param {string} event
 * @param {*}      payload
 */
const notifyUser = (username, event, payload) => {
    try { getIO().to(`user:${username}`).emit(event, payload); } catch (e) { /* socket not ready */ }
};

/**
 * JWT authentication middleware. Verifies the `x-auth-token` header, loads
 * the corresponding user, and populates `req.user.id` + `req.username`.
 *
 * @param   {import('express').Request}  req
 * @param   {import('express').Response} res
 * @param   {import('express').NextFunction} next
 */
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

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
        res.status(401).json({ message: 'Token is not valid' });
    }
};

/**
 * @route   GET /api/posts
 * @desc    Paginated feed with sortable views.
 * @access  Public (the feed is public-readable)
 * @param   {number} [req.query.page=1]     1-based page number
 * @param   {number} [req.query.limit=10]   Page size
 * @param   {('all'|'most-liked'|'most-commented'|'most-shared')} [req.query.filter=all]
 * @returns {200} { posts, currentPage, totalPages, totalPosts }
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const filter = req.query.filter || 'all';

        let sortQuery = { createdAt: -1 };
        if (filter === 'most-liked') sortQuery = { likesCount: -1, createdAt: -1 };
        if (filter === 'most-commented') sortQuery = { commentsCount: -1, createdAt: -1 };
        if (filter === 'most-shared') sortQuery = { sharesCount: -1, createdAt: -1 };

        // We use aggregation to count likes/comments if needed, or simple find
        let posts;
        if (filter === 'most-liked' || filter === 'most-commented' || filter === 'most-shared') {
            posts = await Post.aggregate([
                {
                    $addFields: {
                        likesCount: { $size: "$likes" },
                        commentsCount: { $size: "$comments" },
                        sharesCount: { $size: "$shares" }
                    }
                },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'author'
                    }
                },
                { $unwind: '$author' },
                {
                    $project: {
                        'author.password': 0,
                        'author.email': 0
                    }
                }
            ]);
        } else {
            posts = await Post.find()
                .sort(sortQuery)
                .skip(skip)
                .limit(limit)
                .populate('author', 'username avatar');
        }

        const total = await Post.countDocuments();

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   GET /api/posts/search?q=query
 * @desc    Case-insensitive text search across post body and author username.
 * @access  Public
 * @param   {string} req.query.q   Search term
 * @returns {200} Up to 20 matching posts
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const posts = await Post.find({
            $or: [
                { content: { $regex: query, $options: 'i' } },
                { authorUsername: { $regex: query, $options: 'i' } }
            ]
        }).limit(20).populate('author', 'username avatar');

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   POST /api/posts
 * @desc    Create a new post (regular or `promotion`).
 *          Broadcasts a `post:new` event to all connected clients.
 * @access  Private
 * @param   {string} req.body.content
 * @param   {string} [req.body.imageUrl]   Absolute URL or `/uploads/...` path
 * @param   {('post'|'promotion')} [req.body.type='post']
 * @returns {201} The newly-created post, populated with author info
 */
router.post('/', auth, async (req, res) => {
    try {
        const { content, imageUrl, type } = req.body;

        // The brief says: "Both fields should not be mandatory (either one
        // is enough)." So text-only, image-only, and text+image are all
        // valid — but the post must have AT LEAST ONE of the two.
        const trimmedContent = typeof content === 'string' ? content.trim() : '';
        const trimmedImage   = typeof imageUrl === 'string' ? imageUrl.trim() : '';
        if (!trimmedContent && !trimmedImage) {
            return res.status(400).json({ message: 'A post must have either text or an image.' });
        }

        const newPost = new Post({
            content: trimmedContent,
            imageUrl: trimmedImage,
            type: type || 'post',
            author: req.user.id,
            authorUsername: req.username
        });

        const post = await newPost.save();
        const populatedPost = await Post.findById(post._id).populate('author', 'username avatar');

        // Real-time: broadcast new post to everyone
        broadcast('post:new', populatedPost);

        res.status(201).json(populatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   POST /api/posts/:id/like
 * @desc    Toggle a like on a post. Sends a `like` notification on the
 *          new-like edge and broadcasts `post:like` to all clients.
 * @access  Private
 * @param   {string} req.params.id   Post ObjectId
 * @returns {200} Updated `likes` array
 */
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check if already liked
        const index = post.likes.indexOf(req.username);
        let action;
        if (index > -1) {
            // Unlike
            post.likes.splice(index, 1);
            action = 'unlike';
        } else {
            // Like
            post.likes.push(req.username);
            action = 'like';
            // Send notification
            await createNotification(
                post.authorUsername,
                req.username,
                'like',
                `${req.username} liked your post`,
                post._id
            );
        }

        await post.save();

        // Real-time: broadcast like update to everyone
        broadcast('post:like', {
            postId: post._id.toString(),
            likes: post.likes,
            action,
            by: req.username,
        });

        res.json(post.likes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   POST /api/posts/:id/share
 * @desc    Record a share by the current user (idempotent — sharing twice
 *          is a no-op). Sends a `share` notification + `post:share` event.
 * @access  Private
 * @param   {string} req.params.id   Post ObjectId
 * @returns {200} Updated `shares` array
 */
router.post('/:id/share', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (!post.shares.includes(req.username)) {
            post.shares.push(req.username);
            await createNotification(
                post.authorUsername,
                req.username,
                'share',
                `${req.username} shared your post`,
                post._id
            );
            await post.save();

            // Real-time: broadcast share update
            broadcast('post:share', {
                postId: post._id.toString(),
                shares: post.shares,
                by: req.username,
            });
        }

        res.json(post.shares);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   POST /api/posts/:id/comment
 * @desc    Append a comment to the post. Sends a `comment` notification
 *          and broadcasts `post:comment` to every connected client.
 * @access  Private
 * @param   {string} req.params.id   Post ObjectId
 * @param   {string} req.body.text   Comment body
 * @returns {200} Updated `comments` array (newest first)
 */
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const newComment = {
            username: req.username,
            text,
            createdAt: new Date()
        };

        post.comments.unshift(newComment);
        await post.save();

        // Send notification
        await createNotification(
            post.authorUsername,
            req.username,
            'comment',
            `${req.username} commented on your post`,
            post._id
        );

        // Real-time: broadcast new comment to everyone
        broadcast('post:comment', {
            postId: post._id.toString(),
            comment: newComment,
            commentsCount: post.comments.length,
        });

        res.json(post.comments);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   PUT /api/posts/:id
 * @desc    Edit the body / image of a post. Owner-only.
 * @access  Private
 * @param   {string} req.params.id    Post ObjectId
 * @param   {string} [req.body.content]
 * @param   {string} [req.body.imageUrl]
 * @returns {200} Updated post (populated)
 */
router.put('/:id', auth, async (req, res) => {
    try {
        let post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check ownership
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const { content, imageUrl } = req.body;
        post.content = content || post.content;
        post.imageUrl = imageUrl !== undefined ? imageUrl : post.imageUrl;

        await post.save();
        const updatedPost = await Post.findById(post._id).populate('author', 'username avatar');
        res.json(updatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a post. Owner-only. Broadcasts `post:delete` so all
 *          connected clients remove the post from their in-memory feed.
 * @access  Private
 * @param   {string} req.params.id   Post ObjectId
 * @returns {200} { message: "Post removed" }
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check ownership
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await post.deleteOne();

        // Real-time: broadcast delete to everyone
        broadcast('post:delete', { postId: req.params.id });

        res.json({ message: 'Post removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   GET /api/posts/user/:username
 * @desc    Return every post authored by the given username, newest first.
 *          Used by the profile page.
 * @access  Public
 * @param   {string} req.params.username
 * @returns {200} Array of post documents
 */
router.get('/user/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const posts = await Post.find({ author: user._id })
            .sort({ createdAt: -1 })
            .populate('author', 'username avatar');

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * @route   GET /api/posts/profile/:username
 * @desc    Return a user's public profile (no password). Used by the
 *          profile header.
 * @access  Public
 * @param   {string} req.params.username
 * @returns {200} User document
 */
router.get('/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
