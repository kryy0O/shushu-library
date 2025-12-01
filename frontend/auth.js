// API Base URL
const API_URL = 'http://localhost:5000/api';

console.log('🚀 Auth.js loaded! API:', API_URL);

// Helper Functions
function showError(message) {
    console.log('❌ ERROR:', message);
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (successDiv) successDiv.style.display = 'none';
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    } else {
        alert('Error: ' + message);
    }
}

function showSuccess(message) {
    console.log('✅ SUCCESS:', message);
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    } else {
        alert(message);
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = input.parentElement.querySelector('.toggle-password i');
    if (!icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}

function setLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-block';
        button.disabled = true;
    } else {
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

// LOGIN HANDLER
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    console.log('📝 Login form found');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🔑 Login attempt...');
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        
        console.log('Email:', email);
        
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        setLoading(loginBtn, true);
        
        try {
            console.log('📡 Sending to:', `${API_URL}/auth/login`);
            
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            
            console.log('📨 Status:', response.status);
            const data = await response.json();
            console.log('📦 Data:', data);
            
            if (response.ok && data.success) {
                showSuccess('Login successful! Redirecting...');
                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(() => window.location.href = 'index.html', 1000);
            } else {
                showError(data.message || 'Invalid email or password');
            }
        } catch (error) {
            console.error('💥 Error:', error);
            showError('Cannot connect to server. Is backend running?');
        } finally {
            setLoading(loginBtn, false);
        }
    });
}

// REGISTER HANDLER
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    console.log('📝 Register form found');
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('✍️ Register attempt...');
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        const registerBtn = document.getElementById('registerBtn');
        
        console.log('Username:', username, 'Email:', email);
        
        // Validation
        if (!username || !email || !password || !confirmPassword) {
            showError('Please fill in all fields');
            return;
        }
        
        if (username.length < 3) {
            showError('Username must be at least 3 characters');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        if (!agreeTerms) {
            showError('Please agree to Terms & Conditions');
            return;
        }
        
        setLoading(registerBtn, true);
        
        try {
            console.log('📡 Sending to:', `${API_URL}/auth/register`);
            
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, email, password })
            });
            
            console.log('📨 Status:', response.status);
            const data = await response.json();
            console.log('📦 Data:', data);
            
            if (response.ok && data.success) {
                showSuccess('Registration successful! Redirecting...');
                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(() => window.location.href = 'index.html', 2000);
            } else {
                showError(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('💥 Error:', error);
            showError('Cannot connect to server. Is backend running?');
        } finally {
            setLoading(registerBtn, false);
        }
    });
}

// Check auth status
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_URL}/auth/check`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.isAuthenticated) {
            localStorage.setItem('user', JSON.stringify(data.user));
            const path = window.location.pathname;
            if (path.includes('login.html') || path.includes('register.html')) {
                console.log('✅ Already logged in, redirecting...');
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded');
    checkAuthStatus();
});