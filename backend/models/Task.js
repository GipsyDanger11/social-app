/**
 * @file Task Mongoose model.
 * @description Defines the schema for a single to-do item that drives the
 *              Tasks page AND the global leaderboard. The leaderboard
 *              aggregates on `status === 'completed'` and groups by
 *              `author` (a username string) — see `routes/tasks.js`.
 */

const mongoose = require('mongoose');

/**
 * @typedef {('todo'|'in-progress'|'completed')} TaskStatus
 */

/**
 * @typedef {('low'|'medium'|'high')} TaskPriority
 */

/**
 * @typedef {Object} TaskDoc
 * @property {string}      title        Short, single-line task name (required).
 * @property {string}      [description] Longer details, multi-line allowed.
 * @property {TaskStatus}  [status]     One of `todo` / `in-progress` / `completed`.
 * @property {TaskPriority}[priority]   One of `low` / `medium` / `high`.
 * @property {string}      author       Username of the task owner (FK by username, not _id).
 * @property {Date|null}   [dueDate]    Optional due date; null when unspecified or completed.
 * @property {Date}        createdAt    Auto-managed by Mongoose timestamps.
 * @property {Date}        updatedAt    Auto-managed by Mongoose timestamps.
 */

/**
 * Mongoose schema for the `tasks` collection.
 * @type {import('mongoose').Schema<TaskDoc>}
 */
const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'completed'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    /** Username of the task owner. We store the username (not the ObjectId)
     *  so the leaderboard's `$group: { _id: '$author' }` returns human-readable
     *  identifiers directly. */
    author: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        default: null
    }
}, { timestamps: true });

/**
 * The compiled Task model.
 * @type {import('mongoose').Model<TaskDoc>}
 */
module.exports = mongoose.model('Task', TaskSchema);
