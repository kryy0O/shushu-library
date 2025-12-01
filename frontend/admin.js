const API_URL = 'http://localhost:5000/api';

// 1. LIVE PREVIEW LOGIC
function updatePreview() {
    const title = document.getElementById('title').value || "Book Title";
    const author = document.getElementById('author').value || "Author Name";
    const cover = document.getElementById('cover').value;
    const stock = document.getElementById('stock').value;

    document.getElementById('preview-title').innerText = title;
    document.getElementById('preview-author').innerText = author;
    document.getElementById('preview-badge').innerText = stock + " left";

    const img = document.getElementById('preview-img');
    if (cover) {
        img.src = cover;
        // If image fails to load, revert to placeholder
        img.onerror = () => { img.src = 'https://via.placeholder.com/150?text=Invalid+Link'; };
    } else {
        img.src = 'https://via.placeholder.com/150?text=Cover';
    }
}

// 2. SUBMIT LOGIC
document.getElementById('addBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.querySelector('.submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
    btn.disabled = true;

    const bookData = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        category: document.getElementById('category').value,
        cover: document.getElementById('cover').value,
        pdfUrl: document.getElementById('pdfUrl').value,
        synopsis: document.getElementById('synopsis').value,
        year: parseInt(document.getElementById('year').value),
        stock: parseInt(document.getElementById('stock').value),
        rating: 5,
        borrowLink: '#'
    };

    try {
        const res = await fetch(`${API_URL}/books/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData)
        });

        const data = await res.json();

        if (data.success) {
            Swal.fire({
                title: 'Success!',
                text: 'Book added to library successfully!',
                icon: 'success',
                background: '#1a1a2e', color: '#fff', confirmButtonColor: '#f2b705'
            });
            document.getElementById('addBookForm').reset();
            updatePreview(); // Reset preview
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Server connection failed', 'error');
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add to Library';
        btn.disabled = false;
    }
});

// Expose to HTML
window.updatePreview = updatePreview;

// DELETE LOGIC
document.getElementById('deleteBtn').addEventListener('click', async () => {
    const title = document.getElementById('title').value;

    if (!title) {
        return Swal.fire('Wait!', 'Please type the Title of the book you want to delete.', 'warning');
    }

    // 1. Confirm First
    const result = await Swal.fire({
        title: 'Delete this book?',
        text: `Are you sure you want to delete "${title}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#333',
        confirmButtonText: 'Yes, Delete it!',
        background: '#1a1a2e',
        color: '#fff'
    });

    if (!result.isConfirmed) return;

    // 2. Send Delete Request
    try {
        // We use encodeURIComponent to handle spaces in titles like "Harry Potter"
        const res = await fetch(`${API_URL}/books/delete/${encodeURIComponent(title)}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (data.success) {
            Swal.fire({
                title: 'Deleted!',
                text: data.message,
                icon: 'success',
                background: '#1a1a2e', color: '#fff', confirmButtonColor: '#f2b705'
            });
            document.getElementById('addBookForm').reset();
            updatePreview(); // Reset preview to blank
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Server connection failed', 'error');
    }
});