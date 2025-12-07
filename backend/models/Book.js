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
    // ==========================================
    //  UPDATED: RATING SYSTEM
    // ==========================================
    // Keep this for backward compatibility (average rating)
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    
    // NEW: Store individual user ratings
    ratings: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,  // 1 star minimum
            max: 5   // 5 stars maximum
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // NEW: Count of total ratings (for quick access)
    totalRatings: {
        type: Number,
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
    //  QUEUE SYSTEM FOR OUT-OF-STOCK BOOKS
    // ==========================================
    waitingQueue: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        username: {
            type: String,
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        notified: {
            type: Boolean,
            default: false
        },
        position: {
            type: Number
        }
    }],
    
    queueEnabled: {
        type: Boolean,
        default: true
    },
    
    maxQueueSize: {
        type: Number,
        default: 10
    },
    
    // ==========================================
    //  INVENTORY STOCK
    // ==========================================
    stock: {
        type: Number,
        default: 3,
        min: 0
    },

    pdfUrl: { 
        type: String, 
        default: ""
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

// ==========================================
//  MIDDLEWARE: Auto-calculate average rating
// ==========================================
bookSchema.pre('save', function(next) {
    if (this.ratings.length > 0) {
        const total = this.ratings.reduce((sum, r) => sum + r.rating, 0);
        this.rating = total / this.ratings.length;
        this.totalRatings = this.ratings.length;
    } else {
        this.rating = 0;
        this.totalRatings = 0;
    }
    next();
});

// Create text index for search functionality
bookSchema.index({ title: 'text', author: 'text', synopsis: 'text' });
// Create regular indexes for faster queries
bookSchema.index({ category: 1 });
bookSchema.index({ rating: -1 });
bookSchema.index({ borrowCount: -1 });

module.exports = mongoose.model('Book', bookSchema);
