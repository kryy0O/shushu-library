const API_URL = 'http://127.0.0.1:5000/api';
let currentUser = null;
let allBooks = []; // Store books globally

// Recent Searches Class
class RecentSearches {
    constructor(maxItems = 5) {
        this.maxItems = maxItems;
        this.storageKey = 'shushu_recent_searches';
    }
    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }
    add(query) {
        if (!query || query.trim().length < 2) return;
        let searches = this.getAll();
        searches = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
        searches.unshift(query.trim());
        searches = searches.slice(0, this.maxItems);
        localStorage.setItem(this.storageKey, JSON.stringify(searches));
    }
    clear() { localStorage.removeItem(this.storageKey); }
    remove(query) {
        let searches = this.getAll();
        searches = searches.filter(s => s !== query);
        localStorage.setItem(this.storageKey, JSON.stringify(searches));
    }
}

const recentSearches = new RecentSearches(5);

console.log('🚀 Main.js loaded - Stable Version');

document.addEventListener("DOMContentLoaded", () => {
    safeCheckAuth();
    loadBooksFromDB(); 
    loadComments();
    setupProfileDropdown();
    setupSearchAndCategories();
    setupCategoriesDropdown();
    setupScrollButtons();
    setupImagePreview();
});

// ==========================================
//  1. CRASH-PROOF AUTHENTICATION
// ==========================================
async function safeCheckAuth() {
    const stored = localStorage.getItem('user');

    if (stored && stored !== "undefined" && stored !== "null") {
        try {
            currentUser = JSON.parse(stored);
            updateUI(currentUser);
        } catch (e) {
            console.error("Data corrupted. Logging out.");
            localStorage.removeItem('user');
            currentUser = null;
        }
    } else {
        if(stored) localStorage.removeItem('user');
    }

    // Verify with server
    try {
        const res = await fetch(`${API_URL}/auth/check`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            updateUI(currentUser);
        }
    } catch (e) { 
        console.error("Server check failed - Relying on local storage"); 
    }
    
    // After auth check, trigger comment reload
    setTimeout(() => {
        loadComments();
    }, 100);
}

function updateUI(user) {
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    
    if(guestNav && userNav) {
        guestNav.style.display = 'none';
        userNav.style.display = 'flex';
        
        const welcomeMsg = document.getElementById('welcome-msg');
        if(welcomeMsg) welcomeMsg.innerText = "Hi, " + user.username;
        
        const avatar = document.getElementById('user-avatar');
        if(avatar) avatar.src = `https://ui-avatars.com/api/?name=${user.username}&background=random`;
    }
    
    const userField = document.getElementById('username');
    if(userField) { userField.value = user.username; userField.readOnly = true; }
}

// ==========================================
//  2. LOAD BOOKS
// ==========================================
async function loadBooksFromDB() {
    try {
        const response = await fetch(`${API_URL}/books`);
        const result = await response.json();

        if (result.success) {
            allBooks = result.data; // Store globally for search
            const books = result.data;
            
            const horrorRow = document.getElementById('horrorRow');
            const fantasyRow = document.getElementById('fantasyRow');
            const mysteryRow = document.getElementById('mysteryRow');
            const scifiRow = document.getElementById('scifiRow');
            const thrillerRow = document.getElementById('thrillerRow');
            const romanceRow = document.getElementById('romanceRow');
            const adventureRow = document.getElementById('adventureRow');
            const historyRow = document.getElementById('historyRow');
            const computerRow = document.getElementById('computerRow');
            const cookingRow = document.getElementById('cookingRow');

            if(horrorRow) horrorRow.innerHTML = '';
            if(fantasyRow) fantasyRow.innerHTML = '';
            if(mysteryRow) mysteryRow.innerHTML = '';
            if(scifiRow) scifiRow.innerHTML = '';
            if(thrillerRow) thrillerRow.innerHTML = '';
            if(romanceRow) romanceRow.innerHTML = '';
            if(adventureRow) adventureRow.innerHTML = '';
            if(historyRow) historyRow.innerHTML = '';
            if(computerRow) computerRow.innerHTML = '';
            if(cookingRow) cookingRow.innerHTML = '';

            books.forEach(book => {
                const html = createBookHTML(book);
                if (book.category === 'Horror' && horrorRow) horrorRow.innerHTML += html;
                else if (book.category === 'Fantasy' && fantasyRow) fantasyRow.innerHTML += html;
                else if (book.category === 'Mystery' && mysteryRow) mysteryRow.innerHTML += html;
                else if (book.category === 'Science Fiction' && scifiRow) scifiRow.innerHTML += html;
                else if (book.category === 'Thriller' && thrillerRow) thrillerRow.innerHTML += html;
                else if (book.category === 'Romance' && romanceRow) romanceRow.innerHTML += html;
                else if (book.category === 'Adventure' && adventureRow) adventureRow.innerHTML += html;
                else if (book.category === 'History' && historyRow) historyRow.innerHTML += html;
                else if (book.category === 'Computer Books' && computerRow) computerRow.innerHTML += html;
                else if (book.category === 'Cooking' && cookingRow) cookingRow.innerHTML += html;
            });

            attachModalListeners();
        }
    } catch (error) {
        console.error("Error loading books:", error);
    }
}

function createBookHTML(book) {
    let stockBadge = '';
    const stock = book.stock !== undefined ? book.stock : 3;
    
    if (stock === 0) {
        stockBadge = `<span style="position:absolute; top:10px; right:10px; background:#ff4757; color:white; padding:4px 8px; border-radius:5px; font-size:11px; font-weight:bold; z-index: 2;">OUT OF STOCK</span>`;
    } else {
        stockBadge = `<span style="position:absolute; top:10px; right:10px; background:#00adb5; color:white; padding:4px 8px; border-radius:5px; font-size:11px; z-index: 2;">${stock} left</span>`;
    }

    return `
        <div class="book-item" style="position:relative;" data-id="${book._id}">
            ${stockBadge}
            <img src="${book.cover}" 
                 onerror="this.src='https://placehold.co/150x220?text=No+Image'"
                 data-title="${book.title}" 
                 data-author="${book.author}" 
                 data-year="${book.year}" 
                 data-synopsis="${book.synopsis}"
                 data-rating="${book.rating}"
                 data-year="${book.year}"
                 data-stock="${stock}"
                 data-pdf="${book.pdfUrl || ''}" 
                 data-category="${book.category}"
                 alt="${book.title}">
            <p>${book.title}</p>
        </div>
    `;
}

