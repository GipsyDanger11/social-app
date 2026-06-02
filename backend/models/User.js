const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    },
    coverImage: {
        type: String,
        default: 'https://via.placeholder.com/1500x500/cccccc/ffffff?text=Social+App'
    },
    bio: {
        type: String,
        default: ''
    },
    followers: [{ type: String }], // Array of usernames
    following: [{ type: String }], // Array of usernames
    points: {
        type: Number,
        default: 0
    },
    rank: {
        type: Number,
        default: 1
    },
    joinedDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
