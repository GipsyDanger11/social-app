const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const PostSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorUsername: {
        type: String,
        required: true
    },
    likes: [{
        type: String // Array of usernames who liked
    }],
    comments: [CommentSchema],
    type: {
        type: String,
        enum: ['post', 'promotion'],
        default: 'post'
    }
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
