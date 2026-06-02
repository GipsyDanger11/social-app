const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: String, // username of person receiving notification
        required: true
    },
    sender: {
        type: String, // username of person who triggered the notification
        required: true
    },
    type: {
        type: String,
        enum: ['like', 'comment', 'share', 'follow', 'message'],
        required: true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        default: null
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
