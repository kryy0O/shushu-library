const API_URL = 'http://localhost:5000/api';
let currentUser = null;

console.log('🚀 Main.js loaded - Stable Version');

document.addEventListener("DOMContentLoaded", () => {
    // 1. Run Startup Checks safely
    safeCheckAuth();
    loadBooksFromDB(); 
    loadComments();
    setupProfileDropdown();
    setupSearchAndCategories();
    setupScrollButtons();
});

// ==========================================
//  1. CRASH-PROOF AUTHENTICATION
// ==========================================
async function safeCheckAuth() {
    const stored = localStorage.getItem('user');

    // FIX: Check for "undefined" string which causes the crash
    if (stored && stored !== "undefined" && stored !== "null") {
        try {
            currentUser = JSON.parse(stored);
            updateUI(currentUser);
        } catch (e) {
            console.error("Data corrupted. Logging out.");
            localStorage.removeItem('user'); // Auto-fix
            currentUser = null;
        }
    } else {
        // Clean up bad data
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
        console.log("Server check failed - Relying on local storage"); 
    }
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
            const books = result.data;
            
            const horrorRow = document.getElementById('horrorRow');
            const fantasyRow = document.getElementById('fantasyRow');
            const mysteryRow = document.getElementById('mysteryRow');

            if(horrorRow) horrorRow.innerHTML = '';
            if(fantasyRow) fantasyRow.innerHTML = '';
            if(mysteryRow) mysteryRow.innerHTML = '';

            books.forEach(book => {
                const html = createBookHTML(book);
                if (book.category === 'Horror' && horrorRow) horrorRow.innerHTML += html;
                else if (book.category === 'Fantasy' && fantasyRow) fantasyRow.innerHTML += html;
                else if (book.category === 'Mystery' && mysteryRow) mysteryRow.innerHTML += html;
            });

            attachModalListeners();
        }
    } catch (error) {
        console.error("Error loading books:", error);
    }
}

function createBookHTML(book) {
    // Logic: Stock Badge
    let stockBadge = '';
    const stock = book.stock !== undefined ? book.stock : 3;
    
    if (stock === 0) {
        stockBadge = `<span style="position:absolute; top:10px; right:10px; background:#ff4757; color:white; padding:4px 8px; border-radius:5px; font-size:11px; font-weight:bold; z-index: 2;">OUT OF STOCK</span>`;
    } else {
        stockBadge = `<span style="position:absolute; top:10px; right:10px; background:#00adb5; color:white; padding:4px 8px; border-radius:5px; font-size:11px; z-index: 2;">${stock} left</span>`;
    }

    return `
        <div class="book-item" style="position:relative;">
            ${stockBadge}
            <img src="${book.cover}" 
                 onerror="this.src='https://placehold.co/150x220?text=No+Image'"
                 data-title="${book.title}" 
                 data-author="${book.author}" 
                 data-synopsis="${book.synopsis}"
                 data-rating="${book.rating}"
                 data-year="${book.year}"
                 data-stock="${stock}"
                 data-pdf="${book.pdfUrl || ''}" 
                 alt="${book.title}">
            <p>${book.title}</p>
        </div>
    `;
}

// ==========================================
//  3. MODAL & BUTTONS
// ==========================================
// ==========================================
//  3. MODAL LOGIC (Reader + Inventory + Buttons)
// ==========================================
function attachModalListeners() {
    const modal = document.getElementById("bookModal");
    const cover = document.getElementById("modal-cover");
    const title = document.getElementById("modal-title");
    const author = document.getElementById("modal-author");
    const synop = document.getElementById("modal-synopsis");
    const borrowBtn = document.getElementById("modal-borrow");
    const closeBtn = document.querySelector(".close-modal");

    document.querySelectorAll(".book-item img").forEach(img => {
        img.addEventListener("click", () => {
            // 1. GET DATA (Including Stock & PDF)
            const stock = parseInt(img.dataset.stock || "0");
            const pdfLink = img.dataset.pdf; 

            const data = {
                src: img.src,
                title: img.dataset.title,
                author: img.dataset.author,
                desc: img.dataset.synopsis
            };

            // 2. FILL UI
            cover.src = data.src;
            title.innerText = data.title;
            author.innerText = "Author: " + data.author;
            synop.innerText = data.desc;

            // 3. SETUP EXTRA BUTTONS (Wishlist & Read)
            // Remove old buttons first
            const oldActions = borrowBtn.parentNode.querySelector('.extra-actions');
            if (oldActions) oldActions.remove();

            // Create container
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'extra-actions';
            actionsDiv.style.marginTop = '15px';
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '10px';

            actionsDiv.innerHTML = `
                <button id="btn-wishlist" style="background:#ff6b6b; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; flex:1;">
                    <i class="fa-solid fa-heart"></i> Wishlist
                </button>
                <button id="btn-read" style="background:#00adb5; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; flex:1;">
                    <i class="fa-solid fa-book-open"></i> Read Now
                </button>
            `;
            borrowBtn.parentNode.insertBefore(actionsDiv, borrowBtn.nextSibling);

            // --- CLICK EVENTS ---
            
            // Wishlist
            document.getElementById('btn-wishlist').onclick = () => safeSendAction('wishlist', data);
            
            // Read Now (Opens PDF Overlay)
            document.getElementById('btn-read').onclick = () => {
                if(!pdfLink || pdfLink === "#" || pdfLink === "undefined") {
                    Swal.fire('Sorry', 'PDF not available yet.', 'info');
                } else {
                    safeSendAction('reading', data, false); // Add to history silently
                    openReader(pdfLink); // <--- OPEN THE READER
                }
            };

            // 4. SETUP BORROW BUTTON (With Stock Logic)
            const newBorrowBtn = borrowBtn.cloneNode(true);
            borrowBtn.parentNode.replaceChild(newBorrowBtn, borrowBtn);

            if (stock > 0) {
                // ✅ IN STOCK
                newBorrowBtn.innerText = "Borrow Now";
                newBorrowBtn.style.background = "#f2b705";
                newBorrowBtn.style.cursor = "pointer";
                newBorrowBtn.disabled = false;
                newBorrowBtn.onclick = () => safeSendAction('borrow', data, true); // true = reload page
            } else {
                // ❌ OUT OF STOCK
                newBorrowBtn.innerText = "Out of Stock";
                newBorrowBtn.style.background = "#555";
                newBorrowBtn.style.cursor = "not-allowed";
                newBorrowBtn.disabled = true;
            }
            
            modal.style.display = "flex";
        });
    });

    if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if(e.target == modal) modal.style.display = "none"; };
}
// ...

