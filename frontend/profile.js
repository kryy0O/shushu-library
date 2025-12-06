const API_URL = 'http://localhost:5000/api';

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check Login
    const userString = localStorage.getItem('user');
    if (!userString) {
        window.location.href = 'login.html';
        return;
    }
    
    const localUser = JSON.parse(userString);
    const userId = localUser.id || localUser._id;

    // 2. Fetch Data from Database
    try {
        const res = await fetch(`${API_URL}/books/profile/${userId}`);
        const data = await res.json();
        
        if (data.success) {
            const user = data.user;

            // Fill User Info
            if(document.getElementById('header-username')) 
                document.getElementById('header-username').innerText = user.username;
            if(document.getElementById('sidebar-name'))
                document.getElementById('sidebar-name').innerText = user.username;
            if(document.getElementById('sidebar-email'))
                document.getElementById('sidebar-email').innerText = user.email;
            
            const avatarUrl = `https://ui-avatars.com/api/?name=${user.username}&background=FF6B6B&color=fff&bold=true`;
            if(document.getElementById('header-avatar')) document.getElementById('header-avatar').src = avatarUrl;
            if(document.getElementById('sidebar-avatar')) document.getElementById('sidebar-avatar').src = avatarUrl;

            // 3. Render Lists - UPDATED: Reading tab shows ONLY currently borrowed books
            const currentlyBorrowed = user.borrowHistory.filter(book => book.status === 'borrowed');
            
            renderGrid('wishlist-grid', user.wishlist, 'wishlist');
            renderGrid('reading-grid', currentlyBorrowed, 'reading'); // Only borrowed books
            renderGrid('borrowed-grid', user.borrowHistory, 'borrowed');
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }

    // 4. Tab Switching Logic
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab') || 'reading';
    switchTab(activeTab);
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const selectedContent = document.getElementById(`tab-${tabName}`);
    if (selectedContent) selectedContent.classList.add('active');
    
    // Update the active button
    const selectedButton = document.querySelector(`.nav-btn[onclick*="${tabName}"]`);
    if (selectedButton) selectedButton.classList.add('active');
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.pushState({}, '', url);
}

function renderGrid(elementId, books, type) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!books || books.length === 0) {
        if (type === 'reading') {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #aaa; grid-column: 1/-1;">
                    <i class="fa-solid fa-book-open" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>No books currently being read</h3>
                    <p>Borrow a book from the library to start reading!</p>
                </div>
            `;
        } else if (type === 'wishlist') {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #aaa; grid-column: 1/-1;">
                    <i class="fa-solid fa-heart" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>No favorite books yet</h3>
                    <p>Add books to your favorites by clicking the heart icon!</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #aaa; grid-column: 1/-1;">
                    <i class="fa-solid fa-history" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>No borrowed books yet</h3>
                    <p>Borrow books to see your history here!</p>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="profile-book-card" data-book-id="${book._id || book.id}">
            <img src="${book.bookCover}" 
                 onerror="this.src='https://via.placeholder.com/150?text=No+Image'" 
                 style="width:100%; height:220px; object-fit:cover; border-radius:8px;">
            <h4 style="margin-top:10px; font-size:16px;">${book.bookTitle}</h4>
            <span style="color:#888; font-size:12px;">${book.bookAuthor}</span>
            
            ${getActionButton(type, book)}
        </div>
    `).join('');
}

