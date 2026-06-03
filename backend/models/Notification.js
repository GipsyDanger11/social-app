/**
 * @file Notification Mongoose model.
 * @description A user-facing notification ("@alice liked your post",
 *              "@bob started following you", etc.). Created by the
 *              `createNotification` helper in `routes/notifications.js`
 *              and pushed to the recipient in real time via Socket.IO.
 */

const mongoose = require('mongoose');

/**
 * @typedef {('like'|'comment'|'share'|'follow'|'message')} NotificationType
 */

/**
 * @typedef {Object} NotificationDoc
 * @property {string}                       recipient  Username that receives the notification.
 * @property {string}                       sender     Username that triggered it.
 * @property {NotificationType}             type       Category — drives the icon in the UI.
 * @property {import('mongoose').Types.ObjectId} [postId] Reference to the related post (optional).
 * @property {string}                       message    Human-readable copy ("alice liked your post").
 * @property {boolean}                      [read]     Whether the recipient has dismissed it.
 * @property {Date}                         createdAt  Auto-managed by Mongoose timestamps.
 * @property {Date}                         updatedAt  Auto-managed by Mongoose timestamps.
 */

/**
 * Mongoose schema for the `notifications` collection.
 * @type {import('mongoose').Schema<NotificationDoc>}
 */
const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true
    },
    sender: {
        type: String,
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

/**
 * The compiled Notification model.
 * @type {import('mongoose').Model<NotificationDoc>}
 */
module.exports = mongoose.model('Notification', NotificationSchema);