// ==========================================
//  3. MODAL & BUTTONS (UPDATED FOR BORROW CHECK)
// ==========================================
function attachModalListeners() {
    const modal = document.getElementById("bookModal");
    const closeBtn = document.querySelector(".close-modal");
    
    // Remove any existing listeners first
    document.querySelectorAll(".book-item img").forEach(img => {
        img.removeEventListener('click', handleBookClick);
    });
    
    // Add fresh listeners
    document.querySelectorAll(".book-item img").forEach(img => {
        img.addEventListener('click', handleBookClick);
    });

    // Proper modal close handling
    if(closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            // Reset any modal state if needed
            resetModalState();
        };
    }
    
    window.onclick = (e) => { 
        if(e.target == modal) {
            modal.style.display = "none";
            resetModalState();
        }
    };
}

async function handleBookClick(event) {
    const img = event.currentTarget;
    const stock = parseInt(img.dataset.stock || "0");
    const pdfLink = img.dataset.pdf; 
    const bookId = img.closest('.book-item').dataset.id;
    
    // Get modal elements
    const modal = document.getElementById("bookModal");
    const cover = document.getElementById("modal-cover");
    const title = document.getElementById("modal-title");
    const author = document.getElementById("modal-author");
    const year = document.getElementById("modal-year");
    const synop = document.getElementById("modal-synopsis");
    const borrowBtn = document.getElementById("modal-borrow");

    const data = {
        src: img.src,
        title: img.dataset.title,
        author: img.dataset.author,
        year: img.dataset.year,
        desc: img.dataset.synopsis,
        category: img.dataset.category,
        id: bookId
    };

    cover.src = data.src;
    title.innerText = data.title;
    author.innerText = "Author: " + data.author;
    year.innerText = "Published: " + data.year;
    synop.innerText = "Synopsis: " + data.desc;

    // Clean up previous modal content
    cleanModalContent();

    // Remove old action buttons
    const oldActions = borrowBtn.parentNode.querySelector('.extra-actions');
    if (oldActions) oldActions.remove();

    // Create new action buttons container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'extra-actions';
    actionsDiv.style.marginTop = '15px';
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '10px';

    // Check if user is logged in and has borrowed this book
    let hasBorrowed = false;
    let canBorrow = true;
    
    if (currentUser && bookId) {
        try {
            const borrowResponse = await fetch(
                `${API_URL}/books/${bookId}/borrow-status/${currentUser.id || currentUser._id}`,
                { credentials: 'include' }
            );
            const borrowData = await borrowResponse.json();
            
            if (borrowData.success) {
                hasBorrowed = borrowData.hasBorrowed;
                canBorrow = borrowData.canBorrow;
                console.log(`Book ${bookId}: hasBorrowed=${hasBorrowed}, canBorrow=${canBorrow}`);
            }
        } catch (error) {
            console.error("Error checking borrow status:", error);
        }
    }

    let queueStatus = null;
    if (currentUser && bookId && stock === 0) {
        try {
            const queueResponse = await fetch(
                `${API_URL}/books/${bookId}/queue-status/${currentUser.id || currentUser._id}`,
                { credentials: 'include' }
            );
            queueStatus = await queueResponse.json();
        } catch (error) {
            console.error("Error checking queue status:", error);
        }
    }

    // Build action buttons HTML
    let actionButtonsHTML = '';
    
    // Always show Favorite button
    actionButtonsHTML += `
        <button id="btn-wishlist" style="background:#ff6b6b; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; flex:1; font-weight:bold; font-family:'Funnel Sans', sans-serif;">
            <i class="fa-solid fa-heart"></i> Favorite
        </button>
    `;
    
    // Only show "Read Now" button if user has borrowed the book AND PDF is available
    if (hasBorrowed) {
        actionButtonsHTML += `
            <button id="btn-read" style="background:#00adb5; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; flex:1; font-weight:bold;font-family:'Funnel Sans', sans-serif;">
                <i class="fa-solid fa-book-open"></i> Read Now
            </button>
        `;
    }

    // Add queue button if out of stock
    if (stock === 0 && currentUser && bookId && queueStatus?.queueEnabled) {
        if (queueStatus?.isInQueue) {
            // Already in queue - show leave queue button
            actionButtonsHTML += `
                <button id="btn-leave-queue" style="background:#ff9500; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; flex:1;font-family:'Funnel Sans', sans-serif;">
                    <i class="fa-solid fa-hourglass-half"></i> In Queue (#${queueStatus.position})
                </button>
            `;
        } else {
            // Not in queue - show join queue button
            actionButtonsHTML += `
                <button id="btn-join-queue" style="background:#9c88ff; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; flex:1;font-weight:bold;font-family:'Funnel Sans', sans-serif;">
                    <i class="fa-solid fa-clock"></i> Join Waitlist
                </button>
            `;
        }
    }
    
    actionsDiv.innerHTML = actionButtonsHTML;
    borrowBtn.parentNode.insertBefore(actionsDiv, borrowBtn.nextSibling);
    
    // Add queue button handlers
    if (document.getElementById('btn-join-queue')) {
        document.getElementById('btn-join-queue').onclick = async () => {
            try {
                const response = await fetch(`${API_URL}/books/${bookId}/join-queue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id || currentUser._id,
                        username: currentUser.username
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    Swal.fire({
                        title: 'Added to Waitlist!',
                        text: result.message,
                        icon: 'success',
                        confirmButtonColor: '#f2b705'
                    }).then(() => {
                        // Refresh modal to update button
                        modal.style.display = 'none';
                        img.click(); // Reopen modal
                    });
                } else {
                    Swal.fire('Error', result.message, 'error');
                }
            } catch (error) {
                console.error('Error joining queue:', error);
                Swal.fire('Error', 'Failed to join waitlist', 'error');
            }
        };
    }
    
    if (document.getElementById('btn-leave-queue')) {
        document.getElementById('btn-leave-queue').onclick = async () => {
            const confirm = await Swal.fire({
                title: 'Leave Waitlist?',
                text: 'Are you sure you want to leave the waiting list?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f2b705',
                cancelButtonColor: '#ff4757',
                confirmButtonText: 'Yes, leave'
            });
            
            if (confirm.isConfirmed) {
                try {
                    const response = await fetch(`${API_URL}/books/${bookId}/leave-queue`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: currentUser.id || currentUser._id
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        Swal.fire({
                            title: 'Removed!',
                            text: 'You have been removed from the waitlist',
                            icon: 'success',
                            confirmButtonColor: '#f2b705'
                        }).then(() => {
                            modal.style.display = 'none';
                            img.click();
                        });
                    }
                } catch (error) {
                    console.error('Error leaving queue:', error);
                    Swal.fire('Error', 'Failed to leave waitlist', 'error');
                }
            }
        };
    }

    // Set up event handlers for buttons
    if (document.getElementById('btn-wishlist')) {
        document.getElementById('btn-wishlist').onclick = () => {
            addToWishlist({
                title: data.title,
                author: data.author,
                coverImage: data.src,
                id: bookId
            });
        };
    }

    if (document.getElementById('btn-read')) {
        document.getElementById('btn-read').onclick = () => {
            if(!pdfLink || pdfLink === "#" || pdfLink === "undefined" || pdfLink === "") {
                Swal.fire({
                    title: 'Sorry',
                    text: 'PDF not available for this book yet.',
                    icon: 'info',
                    confirmButtonColor: '#f2b705'
                });
            } else {
                openReader(pdfLink);
            }
        };
    }

    // Update borrow button based on conditions
    const newBorrowBtn = borrowBtn.cloneNode(true);
    borrowBtn.parentNode.replaceChild(newBorrowBtn, borrowBtn);

    if (stock > 0 && canBorrow && !hasBorrowed) {
        newBorrowBtn.innerText = "Borrow Now";
        newBorrowBtn.style.background = "#f2b705";
        newBorrowBtn.style.fontFamily = "'Funnel Sans', sans-serif";
        newBorrowBtn.style.color = "black";
        newBorrowBtn.style.cursor = "pointer";
        newBorrowBtn.disabled = false;
        newBorrowBtn.onclick = () => {
            borrowBook({
                title: data.title,
                author: data.author,
                coverImage: data.src,
                id: bookId
            });
        };
    } else if (hasBorrowed) {
        newBorrowBtn.innerText = "Borrowed";
        newBorrowBtn.style.background = "#555";
        newBorrowBtn.style.fontFamily = "'Funnel Sans', sans-serif";
        newBorrowBtn.style.color = "white";
        newBorrowBtn.style.cursor = "not-allowed";
        newBorrowBtn.disabled = true;
    } else if (stock === 0) {
        newBorrowBtn.innerText = "Out of Stock";
        newBorrowBtn.style.background = "#ff4757";
        newBorrowBtn.style.fontFamily = "'Funnel Sans', sans-serif";
        newBorrowBtn.style.color = "white";
        newBorrowBtn.style.cursor = "not-allowed";
        newBorrowBtn.disabled = true;
    } else if (!canBorrow) {
        newBorrowBtn.innerText = "Borrow Limit Reached";
        newBorrowBtn.style.background = "#555";
        newBorrowBtn.style.fontFamily = "'Funnel Sans', sans-serif";
        newBorrowBtn.style.color = "white";
        newBorrowBtn.style.cursor = "not-allowed";
        newBorrowBtn.disabled = true;
    } else {
        newBorrowBtn.innerText = "Borrow Now";
        newBorrowBtn.style.background = "#555";
        newBorrowBtn.style.fontFamily = "'Funnel Sans', sans-serif";
        newBorrowBtn.style.color = "white";
        newBorrowBtn.style.cursor = "not-allowed";
        newBorrowBtn.disabled = true;
    }

    // Add related books to modal
    addRelatedBooksToModal(data);

    // Initialize rating system for this book
    if (bookId) {
        resetStars();
        setTimeout(() => {
            initBookRating(bookId);
        }, 50);
    }
    
    modal.style.display = "flex";
}

function cleanModalContent() {
    // Remove extra action buttons
    const extraActions = document.querySelectorAll('.extra-actions');
    extraActions.forEach(el => el.remove());
    
    // Reset borrow button
    const borrowBtn = document.getElementById("modal-borrow");
    if(borrowBtn) {
        borrowBtn.onclick = null;
        borrowBtn.disabled = false;
    }
    
    // Remove related books section
    const relatedSection = document.querySelector('.related-books-section');
    if(relatedSection) relatedSection.remove();
}

// Reset modal state when closing
function resetModalState() {
    // Reset rating stars
    resetStars();
    
    // Clear current book ID for rating
    currentBookIdForRating = null;
    
    // Reset any other modal state variables
}

function addRelatedBooksToModal(currentBookData) {
    const modalContent = document.querySelector('.modal-right');
    if(!modalContent) return;

    const oldRelated = document.querySelector('.related-books-section');
    if(oldRelated) oldRelated.remove();

    const relatedBooks = allBooks.filter(book => 
        book.title !== currentBookData.title && 
        (book.category === currentBookData.category || book.author === currentBookData.author)
    ).slice(0, 3);

    if(relatedBooks.length === 0) return;

    const relatedSection = document.createElement('div');
    relatedSection.className = 'related-books-section';
    relatedSection.style.cssText = 'margin-top: 30px; padding-top: 20px; border-top: 2px solid #333;';

    let html = '<h3 style="color: #f2b705; margin-bottom: 15px; font-size: 20px;">More Like This</h3>';
    html += '<div style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px;">';

    relatedBooks.forEach(book => {
        html += `
            <div class="related-book-card" 
                 style="min-width: 120px; cursor: pointer; text-align: center; transition: transform 0.2s;margin-bottom:30px;"
                 onclick="openBookModalFromSearch('${book._id}')">
                <img src="${book.cover}" 
                     style="width: 120px; height: 180px; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"
                     onerror="this.src='https://placehold.co/120x180?text=No+Image'">
                <p style="margin-top: 8px; font-size: 12px; color: white; font-weight: 600; width:140px; text-alidn:center;">${book.title}</p>
                <p style="font-size: 11px; color: #aaa;">${book.author}</p>
            </div>
        `;
    });

    html += '</div>';
    relatedSection.innerHTML = html;
    modalContent.appendChild(relatedSection);
}

// ==========================================
//  4. UPDATE MODAL AFTER BORROW
// ==========================================
async function updateModalAfterBorrow(bookId) {
    const borrowBtn = document.getElementById('modal-borrow');
    if (borrowBtn) {
        borrowBtn.innerText = "Borrowed";
        borrowBtn.style.background = "#555";
        borrowBtn.style.color = "white";
        borrowBtn.style.cursor = "not-allowed";
        borrowBtn.disabled = true;
        borrowBtn.onclick = null;
    }
    
    const bookImg = document.querySelector(`.book-item[data-id="${bookId}"] img`);
    if (!bookImg) {
        console.error("Book image not found for ID:", bookId);
        return;
    }
    
    const actionsDiv = borrowBtn.parentNode.querySelector('.extra-actions');
    if (actionsDiv && !document.getElementById('btn-read')) {
        const pdfLink = bookImg.dataset.pdf;
        
        const readNowBtn = document.createElement('button');
        readNowBtn.id = 'btn-read';
        readNowBtn.style.background = '#00adb5';
        readNowBtn.style.color = 'white';
        readNowBtn.style.border = 'none';
        readNowBtn.style.padding = '10px';
        readNowBtn.style.borderRadius = '5px';
        readNowBtn.style.cursor = 'pointer';
        readNowBtn.style.flex = '1';
        readNowBtn.style.fontWeight = 'bold';
        readNowBtn.innerHTML = '<i class="fa-solid fa-book-open"></i> Read Now';
        
        readNowBtn.onclick = () => {
            if (!pdfLink || pdfLink === "#" || pdfLink === "undefined" || pdfLink === "") {
                Swal.fire({
                    title: 'Sorry',
                    text: 'PDF not available for this book yet.',
                    icon: 'info',
                    confirmButtonColor: '#f2b705'
                });
            } else {
                openReader(pdfLink);
            }
        };
        
        actionsDiv.appendChild(readNowBtn);
    }
    
    const stockBadge = document.querySelector(`.book-item[data-id="${bookId}"] span`);
    if (stockBadge) {
        const currentStock = parseInt(stockBadge.textContent.replace(' left', '').trim());
        if (!isNaN(currentStock) && currentStock > 0) {
            const newStock = currentStock - 1;
            if (newStock > 0) {
                stockBadge.textContent = `${newStock} left`;
            } else {
                stockBadge.textContent = 'OUT OF STOCK';
                stockBadge.style.background = '#ff4757';
                stockBadge.style.fontWeight = 'bold';
            }
        }
    }
    
    const wishlistBtn = document.getElementById('btn-wishlist');
    if (wishlistBtn) {
        wishlistBtn.onclick = () => {
            addToWishlist({
                title: bookImg.dataset.title,
                author: bookImg.dataset.author,
                coverImage: bookImg.src,
                id: bookId
            });
        };
    }
}

// ==========================================
//  5. SEARCH AND CATEGORIES (UPDATED WITH RECENT SEARCHES)
// ==========================================
function setupSearchAndCategories() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;

    let searchTimeout;

    // Show recent searches on FOCUS
    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length === 0) {
            showRecentSearches();
        } else if (this.value.trim().length >= 2) {
            searchResults.style.display = 'block';
        }
    });

    // Search as user types
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();

        if(query.length === 0) {
            showRecentSearches();
            return;
        }

        if(query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(() => {
            showNetflixSearchLoading();
            fetchNetflixSearchResults(query);
            recentSearches.add(query);
        }, 300);
    });

    // Hide when clicking outside
    document.addEventListener('click', (e) => {
        if(!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

function setupCategoriesDropdown() {
    const dropdown = document.querySelector('.dropdown');
    const dropbtn = document.querySelector('.dropbtn');

    if (!dropdown || !dropbtn) {
        console.error('Dropdown or button not found');
        return;
    }

    // Toggle dropdown on button click
    dropbtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    // Click outside closes it
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    // When a category is clicked, close dropdown and scroll
    dropdown.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function(e) {
                e.preventDefault();
                const category = this.dataset.category;
                dropdown.classList.remove('show');
                document.querySelectorAll('.category h3').forEach(h3 => {
                if (h3.innerText.trim() === category) {
                    h3.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
            });
        });
    });
}

// Show Recent Searches
function showRecentSearches() {
    const searchResults = document.getElementById('searchResults');
    if(!searchResults) return;

    const searches = recentSearches.getAll();
    if(searches.length === 0) {
        searchResults.style.display = 'none';
        return;
    }

    let html = '<div class="recent-searches-header">Recent Searches</div>';
    
    searches.forEach(query => {
        html += `
            <div class="search-result-item recent-item" onclick="selectRecentSearch('${query}')">
                <i class="fa-solid fa-clock-rotate-left" style="color: #888; font-size: 16px;"></i>
                <span>${query}</span>
                <i class="fa-solid fa-xmark remove-recent" 
                   onclick="event.stopPropagation(); removeRecentSearch('${query}')" 
                   style="margin-left: auto; color: #666; cursor: pointer; font-size: 14px;"></i>
            </div>
        `;
    });

    html += `
        <div class="clear-recent-btn" onclick="clearAllRecentSearches()">
            <i class="fa-solid fa-trash"></i> Clear All
        </div>
    `;

    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
}

// Select from recent searches
function selectRecentSearch(query) {
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.value = query;
        showNetflixSearchLoading();
        fetchNetflixSearchResults(query);
    }
}

// Remove one recent search
function removeRecentSearch(query) {
    recentSearches.remove(query);
    showRecentSearches();
}

// Clear all recent searches
function clearAllRecentSearches() {
    recentSearches.clear();
    const searchResults = document.getElementById('searchResults');
    if(searchResults) searchResults.style.display = 'none';
}

// Show Netflix-style loading
function showNetflixSearchLoading() {
    const searchResults = document.getElementById('searchResults');
    if(!searchResults) return;
    searchResults.innerHTML = `
        <div class="search-loading">
            <div class="spinner"></div>
            <p>Searching...</p>
        </div>
    `;
    searchResults.style.display = 'block';
}

// Fetch search results from API
async function fetchNetflixSearchResults(query) {
    const searchResults = document.getElementById('searchResults');
    if(!searchResults) return;

    try {
        const res = await fetch(`${API_URL}/search/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if(data.success && data.suggestions && data.suggestions.length > 0) {
            displayNetflixSearchResults(data.suggestions, query);
        } else {
            showNetflixNoResults(query);
        }
    } catch(err) {
        console.error('Search error:', err);
        searchResults.innerHTML = `<div class="search-no-results"><p>Search temporarily unavailable</p></div>`;
        searchResults.style.display = 'block';
    }
}

// In your displayNetflixSearchResults function, update the HTML generation:
function displayNetflixSearchResults(books, query) {
    const searchResults = document.getElementById('searchResults');
    if(!searchResults) return;

    if(books.length === 0) {
        showNetflixNoResults(query);
        return;
    }

    let html = '';
    books.forEach(book => {
        // Escape any single quotes in the book title/ID
        const safeBookId = book._id.replace(/'/g, "\\'");
        const safeTitle = book.title.replace(/'/g, "\\'");
        
        html += `
            <div class="search-result-item" onclick="openBookModalFromSearch('${safeBookId}')">
                <img src="${book.cover || 'https://placehold.co/45x60?text=No+Image'}" 
                     alt="${safeTitle}"
                     style="width: 45px; height: 60px; object-fit: cover; border-radius: 4px;">
                <div style="flex: 1;">
                    <div style="color: white; font-weight: 600;">${book.title}</div>
                    <div style="color: #aaa; font-size: 12px;">${book.author}</div>
                    <div style="color: #888; font-size: 11px;">${book.category}</div>
                </div>
            </div>
        `;
    });

    if (books.length >= 8) {
        html += `
            <div class="see-all-link">
                <a href="#" onclick="showAllSearchResults('${query}'); return false;">
                    See all results for "${query}"
                </a>
            </div>
        `;
    }

    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
}

// Show no results message
function showNetflixNoResults(query) {
    const searchResults = document.getElementById('searchResults');
    if(!searchResults) return;

    searchResults.innerHTML = `<div class="search-no-results"><p>No results for "${query}"</p></div>`;
    searchResults.style.display = 'block';
}

// Show loading animation
function showNetflixSearchLoading() {
    const searchResults = document.getElementById('searchResults');
    if(!searchResults) return;
    searchResults.innerHTML = `
        <div class="search-loading">
            <div class="spinner"></div>
            <p>Searching...</p>
        </div>
    `;
    searchResults.style.display = 'block';
}

// Open book modal from search result
function openBookModalFromSearch(bookId) {
    console.log('Opening book modal for ID:', bookId);
    
    // Hide search results
    const searchResults = document.getElementById('searchResults');
    if(searchResults) searchResults.style.display = 'none';
    
    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.value = '';
    
    // Find the book item by data-id attribute
    const bookItem = document.querySelector(`.book-item[data-id="${bookId}"]`);
    if(bookItem) {
        console.log('Found book item:', bookItem);
        const bookImg = bookItem.querySelector('img');
        if(bookImg) {
            console.log('Clicking book image');
            bookImg.click();
        } else {
            console.error('No image found in book item');
            // Alternative: manually open modal with book data
            manuallyOpenModalForBook(bookId);
        }
    } else {
        console.error('Book item not found for ID:', bookId);
        // Try to find by alternative selector
        const bookImg = document.querySelector(`.book-item img[data-id="${bookId}"]`);
        if(bookImg) {
            console.log('Found book image directly');
            bookImg.click();
        } else {
            // Last resort: manually open modal
            manuallyOpenModalForBook(bookId);
        }
    }
}

// Helper function to manually open modal if click doesn't work
async function manuallyOpenModalForBook(bookId) {
    try {
        // Fetch book data from API
        const response = await fetch(`${API_URL}/books/${bookId}`);
        const data = await response.json();
        
        if(data.success && data.book) {
            const book = data.book;
            
            // Get modal elements
            const modal = document.getElementById("bookModal");
            const cover = document.getElementById("modal-cover");
            const title = document.getElementById("modal-title");
            const author = document.getElementById("modal-author");
            const year = document.getElementById("modal-year");
            const synop = document.getElementById("modal-synopsis");
            const borrowBtn = document.getElementById("modal-borrow");
            
            if(modal && cover && title && author && synop && borrowBtn) {
                // Set modal content
                cover.src = book.cover;
                title.innerText = book.title;
                author.innerText = "Author: " + book.author;
                year.innerText = "Published: " + book.year;
                synop.innerText = "Synopsis: " + book.synopsis;
                
                // Reset stars and initialize rating
                resetStars();
                initBookRating(bookId);
                
                // Update borrow button logic (simplified for now)
                const stock = book.stock || 0;
                if (stock > 0) {
                    borrowBtn.innerText = "Borrow Now";
                    borrowBtn.style.background = "#f2b705";
                    borrowBtn.style.fontFamily = "'Funnel Sans', sans-serif";
                    borrowBtn.style.color = "black";
                    borrowBtn.style.cursor = "pointer";
                    borrowBtn.disabled = false;
                    borrowBtn.onclick = () => borrowBook({
                        title: book.title,
                        author: book.author,
                        coverImage: book.cover,
                        id: bookId
                    });
                } else {
                    borrowBtn.innerText = "Out of Stock";
                    borrowBtn.style.background = "#555";
                    borrowBtn.style.fontFamily = "'Funnel Sans', sans-serif";
                    borrowBtn.style.color = "white";
                    borrowBtn.style.cursor = "not-allowed";
                    borrowBtn.disabled = true;
                }
                
                // Show modal
                modal.style.display = "flex";
            }
        }
    } catch (error) {
        console.error('Error manually opening modal:', error);
        Swal.fire('Error', 'Could not open book details', 'error');
    }
}

// Show all search results (optional)
function showAllSearchResults(query) {
    Swal.fire({
        title: 'All Results',
        text: `Would show all results for: ${query}`,
        icon: 'info',
        confirmButtonText: 'OK',
        confirmButtonColor: '#f2b705'
    });
}

// ==========================================
//  RATING SYSTEM FUNCTIONS
// ==========================================
let currentBookIdForRating = null;

async function initBookRating(bookId) {
    currentBookIdForRating = bookId;
    
    if (!currentUser) {
        updateRatingUI(0, 0, 0, false, false);
        return;
    }
    
    try {
        const userId = currentUser.id || currentUser._id;
        const response = await fetch(`${API_URL}/books/${bookId}/rating/${userId}`);
        
        if (!response.ok) throw new Error('Failed to fetch rating');
        
        const data = await response.json();
        
        if (data.success) {
            updateRatingUI(
                data.data.averageRating || 0,
                data.data.totalRatings || 0,
                data.data.userRating || 0,
                data.data.hasRated || false,
                true
            );
        }
    } catch (error) {
        console.error('Error loading rating:', error);
        updateRatingUI(0, 0, 0, false, false);
    }
}

function updateRatingUI(averageRating, totalRatings, userRating, hasRated, isLoggedIn) {
    const avgElement = document.getElementById('average-rating-text');
    const totalElement = document.getElementById('total-ratings-count');
    const yourRatingElement = document.getElementById('your-rating');
    const messageElement = document.getElementById('rating-message');
    
    if (!avgElement) {
        console.warn('Rating elements not found in modal');
        return;
    }
    
    if (totalRatings > 0 && averageRating > 0) {
        avgElement.textContent = `${averageRating.toFixed(1)}/5.0`;
        avgElement.style.cssText = 'font-weight: bold; color: #f2b705;';
    } else {
        avgElement.textContent = 'Not rated';
        avgElement.style.cssText = 'font-weight: normal; color: #b0b7d9;';
    }
    
    if (totalElement) {
        totalElement.textContent = totalRatings;
        totalElement.className = 'rating-count';
    }
    
    if (!isLoggedIn) {
        if (messageElement) {
            messageElement.textContent = 'Login to rate this book';
            messageElement.style.color = '#b0b7d9';
        }
        if (yourRatingElement) {
            yourRatingElement.textContent = '';
            yourRatingElement.style.display = 'none';
        }
        resetStars();
    } else if (hasRated && userRating > 0) {
        if (yourRatingElement) {
            yourRatingElement.textContent = `[ Your rating: ${userRating}/5 ]`;
            yourRatingElement.style.cssText = 'display: inline; margin-left: 10px; color: #00adb5; font-weight: bold;';
        }
        if (messageElement) {
            messageElement.textContent = 'Click stars to change rating';
            messageElement.style.color = '#b0b7d9';
        }
        highlightStars(userRating, false);
    } else {
        if (yourRatingElement) {
            yourRatingElement.textContent = '';
            yourRatingElement.style.display = 'none';
        }
        if (messageElement) {
            messageElement.textContent = 'Click stars to rate';
            messageElement.style.color = '#b0b7d9';
        }
        resetStars();
    }
    
    setupStarListeners(isLoggedIn, hasRated, userRating);
}

function highlightStars(rating, isHover = false) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        const starValue = parseInt(star.getAttribute('data-value'));
        
        star.classList.remove('active', 'hover');
        
        if (starValue <= rating) {
            star.classList.add(isHover ? 'hover' : 'active');
            star.textContent = '★';
        } else {
            star.textContent = '☆';
            star.style.color = '';
            star.style.textShadow = '';
        }
    });
}

function resetStars() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.classList.remove('active', 'hover');
        star.textContent = '☆';
        star.style.color = '';
        star.style.textShadow = '';
    });
}