// ==========================================
//  4. SAFE DATABASE SENDER
// ==========================================
// ==========================================
//  SAFE SEND ACTION (With Auto-Refresh)
// ==========================================
async function safeSendAction(action, data) {
    // 1. Double check user (Safety Check)
    let userString = localStorage.getItem('user');
    
    if (!userString || userString === "undefined" || userString === "null") {
        localStorage.removeItem('user'); // Clean bad data
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

    // 2. Send Request to Backend
    try {
        const res = await fetch(`${API_URL}/books/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                title: data.title,
                author: data.author,
                coverImage: data.src || data.cover // Handle both
            })
        });
        const json = await res.json();
        
        // 3. Handle Success OR Failure
        if (json.success) {
            // ✅ THE FIX: We use .then() to wait for the click
            Swal.fire({
                title: 'Awesome!',
                text: json.message,
                icon: 'success',
                confirmButtonText: 'Cool',
                confirmButtonColor: '#f2b705',
                background: '#1a1a2e', 
                color: '#fff'
            }).then(() => {
                // This runs ONLY after you click "Cool"
                window.location.reload(); 
            });
        } else {
            Swal.fire({
                title: 'Oops...',
                text: json.message,
                icon: 'error',
                background: '#1a1a2e', 
                color: '#fff',
                confirmButtonColor: '#ff6b6b'
            });
        }
    } catch (e) {
        Swal.fire('Error', 'Backend connection failed', 'error');
    }
}

// ==========================================
//  5. UTILITIES (Profile, Search, etc)
// ==========================================
function setupProfileDropdown() {
    const avatar = document.getElementById('user-avatar');
    const menu = document.getElementById('profile-menu');
    
    // 1. Get the current user
    const userString = localStorage.getItem('user');
    
    // 2. DEFINE YOUR ADMINS HERE
    // Add your friends' usernames inside this list!
    const adminList = ["Ryan67", "FriendName1", "FriendName"]; 

    const adminLink = document.querySelector('a[href="admin.html"]');
    
    if (userString && adminLink) {
        const user = JSON.parse(userString);
        
        // Check if the current user is in the list
        if (adminList.includes(user.username)) {
            adminLink.style.display = "block"; // Show the button
        } else {
            adminLink.style.display = "none"; // Hide it
        }
    }

    if (avatar && menu) {
        avatar.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
        window.onclick = () => menu.classList.remove('show');
    }
}

function setupSearchAndCategories() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.book-item').forEach(book => {
                const title = book.querySelector('p').innerText.toLowerCase();
                book.style.display = title.includes(term) ? 'block' : 'none';
            });
        });
    }
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            document.querySelectorAll('.category h3').forEach(h3 => {
                if(h3.innerText === category) h3.scrollIntoView({behavior: 'smooth', block: 'center'});
            });
        };
    });
}

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

window.handleLogout = async function() {
    // 1. Tell Server to destroy session
    try {
        await fetch(`${API_URL}/auth/logout`, { 
            method: 'POST',
            credentials: 'include' // Important! Sends the cookie to be deleted
        });
    } catch (e) {
        console.error("Logout failed on server", e);
    }

    // 2. Clear Browser Memory
    localStorage.removeItem('user');
    currentUser = null;

    // 3. Force Refresh to Guest Mode
    window.location.href = 'index.html';
};

async function loadComments() {
    const container = document.getElementById('commentContainer');
    if(!container) return;
    try {
        const res = await fetch(`${API_URL}/comments`);
        const data = await res.json();
        if(data.success) {
            container.innerHTML = data.comments.map(c => `
                <div style="background:white; color:black; padding:10px; margin-bottom:10px; border-radius:5px;">
                    <strong>${c.username}</strong>: ${c.text}
                </div>
            `).join('');
        }
    } catch(e) {}
}

const postBtn = document.getElementById('postBtn');
if(postBtn) {
    postBtn.onclick = async () => {
        const text = document.getElementById('commentText').value;
        if(!currentUser || !text) return alert("Login and write text!");
        await fetch(`${API_URL}/comments`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({username: currentUser.username, text})
        });
        loadComments();
        document.getElementById('commentText').value = '';
    };
}
// ==========================================
//  OPEN PDF READER
// ==========================================
function openReader(pdfUrl) {
    if (!pdfUrl || pdfUrl === "#" || pdfUrl === "") {
        return Swal.fire('Sorry', 'This book does not have a PDF version yet.', 'info');
    }
    
    // Show the modal
    const modal = document.getElementById('pdfReaderModal');
    const frame = document.getElementById('pdfFrame');
    
    frame.src = pdfUrl; // Load the PDF
    modal.style.display = "flex";
}

// Close function (Used by HTML)
window.closeReader = function() {
    document.getElementById('pdfReaderModal').style.display = "none";
    document.getElementById('pdfFrame').src = ""; // Stop loading
};