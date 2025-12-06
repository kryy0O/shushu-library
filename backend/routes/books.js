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

router.post('/wishlist/remove', async (req, res) => {
    try {
        const { userId, bookTitle } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const bookIndex = user.wishlist.findIndex(book => book.bookTitle === bookTitle);
        if (bookIndex === -1) {
            return res.status(400).json({ success: false, message: 'Book not found in wishlist' });
        }

        user.wishlist.splice(bookIndex, 1);
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Book removed from favorites' 
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/reading/remove', async (req, res) => {
    try {
        const { userId, bookTitle } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const bookIndex = user.readingList.findIndex(book => book.bookTitle === bookTitle);
        if (bookIndex === -1) {
            return res.status(400).json({ success: false, message: 'Book not found in reading list' });
        }

        user.readingList.splice(bookIndex, 1);
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Book removed from reading list' 
        });
    } catch (error) {
        console.error('Error removing from reading list:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
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
            
            // Process waiting queue if anyone is waiting
            await processWaitingQueue(book._id);
        }

        await user.save();
        res.json({ success: true, message: 'Returned & Restocked! Queue processed if applicable.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// ==========================================
// 6. GET ALL BOOKS using sorting method
// ==========================================
router.get('/', async (req, res) => {
    try {
        const books = await Book.find().sort({title: 1})
;        res.status(200).json({ success: true, count: books.length, data: books });
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

// ==========================================
// 10. CHECK BORROW STATUS (For Read Now button)
// ==========================================
router.get('/:bookId/borrow-status/:userId', async (req, res) => {
    try {
        const { bookId, userId } = req.params;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Find book to get title
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        // Check if user has borrowed this book and hasn't returned it
        const hasActiveBorrow = user.borrowHistory.some(borrow => 
            borrow.bookTitle === book.title && 
            borrow.status === 'borrowed'
        );

        // Check borrow limit (3 books max)
        const activeBorrows = user.borrowHistory.filter(
            borrow => borrow.status === 'borrowed'
        ).length;
        
        const borrowLimit = 3;
        const canBorrowMore = activeBorrows < borrowLimit;

        return res.json({
            success: true,
            hasBorrowed: hasActiveBorrow,
            canBorrow: canBorrowMore,
            currentBorrows: activeBorrows,
            borrowLimit
        });

    } catch (error) {
        console.error('Error checking borrow status:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 11. JOIN WAITING QUEUE (When book is out of stock)
// ==========================================
router.post('/:bookId/join-queue', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { userId, username } = req.body;

        // Find the book
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if queue is enabled
        if (!book.queueEnabled) {
            return res.status(400).json({ 
                success: false, 
                message: 'Waiting list is not available for this book' 
            });
        }

        // Check if user is already in the queue
        const alreadyInQueue = book.waitingQueue.some(
            entry => entry.userId.toString() === userId
        );
        
        if (alreadyInQueue) {
            return res.status(400).json({ 
                success: false, 
                message: 'You are already in the waiting list' 
            });
        }

        // Check if user has already borrowed this book
        const hasBorrowed = user.borrowHistory.some(
            borrow => borrow.bookTitle === book.title && borrow.status === 'borrowed'
        );
        
        if (hasBorrowed) {
            return res.status(400).json({ 
                success: false, 
                message: 'You already have this book borrowed' 
            });
        }

        // Check if queue is full
        if (book.waitingQueue.length >= book.maxQueueSize) {
            return res.status(400).json({ 
                success: false, 
                message: 'Waiting list is full. Please try again later.' 
            });
        }

        // Calculate position (1-based index)
        const position = book.waitingQueue.length + 1;

        // Add user to queue (FIFO - First In, First Out)
        book.waitingQueue.push({
            userId,
            username,
            position,
            joinedAt: new Date(),
            notified: false
        });

        // Update user's inQueues
        user.inQueues.push({
            bookId,
            bookTitle: book.title,
            position,
            joinedAt: new Date()
        });

        await book.save();
        await user.save();

        res.json({
            success: true,
            message: `You have been added to the waiting list. Your position: #${position}`,
            position,
            queueLength: book.waitingQueue.length
        });

    } catch (error) {
        console.error('Error joining queue:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 12. LEAVE QUEUE
// ==========================================
router.post('/:bookId/leave-queue', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { userId } = req.body;

        const book = await Book.findById(bookId);
        const user = await User.findById(userId);

        if (!book || !user) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        // Remove user from book's waitingQueue
        const initialLength = book.waitingQueue.length;
        book.waitingQueue = book.waitingQueue.filter(
            entry => entry.userId.toString() !== userId
        );

        // Remove book from user's inQueues
        user.inQueues = user.inQueues.filter(
            queue => queue.bookId.toString() !== bookId
        );

        // Recalculate positions for remaining users
        book.waitingQueue.forEach((entry, index) => {
            entry.position = index + 1;
        });

        await book.save();
        await user.save();

        res.json({
            success: true,
            message: 'Removed from waiting list',
            removed: initialLength > book.waitingQueue.length
        });

    } catch (error) {
        console.error('Error leaving queue:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 13. GET QUEUE STATUS
// ==========================================
router.get('/:bookId/queue-status/:userId', async (req, res) => {
    try {
        const { bookId, userId } = req.params;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        const userInQueue = book.waitingQueue.find(
            entry => entry.userId.toString() === userId
        );

        res.json({
            success: true,
            isInQueue: !!userInQueue,
            position: userInQueue ? userInQueue.position : null,
            queueLength: book.waitingQueue.length,
            estimatedWait: userInQueue ? `Approx ${userInQueue.position * 7} days` : null,
            queueEnabled: book.queueEnabled
        });

    } catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 14. PROCESS QUEUE WHEN BOOK IS RETURNED (AUTO-BORROW)
// ==========================================
// This should be called when a book is returned
async function processWaitingQueue(bookId) {
    try {
        const book = await Book.findById(bookId);
        
        // If book has stock and queue has people
        if (book.stock > 0 && book.waitingQueue.length > 0) {
            // Get the first person in queue (FIFO)
            const nextInLine = book.waitingQueue[0];
            
            // Find the user
            const user = await User.findById(nextInLine.userId);
            
            if (user) {
                // Auto-borrow to the next person
                const borrowRecord = {
                    bookTitle: book.title,
                    bookAuthor: book.author,
                    bookCover: book.cover,
                    status: 'borrowed',
                    borrowDate: new Date(),
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                };
                
                user.borrowHistory.push(borrowRecord);
                
                // Remove from queue
                book.waitingQueue.shift();
                
                // Reduce stock
                book.stock -= 1;
                
                // Update positions for remaining queue
                book.waitingQueue.forEach((entry, index) => {
                    entry.position = index + 1;
                });
                
                // Remove from user's inQueues
                user.inQueues = user.inQueues.filter(
                    queue => queue.bookId.toString() !== bookId.toString()
                );
                
                // Send notification (you can implement email/notification system)
                nextInLine.notified = true;
                
                await book.save();
                await user.save();
                
                console.log(`Auto-borrowed "${book.title}" to ${user.username}`);
                
                // Return true if queue was processed
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error processing queue:', error);
        return false;
    }
}