function setupStarListeners(isLoggedIn = false, hasRated = false, userRating = 0) {
    const stars = document.querySelectorAll('.star');
    const starsContainer = document.querySelector('.stars-container');
    
    if (!starsContainer || !stars.length) return;
    
    stars.forEach(star => {
        const newStar = star.cloneNode(true);
        star.parentNode.replaceChild(newStar, star);
    });
    
    const freshStars = document.querySelectorAll('.star');
    
    freshStars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            if (!isLoggedIn) return;
            const rating = parseInt(star.getAttribute('data-value'));
            highlightStars(rating, true);
        });
        
        star.addEventListener('click', async () => {
            if (!isLoggedIn) {
                Swal.fire({
                    title: 'Login Required',
                    text: 'Please login to rate books',
                    icon: 'warning',
                    confirmButtonColor: '#f2b705',
                    background: '#2d3047',
                    color: '#ffffff'
                });
                return;
            }
            
            if (!currentBookIdForRating) {
                console.warn('No book ID for rating');
                return;
            }
            
            const rating = parseInt(star.getAttribute('data-value'));
            await submitRating(rating);
        });
    });
    
    starsContainer.addEventListener('mouseleave', () => {
        const yourRatingElement = document.getElementById('your-rating');
        if (yourRatingElement && yourRatingElement.textContent.includes('Your rating:')) {
            const currentRating = parseInt(yourRatingElement.textContent.split(':')[1].split('/')[0].trim());
            highlightStars(currentRating, false);
        } else {
            resetStars();
        }
    });
}

