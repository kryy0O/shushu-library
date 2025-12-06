const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

// GET ALL COMMENTS
router.get('/', async (req, res) => {
    try {
        const comments = await Comment.find()
            .sort({ createdAt: -1 })
            .populate({
                path: 'userId',
                select: '_id username'
            })
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

// CREATE NEW COMMENT
router.post('/', async (req, res) => {
    try {
        const { username, text, image, userId } = req.body;

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

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            commentData.userId = userId;
        } else if (req.session && req.session.userId) {
            commentData.userId = req.session.userId;
        }

        const comment = await Comment.create(commentData);
        
        const populatedComment = await Comment.findById(comment._id)
            .populate({
                path: 'userId',
                select: '_id username'
            });

        res.status(201).json({
            success: true,
            message: 'Comment posted successfully',
            comment: populatedComment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error posting comment',
            error: error.message
        });
    }
});

// LIKE/UNLIKE COMMENT
router.post('/:id/like', async (req, res) => {
    try {
        const { userId } = req.body;
        const commentId = req.params.id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const comment = await Comment.findById(commentId);
        
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        
        const userAlreadyLiked = comment.likes.some(
            likeId => likeId.toString() === userId
        );
        
        if (userAlreadyLiked) {
            comment.likes = comment.likes.filter(
                likeId => likeId.toString() !== userId
            );
        } else {
            comment.likes.push(new mongoose.Types.ObjectId(userId));
        }
        
        await comment.save();
        
        const currentUserLiked = !userAlreadyLiked;
        
        res.status(200).json({
            success: true,
            message: userAlreadyLiked ? 'Comment unliked' : 'Comment liked',
            likes: comment.likes.length,
            userLiked: currentUserLiked
        });
        
    } catch (error) {
        console.error('Like error:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking comment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// REPLY TO COMMENT
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

// DELETE COMMENT
router.delete('/:id', async (req, res) => {
    try {
        const { userId, username } = req.body;
        const commentId = req.params.id;
        
        if (!userId && !username) {
            return res.status(400).json({
                success: false,
                message: 'User ID or username is required'
            });
        }
        
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        let isAuthorized = false;
        
        if (comment.userId && userId) {
            isAuthorized = comment.userId.toString() === userId;
        }
        
        if (!isAuthorized && username && comment.username) {
            isAuthorized = comment.username === username;
        }
        
        if (!isAuthorized) {
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
