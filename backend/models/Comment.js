const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Allow guests to comment
    },
    text: {
        type: String,
        required: [true, 'Comment text is required'],
        trim: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    image: {
        type: String,
        default: null
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    replies: [{
        username: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comment', commentSchema);