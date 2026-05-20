const profileForm = document.getElementById('profileForm');
const profileMessage = document.getElementById('profileMessage');
const profileOrders = document.getElementById('profileOrders');
const logoutButton = document.getElementById('logoutButton');

const storedEmail = localStorage.getItem('userEmail');
if (!storedEmail) {
  location.href = 'login.html';
}

let currentEmail = storedEmail;

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH')}`;
}

async function loadProfile() {
  try {
    const res = await fetch(`/api/auth/profile?email=${encodeURIComponent(currentEmail)}`);
    if (!res.ok) throw new Error('Unable to load profile');
    const customer = await res.json();
    document.getElementById('name').value = customer.name || '';
    document.getElementById('contact').value = customer.contact || '';
    document.getElementById('email').value = customer.email || '';
    document.getElementById('address').value = customer.address || '';
    currentEmail = customer.email || currentEmail;
    localStorage.setItem('userEmail', currentEmail);
    loadOrders();
  } catch (error) {
    profileMessage.textContent = error.message;
  }
}

async function loadOrders() {
  profileOrders.textContent = 'Loading orders...';
  try {
    const res = await fetch(`/api/orders?email=${encodeURIComponent(currentEmail)}`);
    if (!res.ok) throw new Error('Unable to load orders');
    const orders = await res.json();
    if (!orders.length) {
      profileOrders.innerHTML = '<p class="form-note">You have no orders yet.</p>';
      return;
    }
    profileOrders.innerHTML = orders.slice().reverse().map(order => {
      const extrasText = order.extras && order.extras.length ? `Extras: ${order.extras.join(', ')}` : 'No extras';
      return `
        <article class="history-card">
          <h3>${order.bundle} ${order.quantity ? `× ${order.quantity}` : ''}</h3>
          <p><strong>Date:</strong> ${order.date || '—'} at ${order.time || '—'}</p>
          <p><strong>Price:</strong> ${formatPeso(order.price)}</p>
          <p>${extrasText}</p>
          <p>${order.notes ? `Notes: ${order.notes}` : ''}</p>
          <button type="button" class="cancel-order-button" data-order-id="${order.id}">Cancel Order</button>
        </article>
      `;
    }).join('');
  } catch (error) {
    profileOrders.textContent = 'Failed to load orders.';
  }
}

async function cancelOrder(orderId) {
  profileMessage.textContent = 'Cancelling order...';
  try {
    const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Unable to cancel order');

    profileMessage.textContent = 'Order cancelled successfully.';
    loadOrders();
  } catch (error) {
    profileMessage.textContent = error.message;
  }
}

profileOrders.addEventListener('click', (event) => {
  const button = event.target.closest('.cancel-order-button');
  if (!button) return;

  const orderId = button.dataset.orderId;
  if (!orderId) return;

  if (confirm('Are you sure you want to cancel this order?')) {
    cancelOrder(orderId);
  }
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  profileMessage.textContent = '';

  const name = document.getElementById('name').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (!name || !contact || !email || !address) {
    profileMessage.textContent = 'Please fill out all required fields.';
    return;
  }

  if (newPassword && !/^\d{4}$/.test(newPassword)) {
    profileMessage.textContent = 'New password must be exactly 4 digits.';
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    profileMessage.textContent = 'New passwords do not match.';
    return;
  }

  try {
    const payload = { currentEmail, name, contact, address, email };
    if (newPassword) {
      payload.password = newPassword;
    }

    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Unable to save profile');

    currentEmail = body.email;
    localStorage.setItem('userEmail', currentEmail);
    profileMessage.textContent = 'Profile saved successfully.';
    loadOrders();
  } catch (error) {
    profileMessage.textContent = error.message;
  }
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('userEmail');
  location.href = 'login.html';
});

loadProfile();
