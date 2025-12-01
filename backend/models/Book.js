const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Horror', 'Fantasy', 'Mystery', 'Science Fiction', 'Thriller', 
               'Romance', 'Adventure', 'History', 'Computer Books', 'Cooking']
    },
    year: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    synopsis: {
        type: String,
        required: true
    },
    cover: {
        type: String,
        required: true
    },
    
    // ==========================================
    //  NEW: INVENTORY STOCK
    // ==========================================
    stock: {
        type: Number,
        default: 3, // Start with 3 copies
        min: 0      // Cannot be negative
    },

    pdfUrl: { 
        type: String, 
        default: "" // If empty, we show a "Not Available" message
    },

    borrowLink: {
        type: String,
        required: true
    },
    available: {
        type: Boolean,
        default: true
    },
    borrowCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Book', bookSchema);