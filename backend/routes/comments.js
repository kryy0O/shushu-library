const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { isAuthenticated } = require('../middleware/auth');

// @route   GET /api/comments
// @desc    Get all comments
// @access  Public
router.get('/', async (req, res) => {
    try {
        const comments = await Comment.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'username')
            .limit(50);

        res.status(200).json({
            success: true,
            count: comments.length,
            comments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching comments',
            error: error.message
        });
    }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Public (guests can comment)
router.post('/', async (req, res) => {
    try {
        const { username, text, image } = req.body;

        if (!username || !text) {
            return res.status(400).json({
                success: false,
                message: 'Username and text are required'
            });
        }

        const commentData = {
            username,
            text,
            image: image || null
        };

        // If user is logged in, add userId
        if (req.session && req.session.userId) {
            commentData.userId = req.session.userId;
        }

        const comment = await Comment.create(commentData);

        res.status(201).json({
            success: true,
            message: 'Comment posted successfully',
            comment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error posting comment',
            error: error.message
        });
    }
});

// @route   POST /api/comments/:id/like
// @desc    Like/unlike a comment
// @access  Private
router.post('/:id/like', isAuthenticated, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const userId = req.session.userId;
        const likeIndex = comment.likes.indexOf(userId);

        if (likeIndex > -1) {
            // Unlike
            comment.likes.splice(likeIndex, 1);
        } else {
            // Like
            comment.likes.push(userId);
        }

        await comment.save();

        res.status(200).json({
            success: true,
            message: likeIndex > -1 ? 'Comment unliked' : 'Comment liked',
            likes: comment.likes.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error liking comment',
            error: error.message
        });
    }
});

// @route   POST /api/comments/:id/reply
// @desc    Reply to a comment
// @access  Public
router.post('/:id/reply', async (req, res) => {
    try {
        const { username, text } = req.body;

        if (!username || !text) {
            return res.status(400).json({
                success: false,
                message: 'Username and text are required'
            });
        }

        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const reply = {
            username,
            text,
            userId: req.session?.userId || null
        };

        comment.replies.push(reply);
        await comment.save();

        res.status(201).json({
            success: true,
            message: 'Reply added successfully',
            reply
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding reply',
            error: error.message
        });
    }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private (own comments only)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user owns the comment
        if (comment.userId.toString() !== req.session.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this comment'
            });
        }

        await comment.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting comment',
            error: error.message
        });
    }
});

module.exports = router;