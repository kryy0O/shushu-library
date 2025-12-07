const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

// GET /api/search/suggestions - Netflix-style search
router.get('/suggestions', async (req, res) => {
    try {
        const { q, limit = 12 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ success: true, suggestions: [] });
        }

        const searchRegex = new RegExp(q.trim(), 'i');
        
        // Search in title, author, and category
        const books = await Book.find({
            $or: [
                { title: searchRegex },
                { author: searchRegex },
                { category: searchRegex }
            ]
        })
        .select('_id title author category year rating cover stock pdfUrl synopsis')
        .limit(parseInt(limit))
        .sort({ borrowCount: -1, rating: -1 })
        .lean();

        res.json({
            success: true,
            query: q,
            suggestions: books,
            count: books.length
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

module.exports = router;