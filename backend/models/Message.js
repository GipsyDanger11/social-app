/**
 * @file Message Mongoose model.
 * @description A direct (1-to-1, not group) message between two users. The
 *              `sender` and `receiver` fields are plain usernames — this
 *              keeps the schema flat and the queries fast. A compound
 *              index on `(sender, receiver, createdAt)` powers the
 *              per-conversation timeline query in `routes/messages.js`.
 */

const mongoose = require('mongoose');

/**
 * @typedef {Object} MessageDoc
 * @property {string}   sender     Username of the author.
 * @property {string}   receiver   Username of the recipient.
 * @property {string}   text       Plain-text message body.
 * @property {boolean}  [read]     Whether the recipient has read it yet.
 * @property {Date}     createdAt  Auto-managed by Mongoose timestamps.
 * @property {Date}     updatedAt  Auto-managed by Mongoose timestamps.
 */

/**
 * Mongoose schema for the `messages` collection.
 * @type {import('mongoose').Schema<MessageDoc>}
 */
const MessageSchema = new mongoose.Schema({
    sender: {
        type: String, // username
        required: true
    },
    receiver: {
        type: String, // username
        required: true
    },
    text: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

/**
 * Compound index that supports the per-conversation query in
 * `routes/messages.js`:
 *   find({ $or: [{sender:A,receiver:B}, {sender:B,receiver:A}] })
 *        .sort({ createdAt: -1 })
 * @type {number}
 */
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

/**
 * The compiled Message model.
 * @type {import('mongoose').Model<MessageDoc>}
 */
module.exports = mongoose.model('Message', MessageSchema);
