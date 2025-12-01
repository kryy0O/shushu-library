const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false 
    },
    profilePicture: {
        type: String,
        default: 'default-avatar.png'
    },
    
    // === NEW LISTS FOR PROFILE ===
    readingList: [{
        bookTitle: String,
        bookAuthor: String,
        bookCover: String,
        progress: { type: Number, default: 0 },
        startDate: { type: Date, default: Date.now }
    }],

    wishlist: [{
        bookTitle: String,
        bookAuthor: String,
        bookCover: String,
        addedAt: { type: Date, default: Date.now }
    }],

    // Inside your UserSchema ...
    borrowHistory: [{
        bookTitle: String,
        bookAuthor: String,
        bookCover: String,
        borrowDate: { type: Date, default: Date.now },
        
        // ✅ NEW FIELD: DUE DATE
        dueDate: { type: Date }, 
        
        returnDate: Date,
        status: {
            type: String,
            enum: ['borrowed', 'returned'],
            default: 'borrowed'
        }
    }],
    
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);