async function submitRating(rating) {
    if (!currentUser || !currentBookIdForRating) return;
    
    try {
        const response = await fetch(`${API_URL}/books/${currentBookIdForRating}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id || currentUser._id,
                rating: rating
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateRatingUI(
                data.data.averageRating || 0,
                data.data.totalRatings || 0,
                data.data.userRating || 0,
                true,
                true
            );
            
            Swal.fire({
                title: 'Thanks!',
                text: `You rated this book ${rating} star${rating > 1 ? 's' : ''}`,
                icon: 'success',
                confirmButtonColor: '#00adb5',
                background: '#2d3047',
                color: '#ffffff',
                timer: 1500,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to submit rating',
            icon: 'error',
            confirmButtonColor: '#ff6b6b',
            background: '#2d3047',
            color: '#ffffff'
        });
    }
}

// ==========================================
//  PROFILE DROPDOWN
// ==========================================
function setupProfileDropdown() {
    const avatar = document.getElementById('user-avatar');
    const menu = document.getElementById('profile-menu');
    
    const userString = localStorage.getItem('user');
    const adminList = ["Ryan67", "cccb762", "FriendName2"];
    const adminLink = document.querySelector('a[href="admin.html"]');
    
    if (userString && adminLink) {
        const user = JSON.parse(userString);
        if (adminList.includes(user.username)) {
            adminLink.style.display = "block";
        } else {
            adminLink.style.display = "none";
        }
    }

    if (avatar && menu) {
        avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
        window.onclick = () => menu.classList.remove('show');
    }
}

// ==========================================
//  SCROLL BUTTONS
// ==========================================
function setupScrollButtons() {
    const wrappers = document.querySelectorAll(".book-row-wrapper");
    wrappers.forEach(wrapper => {
        const row = wrapper.querySelector(".book-row");
        const left = wrapper.querySelector(".left-icon");
        const right = wrapper.querySelector(".right-icon");
        if(row && left && right) {
            left.onclick = () => row.scrollBy({left: -300, behavior:'smooth'});
            right.onclick = () => row.scrollBy({left: 300, behavior:'smooth'});
        }
    });
}

// ==========================================
//  LOGOUT
// ==========================================
window.handleLogout = async function() {
    try {
        await fetch(`${API_URL}/auth/logout`, { 
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        console.error("Logout failed on server", e);
    }

    localStorage.removeItem('user');
    currentUser = null;
    window.location.href = 'index.html';
};

// ==========================================
//  COMMENTS SYSTEM
// ==========================================
async function loadComments() {
    const container = document.getElementById('commentContainer');
    if(!container) return;

    try {
        const res = await fetch(`${API_URL}/comments`);
        const data = await res.json();
        
        if(data.success) {
            container.innerHTML = '';
            
            if (data.comments.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:#ccc;padding:40px;">No comments yet. Be the first to comment!</p>';
                return;
            }
            
            const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;
            
            data.comments.forEach(comment => {
                const userLiked = currentUserId ? 
                    comment.likes.some(likeId => likeId.toString() === currentUserId.toString()) : 
                    false;
                
                let authorId = null;
                if (comment.userId) {
                    if (typeof comment.userId === 'object') {
                        authorId = comment.userId._id || comment.userId.id;
                    } else {
                        authorId = comment.userId;
                    }
                }
                
                const card = createCommentCard(
                    comment.username, 
                    comment.text, 
                    comment.image,
                    comment._id,
                    comment.likes ? comment.likes.length : 0,
                    comment.replies || [],
                    authorId,
                    userLiked
                );
                container.appendChild(card);
            });
            
            container.scrollTop = 0;
        }
    } catch(e) {
        console.error('Error loading comments:', e);
    }
}

function updateLikeButton(button, userLiked, likesCount) {
    button.dataset.liked = userLiked;
    
    if (userLiked) {
        button.classList.add('liked');
    } else {
        button.classList.remove('liked');
    }
    
    if (userLiked) {
        button.innerHTML = `👍 Liked (${likesCount})`;
    } else {
        if (likesCount > 0) {
            button.innerHTML = `👍 Like (${likesCount})`;
        } else {
            button.innerHTML = `👍 Like`;
        }
    }
}

function createCommentCard(name, text, imgSrc = null, commentId = null, likesCount = 0, replies = [], authorId = null, userLiked = false) {
    const card = document.createElement("div");
    card.className = "comment-card";
    card.dataset.commentId = commentId;

    const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;
    const currentUsername = currentUser ? currentUser.username : null;
    
    let isOwnCommentById = false;
    if (currentUserId && authorId) {
        isOwnCommentById = currentUserId.toString() === authorId.toString();
    }
    
    let isOwnCommentByUsername = false;
    if (currentUsername && name) {
        isOwnCommentByUsername = currentUsername === name;
    }
    
    const isOwnComment = isOwnCommentById || isOwnCommentByUsername;
    
    let imgHTML = imgSrc ? `<img src="${imgSrc}" alt="uploaded image" class="comment-image">` : "";
    
    let repliesHTML = '';
    if (replies && replies.length > 0) {
        repliesHTML = `
            <div class="replies-container">
                ${replies.map(reply => `
                    <div class="reply-text">
                        <strong>${reply.username}:</strong> ${reply.text}
                    </div>
                `).join('')}
            </div>
        `;
    }

    let initialButtonText;
    let buttonClass = 'like-btn';
    
    if (userLiked) {
        initialButtonText = `👍 Liked (${likesCount})`;
        buttonClass += ' liked';
    } else {
        if (likesCount > 0) {
            initialButtonText = `👍 Like (${likesCount})`;
        } else {
            initialButtonText = `👍 Like`;
        }
    }

    const deleteButtonHTML = isOwnComment ? 
        `<button class="delete-btn" title="Delete comment">
            <i class="fa-solid fa-trash"></i>
        </button>` : '';

    card.innerHTML = `
        <div class="comment-header">
            <strong class="comment-author">${name}</strong>
            ${deleteButtonHTML}
        </div>
        <div class="comment-body">${text}</div>
        ${imgHTML}
        <div class="comment-actions">
            <button class="${buttonClass}" data-liked="${userLiked}">
                ${initialButtonText}
            </button>
            <button class="reply-btn">
                💬 Reply
            </button>
        </div>
        <div class="reply-box">
            <textarea placeholder="Write a reply..." class="reply-textarea"></textarea>
            <button class="send-reply">
                Reply
            </button>
        </div>
        ${repliesHTML}
    `;

    if (isOwnComment) {
        const deleteBtn = card.querySelector(".delete-btn");
        deleteBtn.addEventListener("click", async () => {
            if (!confirm('Are you sure you want to delete this comment?')) {
                return;
            }
            
            const originalHTML = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            deleteBtn.disabled = true;
            
            try {
                const response = await fetch(`${API_URL}/comments/${commentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: currentUser.id || currentUser._id,
                        username: currentUser.username
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(-100px)';
                    card.style.height = '0';
                    card.style.margin = '0';
                    card.style.padding = '0';
                    card.style.overflow = 'hidden';
                    card.style.transition = 'all 0.3s ease';
                    
                    setTimeout(() => {
                        card.remove();
                        
                        const container = document.getElementById('commentContainer');
                        if (container && container.children.length === 0) {
                            container.innerHTML = '<p style="text-align:center;color:#ccc;padding:40px;">No comments yet. Be the first to comment!</p>';
                        }
                    }, 300);
                } else {
                    deleteBtn.innerHTML = originalHTML;
                    deleteBtn.disabled = false;
                    
                    Swal.fire({
                        title: 'Error!',
                        text: data.message || 'Failed to delete comment',
                        icon: 'error',
                        confirmButtonColor: '#ff6b6b'
                    });
                }
            } catch (error) {
                deleteBtn.innerHTML = originalHTML;
                deleteBtn.disabled = false;
                
                console.error('Error deleting comment:', error);
                Swal.fire({
                    title: 'Error!',
                    text: 'Network error. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#ff6b6b'
                });
            }
        });
    }

    const likeBtn = card.querySelector(".like-btn");
    likeBtn.addEventListener("click", async () => {
        if (!currentUser) {
            alert('Please login to like comments');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/comments/${commentId}/like`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    userId: currentUser.id || currentUser._id 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                updateLikeButton(likeBtn, data.userLiked, data.likes);
            }
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    });

    const replyBtn = card.querySelector(".reply-btn");
    const replyBox = card.querySelector(".reply-box");
    
    if (!currentUser) {
        replyBtn.style.display = 'none';
    } else {
        replyBtn.addEventListener("click", () => {
            replyBox.style.display = replyBox.style.display === "flex" ? "none" : "flex";
        });
    }

    const sendReplyBtn = card.querySelector(".send-reply");
    
    sendReplyBtn.addEventListener("click", async () => {
        if (!currentUser) {
            alert('Please login to reply');
            return;
        }

        const replyText = replyBox.querySelector(".reply-textarea").value.trim();
        
        if(!replyText) {
            alert('Please write a reply');
            return;
        }

        await postReply(commentId, replyText, card, replyBox);
    });

    return card;
}

async function postReply(commentId, text, card, replyBox) {
    try {
        const response = await fetch(`${API_URL}/comments/${commentId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username: currentUser.username, 
                text: text
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            let repliesContainer = card.querySelector(".replies-container");
            if (!repliesContainer) {
                repliesContainer = document.createElement("div");
                repliesContainer.className = "replies-container";
                card.appendChild(repliesContainer);
            }

            const replyDiv = document.createElement("div");
            replyDiv.className = "reply-text";
            replyDiv.innerHTML = `<strong>${currentUser.username}:</strong> ${text}`;
            
            repliesContainer.appendChild(replyDiv);

            replyBox.querySelector(".reply-textarea").value = "";
            replyBox.style.display = "none";
        }
    } catch (error) {
        console.error('Error posting reply:', error);
        alert('Error posting reply. Please try again.');
    }
}

const postBtn = document.getElementById('postBtn');
if(postBtn) {
    postBtn.onclick = async () => {
        const usernameInput = document.getElementById('username');
        const text = document.getElementById('commentText').value;
        const imageInput = document.getElementById('commentImage');
        
        let username = currentUser ? currentUser.username : usernameInput.value.trim();
        
        if(!username || !text) {
            return alert("Please enter your name and comment!");
        }

        let imageBase64 = null;

        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                imageBase64 = e.target.result;
                await postComment(username, text, imageBase64);
            }
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            await postComment(username, text, null);
        }
    };
}

