require('dotenv').config();
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

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('shushu-library-dev-secret-123'));

// CORS Configuration
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));

// Custom CORS Headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'shushu_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || process.env.MONGO_URL,
        touchAfter: 24 * 3600
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        domain: '127.0.0.1'
    }
}));

// DEBUG ROUTE 
app.get('/api/debug/cookies', (req, res) => {
    res.json({
        cookies: req.cookies,
        sessionExists: !!req.session,
        sessionId: req.sessionID,
        userId: req.session?.userId,
        headers: {
            cookie: req.headers.cookie,
            origin: req.headers.origin
        }
    });
});

// API ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/books', require('./routes/books'));
app.use('/api/search', require('./routes/search'));
app.use('/api/books', require('./routes/ratings'));

// HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Shushu Library API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// START SERVER
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
