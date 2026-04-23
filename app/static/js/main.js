// Helper for showing alerts
function showAlert(message, type = 'success') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `<span>${message}</span>`;
    container.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Helper for button loading state
function setBtnLoading(btn, isLoading) {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="loader"></div>';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText;
    }
}

// --- AUTH LOGIC ---

// Registration
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        setBtnLoading(btn, true);
        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                showAlert(result.message);
                localStorage.setItem('pending_email', data.email);
                setTimeout(() => window.location.href = '/auth/verify-otp', 1500);
            } else {
                showAlert(result.error, 'error');
            }
        } catch (err) {
            showAlert('Something went wrong', 'error');
        } finally {
            setBtnLoading(btn, false);
        }
    });
}

// Verify OTP
const verifyForm = document.getElementById('verify-form');
if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const data = {
            email: localStorage.getItem('pending_email'),
            otp: document.getElementById('otp').value,
            purpose: 'register'
        };

        setBtnLoading(btn, true);
        try {
            const res = await fetch('/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                showAlert(result.message);
                localStorage.removeItem('pending_email');
                setTimeout(() => window.location.href = '/auth/login', 1500);
            } else {
                showAlert(result.error, 'error');
            }
        } catch (err) {
            showAlert('Verification failed', 'error');
        } finally {
            setBtnLoading(btn, false);
        }
    });
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const data = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        setBtnLoading(btn, true);
        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                showAlert('Welcome back!');
                setTimeout(() => window.location.href = '/', 1000);
            } else {
                showAlert(result.error, 'error');
            }
        } catch (err) {
            showAlert('Login failed', 'error');
        } finally {
            setBtnLoading(btn, false);
        }
    });
}

// Forgot Password Flow
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const btn = e.target.querySelector('button');
        setBtnLoading(btn, true);
        const res = await fetch('/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await res.json();
        setBtnLoading(btn, false);
        if (res.ok) {
            localStorage.setItem('reset_email', email);
            document.getElementById('forgot-step-1').style.display = 'none';
            document.getElementById('forgot-step-2').style.display = 'block';
            showAlert(result.message);
        } else {
            showAlert(result.error, 'error');
        }
    });
}

const forgotVerifyForm = document.getElementById('forgot-verify-form');
if (forgotVerifyForm) {
    forgotVerifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            email: localStorage.getItem('reset_email'),
            otp: document.getElementById('otp-reset').value,
            purpose: 'reset'
        };
        const res = await fetch('/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
            document.getElementById('forgot-step-2').style.display = 'none';
            document.getElementById('forgot-step-3').style.display = 'block';
            showAlert(result.message);
        } else {
            showAlert(result.error, 'error');
        }
    });
}

const resetForm = document.getElementById('reset-form');
if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('new-password').value;
        const res = await fetch('/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const result = await res.json();
        if (res.ok) {
            showAlert(result.message);
            setTimeout(() => window.location.href = '/auth/login', 1500);
        } else {
            showAlert(result.error, 'error');
        }
    });
}

// --- DASHBOARD CRUD LOGIC ---

const recordsGrid = document.getElementById('records-grid');
if (recordsGrid) {
    // Load Records
    const fetchRecords = async () => {
        const res = await fetch('/api/records');
        const records = await res.json();
        recordsGrid.innerHTML = records.map(r => `
            <div class="record-card">
                <h3>${r.title}</h3>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">${r.description || 'No description'}</p>
                <div class="record-actions">
                    <button class="btn-small" onclick="editRecord(${r.id}, '${r.title}', '${r.description}')">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteRecord(${r.id})">Delete</button>
                </div>
            </div>
        `).join('');
    };

    fetchRecords();

    // Modal Logic
    const modal = document.getElementById('record-modal');
    const recordForm = document.getElementById('record-form');

    document.getElementById('btn-add-record').onclick = () => {
        document.getElementById('modal-title').innerText = 'Add Record';
        recordForm.reset();
        document.getElementById('record-id').value = '';
        modal.style.display = 'flex';
    };

    document.getElementById('btn-close-modal').onclick = () => {
        modal.style.display = 'none';
    };

    window.editRecord = (id, title, desc) => {
        document.getElementById('modal-title').innerText = 'Edit Record';
        document.getElementById('record-id').value = id;
        document.getElementById('record-title').value = title;
        document.getElementById('record-desc').value = desc === 'None' ? '' : desc;
        modal.style.display = 'flex';
    };

    recordForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('record-id').value;
        const data = {
            title: document.getElementById('record-title').value,
            description: document.getElementById('record-desc').value
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/records/${id}` : '/api/records';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showAlert(`Record ${id ? 'updated' : 'created'} successfully`);
            modal.style.display = 'none';
            fetchRecords();
        } else {
            showAlert('Failed to save record', 'error');
        }
    };

    window.deleteRecord = async (id) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showAlert('Record deleted');
            fetchRecords();
        } else {
            showAlert('Failed to delete', 'error');
        }
    };
}
