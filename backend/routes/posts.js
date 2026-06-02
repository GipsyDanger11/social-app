const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const User = require('../models/User');
const { createNotification } = require('./notifications');
const { getIO } = require('../socket');

// Helper: broadcast helper
const broadcast = (event, payload) => {
    try { getIO().emit(event, payload); } catch (e) { /* socket not ready */ }
};
const notifyUser = (username, event, payload) => {
    try { getIO().to(`user:${username}`).emit(event, payload); } catch (e) { /* socket not ready */ }
};

// Middleware to verify JWT
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        req.username = user.username;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// GET /api/posts?page=1&limit=10&filter=all
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

// GET /api/posts/search?q=query
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

// POST /api/posts
router.post('/', auth, async (req, res) => {
    try {
        const { content, imageUrl, type } = req.body;
        const newPost = new Post({
            content,
            imageUrl,
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

// POST /api/posts/:id/like
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

// POST /api/posts/:id/share
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

// POST /api/posts/:id/comment
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

// PUT /api/posts/:id (Edit Post)
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

// DELETE /api/posts/:id (Delete Post)
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

// GET /api/posts/user/:username (for Profile page)
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

// GET /api/users/:username (for Profile metadata)
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