// =========================================================
//  UPDATED ACTION BUTTON LOGIC
// =========================================================
function getActionButton(type, book) {
    // READING TAB: Only for currently borrowed books
    if (type === 'reading') {
        const today = new Date();
        const due = new Date(book.dueDate);
        const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        
        let dueBadge = '';
        if (daysLeft < 0) {
            dueBadge = `<hr style="margin-top:7px; opacity:15%;"><div style="color:#ff4757; font-weight:bold; margin: 5px 0;">⚠️ OVERDUE ${Math.abs(daysLeft)} days ago</div>`;
        } else if (daysLeft <= 3) {
            dueBadge = `<hr style="margin-top:7px; opacity:15%;"><div style="color:#ff9500; margin: 5px 0;">Due in ${daysLeft} days</div>`;
        } else {
            dueBadge = `<hr style="margin-top:7px; opacity:15%;"><div style="color:#2ed573; margin: 5px 0;">Due in ${daysLeft} days</div>`;
        }
        
        const safeTitle = book.bookTitle.replace(/'/g, "\\'");
        
        return `
            ${dueBadge}
            <div style="display: flex; gap: 5px; margin-top: 15px;">
                <button onclick="openBorrowedBook('${safeTitle}')" 
                        style="font-family:'Funnel Sans', sans-serif; font-size:12px;flex: 1; background:#00adb5; border:none; color:white; padding:8px; border-radius:5px; cursor:pointer; font-weight:bold; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-book-open"></i> Continue Reading
                </button>
                <button onclick="returnBook('${safeTitle}')" 
                        style="font-family:'Funnel Sans', sans-serif; font-size:12px;flex: 1; background:#ff6b6b; border:none; color:white; padding:8px; border-radius:5px; cursor:pointer; font-weight:bold;">
                    <i class="fa-solid fa-undo"></i> Return
                </button>
            </div>
        `;
    }
    
    // BORROWED HISTORY TAB: Show return button for borrowed, status for returned
    if (type === 'borrowed') {
        if (book.status === 'borrowed') {
            const today = new Date();
            const due = new Date(book.dueDate);
            const isOverdue = today > due;
            const dateText = due.toLocaleDateString();
            
            let statusBadge = '';
            if (isOverdue) {
                statusBadge = `<div style="color:#ff4757; font-weight:bold; margin-bottom:5px;">⚠️ OVERDUE (Due: ${dateText})</div>`;
            } else {
                statusBadge = `<div style="color:#2ed573; margin-bottom:5px;">Due: ${dateText}</div>`;
            }

            const safeTitle = book.bookTitle.replace(/'/g, "\\'");
            
            return `
                ${statusBadge}
                <button onclick="returnBook('${safeTitle}')" style="margin-top:12px;width:100%; background:#ff6b6b; border:none; color:white; padding:8px; border-radius:5px; cursor:pointer; font-weight:bold;">
                <i class="fa-solid fa-undo"></i> Return Book</button>
            `;
        } else {
            let dateText = "Returned";
            if (book.returnDate) {
                dateText = "Returned: " + new Date(book.returnDate).toLocaleDateString();
            }
            return `<div style="margin-top:10px; background:#333; color:#aaa; padding:5px; border-radius:5px; font-size:11px;">${dateText}</div>`;
        }
    }
    
    // WISHLIST TAB: Show remove button
    if (type === 'wishlist') {
        const safeTitle = book.bookTitle.replace(/'/g, "\\'");
        return `
            <div style="margin-top:10px; display: flex; gap: 5px;">
                <button onclick="removeFromWishlist('${safeTitle}')" 
                        style="width:100%; background:#ff6b6b; border:none; color:white; padding:8px; border-radius:5px; cursor:pointer; font-weight:bold; display: flex; align-items: center; justify-content: center; gap: 5px; font-family:'Funnel Sans', sans-serif;">
                    <i class="fa-solid fa-heart-crack"></i> Unfavorite
                </button>
            </div>
        `;
    }
    
    return '';
}

// =========================================================
//  OPEN BORROWED BOOK (Continue Reading)
// =========================================================
window.openBorrowedBook = async (title) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        // First, get all books to find the PDF URL
        const booksRes = await fetch(`${API_URL}/books`);
        const booksData = await booksRes.json();
        
        if (booksData.success) {
            const book = booksData.data.find(b => b.title === title);
            
            if (book && book.pdfUrl) {
                // Track reading activity (optional)
                try {
                    await fetch(`${API_URL}/books/reading`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            userId: user.id || user._id,
                            title: title,
                            author: book.author,
                            coverImage: book.cover
                        })
                    });
                } catch (e) {
                    console.log("Reading tracking optional");
                }
                
                // Open the PDF reader modal
                const modal = document.getElementById('pdfReaderModal');
                const frame = document.getElementById('pdfFrame');
                
                if (modal && frame) {
                    frame.src = book.pdfUrl;
                    modal.style.display = "flex";
                    
                    // Add book title to modal
                    const modalTitle = document.createElement('div');
                    modalTitle.style.cssText = 'position: absolute; top: 10px; left: 20px; color: white; font-weight: bold; z-index: 10; background: rgba(0,0,0,0.7); padding: 5px 15px; border-radius: 5px;';
                    modalTitle.textContent = `Reading: ${title}`;
                    modalTitle.className = 'reader-title';
                    
                    // Remove existing title if any
                    const existingTitle = modal.querySelector('.reader-title');
                    if (existingTitle) existingTitle.remove();
                    
                    modal.querySelector('.reader-content').appendChild(modalTitle);
                } else {
                    // If modal doesn't exist, open in new tab
                    window.open(book.pdfUrl, '_blank');
                }
            } else {
                Swal.fire({
                    title: 'PDF Not Available',
                    text: 'This book does not have a PDF version yet. You can still read the physical copy!',
                    icon: 'info',
                    confirmButtonColor: '#f2b705'
                });
            }
        }
    } catch (error) {
        console.error('Error opening borrowed book:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to open book. Please try again.',
            icon: 'error',
            confirmButtonColor: '#ff6b6b'
        });
    }
};

