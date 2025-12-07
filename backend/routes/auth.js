const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password
        });

        // Create session
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user (include password for comparison)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create session
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        // Save session and manually set cookie
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Session error' 
                });
            }
            
            // Manually set the cookie with proper domain
            res.cookie('connect.sid', req.sessionID, {
                maxAge: 1000 * 60 * 60 * 24 * 7,
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                domain: '127.0.0.1'  // This matches your frontend
            });
            
            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        });  
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', isAuthenticated, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error logging out'
            });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user data'
        });
    }
});

// @route   GET /api/auth/check
// @desc    Check if user is authenticated
// @access  Public
router.get('/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.status(200).json({
            success: true,
            isAuthenticated: true,
            user: req.session.user
        });
    } else {
        res.status(200).json({
            success: true,
            isAuthenticated: false
        });
    }
});

module.exports = router;