async function postComment(username, text, image) {
    try {
        await fetch(`${API_URL}/comments`, {
            method: 'POST', 
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                username: username, 
                text: text,
                image: image,
                userId: currentUser ? (currentUser._id || currentUser.id) : null
            })
        });
        
        loadComments();
        document.getElementById('commentText').value = '';
        document.getElementById('commentImage').value = '';
        
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImage = document.getElementById('imagePreview');
        if (previewContainer) previewContainer.style.display = 'none';
        if (previewImage) previewImage.src = '';
        
        if (!currentUser) {
            document.getElementById('username').value = '';
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        alert('Error posting comment. File too large, please try again. ');
    }
}

// ==========================================
//  IMAGE PREVIEW SETUP
// ==========================================
function setupImagePreview() {
    const imageInput = document.getElementById('commentImage');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImage = document.getElementById('imagePreview');
    const removeButton = document.getElementById('removeImage');
    
    if (!imageInput || !previewContainer || !previewImage || !removeButton) return;
    
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        
        if (file) {
            if (!file.type.match('image.*')) {
                alert('Please select an image file (JPG, PNG, GIF, etc.)');
                this.value = '';
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                this.value = '';
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewContainer.style.display = 'block';
            }
            
            reader.readAsDataURL(file);
        } else {
            previewContainer.style.display = 'none';
        }
    });
    
    removeButton.addEventListener('click', function() {
        imageInput.value = '';
        previewImage.src = '';
        previewContainer.style.display = 'none';
    });
}

