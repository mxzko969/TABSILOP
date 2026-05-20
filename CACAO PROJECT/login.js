const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const urlParams = new URLSearchParams(window.location.search);
const nextPage = urlParams.get('next') || 'profile.html';

if (localStorage.getItem('userEmail')) {
  location.href = nextPage;
}

const registerLink = document.querySelector('a[href="register.html"]');
if (registerLink && urlParams.get('next')) {
  registerLink.href = `register.html?next=${encodeURIComponent(urlParams.get('next'))}`;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    loginMessage.textContent = 'Please enter email and password.';
    return;
  }

  if (!/^\d{4}$/.test(password)) {
    loginMessage.textContent = 'Password must be exactly 4 digits.';
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Login failed');

    localStorage.setItem('userEmail', email);
    location.href = nextPage;
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});
