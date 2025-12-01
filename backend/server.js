require('dotenv').config(); // MUST BE THE VERY FIRST LINE
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Initialize express
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration (Allows your frontend to talk to backend)
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500', // Adjust if using different port
    credentials: true
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'shushu_secret_key', // Fallback key if .env fails
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        // Tries MONGO_URI first, then MONGO_URL. Make sure .env matches one of these!
        mongoUrl: process.env.MONGO_URI || process.env.MONGO_URL, 
        touchAfter: 24 * 3600 // Update session only once every 24 hours
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax'
    }
}));

// ==========================================
// ROUTES (The Map for your API)
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/users', require('./routes/users'));

// ✅ CRITICAL ADDITION: This makes Borrow/Wishlist/Reading work!
app.use('/api/books', require('./routes/books')); 

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Shushu Library API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler (If route doesn't exist)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler (If server crashes)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   🚀 Shushu Library Backend Server    ║
    ║   📚 Running on port ${PORT}            ║
    ║   🌍 Environment: ${process.env.NODE_ENV || 'development'}       ║
    ║   📡 API: http://localhost:${PORT}/api   ║
    ╚════════════════════════════════════════╝
    `);
});