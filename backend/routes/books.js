const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Book'); // Required for Stock Logic

// Helper for Wishlist/Reading (No stock logic needed here)
async function addBookToUserList(res, userId, listName, bookData, duplicateMessage) {
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const exists = user[listName].find(b => b.bookTitle === bookData.bookTitle);
        if (exists) return res.status(400).json({ success: false, message: duplicateMessage });

        user[listName].push(bookData);
        await user.save();
        res.status(200).json({ success: true, message: 'Success!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}

// ==========================================
// 1. BORROW BOOK (With Stock Logic 📉)
// ==========================================
router.post('/borrow', async (req, res) => {
    try {
        const { userId, title, author, coverImage } = req.body;

        // A. Find the Book in Inventory
        const book = await Book.findOne({ title: title });
        
        // B. Check Stock
        if (!book) return res.status(404).json({ success: false, message: 'Book not found in library.' });
        if (book.stock <= 0) return res.status(400).json({ success: false, message: 'Sorry, Out of Stock!' });

        // C. Find User
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // D. Check if User already has it
        const exists = user.borrowHistory.find(b => b.bookTitle === title && b.status === 'borrowed');
        if (exists) return res.status(400).json({ success: false, message: 'You already have this book!' });

        // E. TRANSACTION: User gets book, Library loses stock
        // Inside router.post('/borrow', ...)

        // 1. Calculate Due Date (7 Days from now)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // 2. Add to History with Due Date
        user.borrowHistory.push({ 
            bookTitle: title, 
            bookAuthor: author, 
            bookCover: coverImage,
            status: 'borrowed',
            dueDate: sevenDaysFromNow // <--- SAVE THE DATE
        });
        
        book.stock = book.stock - 1;

        await user.save();
        await book.save();
        res.json({ success: true, message: `Borrowed! (${book.stock} copies left)` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// ==========================================
// 2. WISHLIST (Simple Add)
// ==========================================
router.post('/wishlist', async (req, res) => {
    const { userId, title, author, coverImage } = req.body;
    await addBookToUserList(res, userId, 'wishlist', {
        bookTitle: title, bookAuthor: author, bookCover: coverImage
    }, 'Already in wishlist!');
});

// ==========================================
// 3. READING NOW (Simple Add)
// ==========================================
router.post('/reading', async (req, res) => {
    const { userId, title, author, coverImage } = req.body;
    await addBookToUserList(res, userId, 'readingList', {
        bookTitle: title, bookAuthor: author, bookCover: coverImage
    }, 'Already reading this!');
});

// ==========================================
// 4. GET PROFILE
// ==========================================
router.get('/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false });

        res.json({
            success: true,
            user: {
                username: user.username,
                email: user.email,
                readingList: user.readingList,
                wishlist: user.wishlist,
                borrowHistory: user.borrowHistory
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==========================================
// 5. RETURN A BOOK (Restock 📈)
// ==========================================
router.post('/return', async (req, res) => {
    try {
        const { userId, bookTitle } = req.body;
        const user = await User.findById(userId);
        const book = await Book.findOne({ title: bookTitle });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Find borrowed book in history
        const bookIndex = user.borrowHistory.findIndex(
            b => b.bookTitle === bookTitle && b.status === 'borrowed'
        );

        if (bookIndex === -1) return res.status(400).json({ success: false, message: 'Book not found in history' });

        // Update User
        user.borrowHistory[bookIndex].status = 'returned';
        user.borrowHistory[bookIndex].returnDate = Date.now();

        // Update Stock (Increase)
        if (book) {
            book.stock = book.stock + 1;
            await book.save();
        }

        await user.save();
        res.json({ success: true, message: 'Returned & Restocked!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// ==========================================
// 6. GET ALL BOOKS
// ==========================================
router.get('/', async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json({ success: true, count: books.length, data: books });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Server Error' });
    }
});

// ==========================================
// 7. SEED DATABASE (Reset with Stock)
// ==========================================
router.post('/seed', async (req, res) => {
    try {
        await Book.deleteMany({}); // Clears old books without stock

        const sampleBooks = [
            // HORROR
            {
                title: "The Reaper",
                author: "Steven Banner",
                category: "Horror",
                year: 2023,
                rating: 4,
                synopsis: "Young Sean Callahan appears to be lost...",
                cover: "horror/horror1.png",
                stock: 3,
                borrowLink: "#"
            },
            {
                title: "The Darkest Night",
                author: "A. Nonymous",
                category: "Horror",
                year: 2021,
                rating: 5,
                synopsis: "A scary story about the night.",
                cover: "horror/horror2.png",
                stock: 3,
                borrowLink: "#"
            },
            {
                title: "The Shining",
                author: "Stephen King",
                category: "Horror",
                year: 1977,
                rating: 5,
                synopsis: "Here's Johnny!",
                cover: "horror/shining.png",
                stock: 3,
                borrowLink: "#"
            },
            // FANTASY
            {
                title: "The Dragon's Eye",
                author: "F. Antasy",
                category: "Fantasy",
                year: 2020,
                rating: 5,
                synopsis: "Dragons and magic.",
                cover: "fantasy/fantasy1.png",
                stock: 3,
                borrowLink: "#"
            },
            {
                title: "Magic World",
                author: "J. K. Rowling",
                category: "Fantasy",
                year: 2018,
                rating: 4,
                synopsis: "Wizards fighting dark magic.",
                cover: "fantasy/fantasy2.png",
                stock: 3,
                borrowLink: "#"
            },
            // MYSTERY
            {
                title: "Who Did It?",
                author: "Sherlock",
                category: "Mystery",
                year: 1999,
                rating: 5,
                synopsis: "A classic whodunit.",
                cover: "mystery/mystery1.png",
                stock: 3,
                borrowLink: "#"
            }
        ];

        await Book.insertMany(sampleBooks);
        res.status(201).json({ success: true, message: 'Database Reset! All books have 3 copies.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;

// ==========================================
// 8. SMART SAVE (Add OR Update)
// ==========================================
router.post('/add', async (req, res) => {
    try {
        const { title } = req.body;

        // "upsert: true" means: If found, update it. If not found, create new.
        const book = await Book.findOneAndUpdate(
            { title: title }, // Find by Title
            req.body,         // Update with new data
            { new: true, upsert: true } // Options
        );
        
        res.status(200).json({ success: true, message: `Saved "${title}" successfully!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save book.' });
    }
});
// ==========================================
// ==========================================
// 9. DELETE BOOK (Deletes ALL copies)
// ==========================================
router.delete('/delete/:title', async (req, res) => {
    try {
        const title = req.params.title;
        
        // CHANGE THIS LINE: from findOneAndDelete to deleteMany
        const result = await Book.deleteMany({ title: title });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        res.json({ success: true, message: `Deleted ${result.deletedCount} copies of "${title}"!` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});