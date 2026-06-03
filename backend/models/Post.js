/**
 * @file Post Mongoose model.
 * @description Defines the schema for a user-generated post in the feed.
 *              Posts may have an image (either an absolute URL or a
 *              relative `/uploads/...` path returned by the upload route),
 *              a list of likers/sharers (as plain username strings), and
 *              an embedded array of comments.
 */

const mongoose = require('mongoose');

/**
 * @typedef {Object} CommentDoc
 * @property {string} username   Username of the comment author.
 * @property {string} text       Comment body (plain text).
 * @property {Date}   createdAt  When the comment was posted.
 */

/**
 * @typedef {Object} PostDoc
 * @property {string}   content          Post body (plain text or light markdown).
 * @property {string}   [imageUrl]       Absolute URL or `/uploads/...` path.
 * @property {import('mongoose').Types.ObjectId} author   Reference to the User who created the post.
 * @property {string}   authorUsername   Denormalised username (lets us render the feed
 *                                       without a join in the hot path).
 * @property {string[]} [likes]          Usernames that liked the post.
 * @property {string[]} [shares]         Usernames that shared the post.
 * @property {CommentDoc[]} [comments]   Embedded comment documents.
 * @property {'post'|'promotion'} [type] `promotion` is a paid/boosted post; default `post`.
 * @property {Date}     createdAt        Auto-managed by Mongoose timestamps.
 * @property {Date}     updatedAt        Auto-managed by Mongoose timestamps.
 */

/**
 * Embedded comment sub-schema. Comments live inside their parent post so
 * a single `find` returns the full thread.
 * @type {import('mongoose').Schema<CommentDoc>}
 */
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

/**
 * Mongoose schema for the `posts` collection.
 * @type {import('mongoose').Schema<PostDoc>}
 */
const PostSchema = new mongoose.Schema({
    /**
     * Post body. Optional on its own — a post is valid as long as EITHER
     * `content` or `imageUrl` is present. The check that enforces "one of
     * the two must be set" lives in `routes/posts.js#POST /` (schema-level
     * `required: true` on an empty string is awkward in Mongoose).
     */
    content: {
        type: String,
        default: ''
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
    /** Usernames that liked the post. Stored as plain strings for O(1) toggling. */
    likes: [{
        type: String
    }],
    /** Usernames that shared the post. */
    shares: [{
        type: String
    }],
    /** Embedded comments — kept inline to avoid an extra query on the feed. */
    comments: [CommentSchema],
    type: {
        type: String,
        enum: ['post', 'promotion'],
        default: 'post'
    }
}, { timestamps: true });

/**
 * The compiled Post model.
 * @type {import('mongoose').Model<PostDoc>}
 */
module.exports = mongoose.model('Post', PostSchema);
