const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');
const urlParams = new URLSearchParams(window.location.search);
const nextPage = urlParams.get('next') || 'profile.html';

if (localStorage.getItem('userEmail')) {
  location.href = nextPage;
}

const loginLink = document.querySelector('a[href="login.html"]');
if (loginLink && urlParams.get('next')) {
  loginLink.href = `login.html?next=${encodeURIComponent(urlParams.get('next'))}`;
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerMessage.textContent = '';

  const name = document.getElementById('name').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (!name || !contact || !email || !address || !password || !confirmPassword) {
    registerMessage.textContent = 'Please fill out all fields.';
    return;
  }

  if (password !== confirmPassword) {
    registerMessage.textContent = 'Passwords do not match.';
    return;
  }

  if (!/^\d{4}$/.test(password)) {
    registerMessage.textContent = 'Password must be exactly 4 digits.';
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contact, email, address, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Registration failed');

    localStorage.setItem('userEmail', email);
    location.href = nextPage;
  } catch (error) {
    registerMessage.textContent = error.message;
  }
});
