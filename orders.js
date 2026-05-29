const filterEmailInput = document.getElementById('filterEmail');
const refreshOrdersButton = document.getElementById('refreshOrders');
const ordersTableBody = document.getElementById('ordersTableBody');
const ordersTotal = document.getElementById('ordersTotal');
const ordersSales = document.getElementById('ordersSales');
const ordersMatched = document.getElementById('ordersMatched');
const ordersStatus = document.getElementById('ordersStatus');

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH')}`;
}

function renderOrders(orders, filterId) {
  const filteredOrders = filterId
    ? orders.filter((order) => order.email?.toLowerCase().includes(filterId.toLowerCase()))
    : orders;

  ordersTableBody.innerHTML = '';

  if (!filteredOrders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="8" class="empty-row">No orders found.</td></tr>';
    ordersStatus.textContent = filterId ? 'No orders match that email.' : 'No orders available yet.';
  } else {
    filteredOrders.forEach((order) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${order.id || '—'}</td>
        <td>${order.email || '—'}</td>
        <td>${order.name || '—'}</td>
        <td>${order.bundle || '—'}</td>
        <td>${order.quantity || 1}</td>
        <td>${formatPeso(order.price)}</td>
        <td>${order.date || '—'}</td>
        <td>${order.time || '—'}</td>
      `;
      ordersTableBody.appendChild(row);
    });
    ordersStatus.textContent = `Showing ${filteredOrders.length} order(s).`;
  }

  const totalSales = orders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
  ordersTotal.textContent = orders.length;
  ordersSales.textContent = formatPeso(totalSales);
  ordersMatched.textContent = filteredOrders.length;
}

async function loadOrders() {
  ordersStatus.textContent = 'Loading orders...';
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Unable to load orders');
    const orders = await res.json();
    renderOrders(orders, filterEmailInput.value.trim());
  } catch (error) {
    ordersStatus.textContent = 'Failed to load orders.';
    ordersTableBody.innerHTML = '<tr><td colspan="8" class="empty-row">Unable to fetch order data.</td></tr>';
    console.error(error);
  }
}

refreshOrdersButton.addEventListener('click', loadOrders);
filterEmailInput.addEventListener('input', () => loadOrders());

loadOrders();