// ==========================================
//  OPEN PDF READER
// ==========================================
function openReader(pdfUrl) {
    if (!pdfUrl || pdfUrl === "#" || pdfUrl === "") {
        return Swal.fire('Sorry', 'This book does not have a PDF version yet.', 'info');
    }
    
    const modal = document.getElementById('pdfReaderModal');
    const frame = document.getElementById('pdfFrame');
    
    frame.src = pdfUrl;
    modal.style.display = "flex";
}

window.closeReader = function() {
    document.getElementById('pdfReaderModal').style.display = "none";
    document.getElementById('pdfFrame').src = "";
};

// ==========================================
//  FOOTER MODALS
// ==========================================
function openTerms() {
    document.getElementById("termsModal").style.display = "block";
}

function closeTerms() {
    document.getElementById("termsModal").style.display = "none";
}

function openSupport() {
    document.getElementById("supportModal").style.display = "block";
}

function closeSupport() {
    document.getElementById("supportModal").style.display = "none";
}

function openPolicy() {
    document.getElementById("policyModal").style.display = "block";
}

function closePolicy() {
    document.getElementById("policyModal").style.display = "none";
}

function openCompany() {
    document.getElementById("companyModal").style.display = "block";
}

function closeCompany() {
    document.getElementById("companyModal").style.display = "none";
}

