const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const User = require('../models/User');

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

// GET /api/posts?page=1&limit=10
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'username avatar');

        const total = await Post.countDocuments();

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
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
        if (index > -1) {
            // Unlike
            post.likes.splice(index, 1);
        } else {
            // Like
            post.likes.push(req.username);
        }

        await post.save();
        res.json(post.likes);
    } catch (err) {
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
