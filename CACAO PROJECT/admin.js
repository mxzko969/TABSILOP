const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginMessage = document.getElementById('adminLoginMessage');
const adminLoginSection = document.getElementById('adminLoginSection');
const adminDashboardSection = document.getElementById('adminDashboardSection');
const adminOrdersBody = document.getElementById('adminOrdersBody');
const adminOrdersTotal = document.getElementById('adminOrdersTotal');
const adminTotalSales = document.getElementById('adminTotalSales');
const adminLogoutButton = document.getElementById('adminLogoutButton');

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH')}`;
}

function isAdminLoggedIn() {
  return localStorage.getItem('adminLoggedIn') === 'true';
}

function showDashboard() {
  adminLoginSection.classList.add('hidden');
  adminDashboardSection.classList.remove('hidden');
}

function showLogin() {
  adminLoginSection.classList.remove('hidden');
  adminDashboardSection.classList.add('hidden');
}

async function loadAdminOrders() {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Unable to load orders');
    const orders = await res.json();
    if (!orders.length) {
      adminOrdersBody.innerHTML = '<tr><td colspan="8" class="empty-row">No orders found.</td></tr>';
      adminOrdersTotal.textContent = '0';
      adminTotalSales.textContent = formatPeso(0);
      return;
    }

    adminOrdersBody.innerHTML = orders.map((order) => `
      <tr>
        <td>${order.id || '—'}</td>
        <td>${order.email || '—'}</td>
        <td>${order.name || '—'}</td>
        <td>${order.bundle || '—'}</td>
        <td>${order.quantity || 1}</td>
        <td>${formatPeso(order.price)}</td>
        <td>${order.date || '—'}</td>
        <td>${order.time || '—'}</td>
      </tr>
    `).join('');

    const totalSales = orders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
    adminOrdersTotal.textContent = orders.length;
    adminTotalSales.textContent = formatPeso(totalSales);
  } catch (error) {
    adminOrdersBody.innerHTML = '<tr><td colspan="8" class="empty-row">Failed to load orders.</td></tr>';
    adminOrdersTotal.textContent = '0';
    adminTotalSales.textContent = formatPeso(0);
  }
}

adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminLoginMessage.textContent = '';

  const password = document.getElementById('adminPassword').value.trim();
  if (!password) {
    adminLoginMessage.textContent = 'Please enter the admin password.';
    return;
  }

  try {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Admin login failed');

    localStorage.setItem('adminLoggedIn', 'true');
    showDashboard();
    loadAdminOrders();
  } catch (error) {
    adminLoginMessage.textContent = error.message;
  }
});

adminLogoutButton.addEventListener('click', () => {
  localStorage.removeItem('adminLoggedIn');
  showLogin();
});

if (isAdminLoggedIn()) {
  showDashboard();
  loadAdminOrders();
} else {
  showLogin();
}
