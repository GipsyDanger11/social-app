/**
 * @file User Mongoose model.
 * @description Defines the schema for a Social App account. Stores
 *              authentication credentials (hashed), profile fields, the
 *              follow/follower graph (as plain username strings, not
 *              ObjectId references — keeps the graph cheap to read and
 *              write), and a short-lived password-reset token.
 */

const mongoose = require('mongoose');

/**
 * @typedef {Object} UserDoc
 * @property {string}   username         Unique, URL-safe handle (e.g. "janedoe").
 * @property {string}   email            Unique, lowercased email address.
 * @property {string}   password         bcrypt hash — never return this to the client.
 * @property {string}   [avatar]         Public URL of the profile picture.
 * @property {string}   [coverImage]     Public URL of the cover/banner image.
 * @property {string}   [bio]            Short profile blurb (markdown allowed).
 * @property {string[]} [followers]      Usernames of accounts following THIS user.
 * @property {string[]} [following]      Usernames this user is following.
 * @property {string|null} [resetPasswordToken]   Single-use token for password reset (1h TTL).
 * @property {Date|null}   [resetPasswordExpires] Expiry of the reset token.
 * @property {Date}        [joinedDate]   When the account was created.
 * @property {Date}        createdAt      Auto-managed by Mongoose timestamps.
 * @property {Date}        updatedAt      Auto-managed by Mongoose timestamps.
 */

/**
 * Mongoose schema for the `users` collection.
 * @type {import('mongoose').Schema<UserDoc>}
 */
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
    /** Array of usernames that follow this user. Stored as plain strings (not ObjectIds)
     *  so follow/unfollow operations are O(1) without an extra DB round-trip. */
    followers: [{ type: String }],
    /** Array of usernames this user is following. */
    following: [{ type: String }],
    /** Cryptographically random token emailed to the user during the reset flow. */
    resetPasswordToken: { type: String, default: null },
    /** Expiry timestamp for the reset token (1 hour after generation). */
    resetPasswordExpires: { type: Date, default: null },
    joinedDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

/**
 * The compiled User model. Use this to query / mutate the `users` collection.
 * @type {import('mongoose').Model<UserDoc>}
 */
module.exports = mongoose.model('User', UserSchema);
