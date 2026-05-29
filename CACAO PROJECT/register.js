const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');
const urlParams = new URLSearchParams(window.location.search);
const requestedNextPage = urlParams.get('next') || 'index.html';
const authPages = new Set(['login.html', 'register.html']);
const nextPage = authPages.has(requestedNextPage) ? 'index.html' : requestedNextPage;

if (localStorage.getItem('userEmail')) {
  location.href = nextPage;
}

const loginLink = document.querySelector('a[href="login.html"]');
if (loginLink && urlParams.get('next')) {
  loginLink.href = `login.html?next=${encodeURIComponent(urlParams.get('next'))}`;
}

function lockPinInput(input) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
  });
}

lockPinInput(document.getElementById('password'));
lockPinInput(document.getElementById('confirmPassword'));

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