// =========================================================
//  RETURN BOOK LOGIC
// =========================================================
window.returnBook = async (title) => {
    // Ask for confirmation
    if(typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Return Book?',
            text: `Return "${title}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, return it',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;
    } else {
        if(!confirm(`Return "${title}"?`)) return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    try {
        const res = await fetch(`${API_URL}/books/return`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: user.id || user._id, bookTitle: title })
        });
        const data = await res.json();
        
        if(data.success) {
            if(typeof Swal !== 'undefined') {
                await Swal.fire({
                    title: 'Returned!',
                    text: 'Book returned successfully.',
                    icon: 'success',
                    confirmButtonColor: '#00adb5',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                alert("Book returned!");
            }
            location.reload();
        }
    } catch (e) { 
        console.error(e);
        if(typeof Swal !== 'undefined') {
            await Swal.fire('Error', 'Failed to return book', 'error');
        }
    }
};

// =========================================================
//  WISHLIST REMOVAL LOGIC
// =========================================================
window.removeFromWishlist = async (title) => {
    if(typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Remove from Favorites?',
            text: `Remove "${title}" from your favorites?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, remove it',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;
    } else {
        if(!confirm(`Remove "${title}" from favorites?`)) return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    try {
        const res = await fetch(`${API_URL}/books/wishlist/remove`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                userId: user.id || user._id, 
                bookTitle: title 
            })
        });
        const data = await res.json();
        
        if(data.success) {
            if(typeof Swal !== 'undefined') {
                await Swal.fire({
                    title: 'Removed!',
                    text: 'Book removed from favorites.',
                    icon: 'success',
                    confirmButtonColor: '#00adb5',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                alert("Book removed from favorites!");
            }
            location.reload();
        } else {
            if(typeof Swal !== 'undefined') {
                await Swal.fire('Error', data.message || 'Failed to remove from favorites', 'error');
            }
        }
    } catch (e) { 
        console.error(e);
        if(typeof Swal !== 'undefined') {
            await Swal.fire('Error', 'Failed to remove from favorites', 'error');
        }
    }
};

window.switchTab = switchTab;
window.handleLogout = function() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

// =========================================================
//  CLOSE PDF READER
// =========================================================
window.closeReader = function() {
    document.getElementById('pdfReaderModal').style.display = "none";
    document.getElementById('pdfFrame').src = "";
    
    // Remove the title
    const title = document.querySelector('.reader-title');
    if (title) title.remove();
};
