const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const mongoose = require('mongoose');

// ==========================================
// SUBMIT OR UPDATE RATING
// ==========================================
router.post('/:id/rate', async (req, res) => {
    try {
        const { userId, rating } = req.body;
        const bookId = req.params.id;

        // Validate inputs
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(bookId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID'
            });
        }

        // Find the book
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        // Check if user already rated this book
        const existingRatingIndex = book.ratings.findIndex(
            r => r.userId.toString() === userId
        );

        let message = '';
        
        if (existingRatingIndex > -1) {
            // Update existing rating
            book.ratings[existingRatingIndex].rating = rating;
            book.ratings[existingRatingIndex].createdAt = new Date();
            message = 'Rating updated successfully';
        } else {
            // Add new rating
            book.ratings.push({
                userId: userId,
                rating: rating
            });
            message = 'Rating submitted successfully';
        }

        // Save the book (the pre-save middleware will calculate average)
        await book.save();

        // Get updated book with calculated averages
        const updatedBook = await Book.findById(bookId);

        res.status(200).json({
            success: true,
            message: message,
            data: {
                averageRating: updatedBook.rating,
                totalRatings: updatedBook.totalRatings,
                userRating: rating,
                hasRated: true
            }
        });

    } catch (error) {
        console.error('Rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting rating',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==========================================
// GET USER'S RATING FOR A BOOK
// ==========================================
router.get('/:id/rating/:userId', async (req, res) => {
    try {
        const { userId, id: bookId } = req.params;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(bookId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID or user ID'
            });
        }

        // Find the book
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        // Find user's rating
        const userRating = book.ratings.find(
            r => r.userId.toString() === userId
        );

        res.status(200).json({
            success: true,
            data: {
                averageRating: book.rating || 0,
                totalRatings: book.totalRatings || 0,
                userRating: userRating ? userRating.rating : 0,
                hasRated: !!userRating
            }
        });

    } catch (error) {
        console.error('Get rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching rating',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==========================================
// GET ALL RATINGS FOR A BOOK (Optional - for admin)
// ==========================================
router.get('/:id/ratings', async (req, res) => {
    try {
        const bookId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(bookId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID'
            });
        }

        const book = await Book.findById(bookId)
            .populate({
                path: 'ratings.userId',
                select: 'username _id'
            })
            .select('ratings rating totalRatings title');
        
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                bookTitle: book.title,
                averageRating: book.rating,
                totalRatings: book.totalRatings,
                ratings: book.ratings
            }
        });

    } catch (error) {
        console.error('Get all ratings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ratings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==========================================
// REMOVE USER'S RATING (Optional)
// ==========================================
router.delete('/:id/rating/:userId', async (req, res) => {
    try {
        const { userId, id: bookId } = req.params;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(bookId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID or user ID'
            });
        }

        // Find the book
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        // Find and remove user's rating
        const initialLength = book.ratings.length;
        book.ratings = book.ratings.filter(
            r => r.userId.toString() !== userId
        );

        // Check if rating was actually removed
        if (book.ratings.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'No rating found for this user'
            });
        }

        // Save the book (middleware will recalculate average)
        await book.save();

        // Get updated book
        const updatedBook = await Book.findById(bookId);

        res.status(200).json({
            success: true,
            message: 'Rating removed successfully',
            data: {
                averageRating: updatedBook.rating,
                totalRatings: updatedBook.totalRatings
            }
        });

    } catch (error) {
        console.error('Remove rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing rating',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;