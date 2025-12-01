const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', isAuthenticated, async (req, res) => {
    try {
        const { username, email } = req.body;

        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields if provided
        if (username) user.username = username;
        if (email) user.email = email;

        await user.save();

        // Update session
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
});

// @route   GET /api/users/borrow-history
// @desc    Get user's borrow history
// @access  Private
router.get('/borrow-history', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('borrowHistory');

        res.status(200).json({
            success: true,
            borrowHistory: user.borrowHistory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching borrow history',
            error: error.message
        });
    }
});

// @route   POST /api/users/borrow
// @desc    Add book to borrow history
// @access  Private
router.post('/borrow', isAuthenticated, async (req, res) => {
    try {
        const { bookTitle, bookCover } = req.body;

        if (!bookTitle || !bookCover) {
            return res.status(400).json({
                success: false,
                message: 'Book title and cover are required'
            });
        }

        const user = await User.findById(req.session.userId);

        user.borrowHistory.push({
            bookTitle,
            bookCover,
            status: 'borrowed'
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Book borrowed successfully',
            borrowHistory: user.borrowHistory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error borrowing book',
            error: error.message
        });
    }
});

module.exports = router;