// ==========================================
//  ACTION FUNCTIONS
// ==========================================

// Add to Wishlist
async function addToWishlist(bookData) {
    let userString = localStorage.getItem('user');
    
    if (!userString || userString === "undefined" || userString === "null") {
        localStorage.removeItem('user');
        return Swal.fire({
            title: 'Login Required',
            text: 'Please login first',
            icon: 'warning',
            confirmButtonColor: '#f2b705'
        }).then(() => {
            window.location.href = 'login.html';
        });
    }

    let userId;
    try {
        const user = JSON.parse(userString);
        userId = user.id || user._id;
    } catch (e) {
        localStorage.removeItem('user');
        window.location.reload();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/books/wishlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                title: bookData.title,
                author: bookData.author,
                coverImage: bookData.coverImage || bookData.src
            })
        });
        const json = await res.json();
        
        if (json.success) {
            Swal.fire({
                title: 'Added to Favorites!',
                text: json.message,
                icon: 'success',
                confirmButtonText: 'Ok',
                confirmButtonColor: '#f2b705',
                background: '#1a1a2e', 
                color: '#fff'
            });
        } else {
            Swal.fire({
                title: 'Oops...',
                text: 'Already in favorites',
                icon: 'info',
                background: '#1a1a2e', 
                color: '#fff',
                confirmButtonColor: '#ff6b6b'
            });
        }
    } catch (e) {
        Swal.fire('Error', 'Failed to add to favorites', 'error');
    }
}

