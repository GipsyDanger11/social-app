const mongoose = require('mongoose');

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
    author: {
        type: String, // username
        required: true
    },
    dueDate: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
