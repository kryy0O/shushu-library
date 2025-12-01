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

            // 3. Render Lists
            renderGrid('reading-grid', user.readingList, 'reading');
            renderGrid('wishlist-grid', user.wishlist, 'wishlist');
            renderGrid('borrowed-grid', user.borrowHistory, 'borrowed');
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }

    // 4. Tab Switching Logic
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab') || 'borrowed';
    switchTab(activeTab);
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const selectedContent = document.getElementById(`tab-${tabName}`);
    if (selectedContent) selectedContent.classList.add('active');
}

function renderGrid(elementId, books, type) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!books || books.length === 0) {
        container.innerHTML = `<p style="color:#aaa; text-align:center; grid-column: 1/-1;">No books found in this list.</p>`;
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="profile-book-card">
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
//  LOGIC FOR RETURN BUTTON AND DATE
// =========================================================
function getActionButton(type, book) {
    // Only show for Borrowed Tab
    if (type === 'borrowed') {
        if (book.status === 'borrowed') {
            // --- OVERDUE LOGIC START ---
            const today = new Date();
            const due = new Date(book.dueDate);
            const isOverdue = today > due;
            
            // Format the date nicely (e.g., "Dec 5, 2025")
            const dateText = due.toLocaleDateString();
            
            let statusBadge = '';
            if (isOverdue) {
                statusBadge = `<div style="color:#ff4757; font-weight:bold; margin-bottom:5px;">⚠️ OVERDUE (Due: ${dateText})</div>`;
            } else {
                statusBadge = `<div style="color:#2ed573; margin-bottom:5px;">Due: ${dateText}</div>`;
            }
            // --- OVERDUE LOGIC END ---

            const safeTitle = book.bookTitle.replace(/'/g, "\\'");
            
            return `
                ${statusBadge}
                <button onclick="returnBook('${safeTitle}')" style="width:100%; background:#ff6b6b; border:none; color:white; padding:8px; border-radius:5px; cursor:pointer; font-weight:bold;">Return Book</button>
            `;
        } else {
            // Returned State
            let dateText = "Returned";
            if (book.returnDate) {
                dateText = "Returned: " + new Date(book.returnDate).toLocaleDateString();
            }
            return `<div style="margin-top:10px; background:#333; color:#aaa; padding:5px; border-radius:5px; font-size:11px;">${dateText}</div>`;
        }
    }
    if (type === 'wishlist') {
        return `<div style="margin-top:10px; color:#f2b705; font-size:12px;">Saved ❤️</div>`;
    }
    return '';
}

// Return Logic
window.returnBook = async (title) => {
    // Ask for confirmation
    if(typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Return Book?',
            text: `Return "${title}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes'
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
            if(typeof Swal !== 'undefined') await Swal.fire('Returned!', 'Book returned.', 'success');
            else alert("Book returned!");
            location.reload();
        }
    } catch (e) { console.error(e); }
};

window.switchTab = switchTab;
window.handleLogout = function() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}; 