// Borrow Book
async function borrowBook(bookData) {
    let userString = localStorage.getItem('user');
    
    if (!userString || userString === "undefined" || userString === "null") {
        localStorage.removeItem('user');
        return Swal.fire({
            title: 'Login Required',
            text: 'Please login first',
            icon: 'warning',
            confirmButtonColor: '#f2b705'
        }).then(() => {
            window.location.href = 'login.html';
        });
    }

    let userId;
    try {
        const user = JSON.parse(userString);
        userId = user.id || user._id;
    } catch (e) {
        localStorage.removeItem('user');
        window.location.reload();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/books/borrow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                title: bookData.title,
                author: bookData.author,
                coverImage: bookData.coverImage || bookData.src
            })
        });
        const json = await res.json();
        
        if (json.success) {
            Swal.fire({
                title: 'Book Borrowed!',
                text: json.message,
                icon: 'success',
                confirmButtonText: 'Ok',
                confirmButtonColor: '#f2b705',
                background: '#1a1a2e', 
                color: '#fff'
            }).then(() => {
                updateModalAfterBorrow(bookData.id);
            });
        } else {
            Swal.fire({
                title: 'Cannot Borrow',
                text: json.message,
                icon: 'error',
                background: '#1a1a2e', 
                color: '#fff',
                confirmButtonColor: '#ff6b6b'
            });
        }
    } catch (e) {
        Swal.fire('Error', 'Failed to borrow book', 'error');
    }
}

// ==========================================
//  GLOBAL FUNCTIONS
// ==========================================
window.selectRecentSearch = selectRecentSearch;
window.removeRecentSearch = removeRecentSearch;
window.clearAllRecentSearches = clearAllRecentSearches;
window.openBookModalFromSearch = openBookModalFromSearch;
window.showAllSearchResults = showAllSearchResults;
window.closeReader = closeReader;
window.handleLogout = handleLogout;
