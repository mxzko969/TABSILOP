const orderForm = document.getElementById('orderForm');
const summaryBundle = document.getElementById('summaryBundle');
const summaryDate = document.getElementById('summaryDate');
const summaryTime = document.getElementById('summaryTime');
const summaryPrice = document.getElementById('summaryPrice');
const summaryExtras = document.getElementById('summaryExtras');
const summaryStatus = document.getElementById('summaryStatus');
const bundleInputs = document.querySelectorAll('input[name="bundle"]');
const newOrderButton = document.getElementById('newOrderButton');
const orderHistory = document.getElementById('orderHistory');
const summaryName = document.getElementById('summaryName');
const summaryDateRegistered = document.getElementById('summaryDateRegistered');
const profileName = document.getElementById('profileName');
const profileContact = document.getElementById('profileContact');
const profileEmail = document.getElementById('profileEmail');
const profileAddress = document.getElementById('profileAddress');
const profileDateRegistered = document.getElementById('profileDateRegistered');
const profileOrderCount = document.getElementById('profileOrderCount');
const profileRewards = document.getElementById('profileRewards');
const loadProfileButton = document.getElementById('loadProfileButton');
const mainContent = document.getElementById('mainContent');
const profileLink = document.getElementById('profileLink');
const adminLink = document.getElementById('adminLink');
const authNotice = document.getElementById('authNotice');

let currentProfile = null;
const loggedInEmail = localStorage.getItem('userEmail');
let isAuthenticated = Boolean(loggedInEmail);

const bundlePrices = {
  'Cacao Solo': 150,
  'Barkada': 450,
  'Gift Pack': 1400,
};

function formatPeso(amount) {
  return `₱${amount}`;
}

const pendingOrderKey = 'pendingOrderData';
const latestOrderKey = 'latestOrderReceipt';
const bundleQuantityInputs = {
  'Cacao Solo': 'soloQty',
  'Barkada': 'barkadaQty',
  'Gift Pack': 'giftPackQty',
};

let orders = [];

function getQuantityInput(bundle) {
  const id = bundleQuantityInputs[bundle];
  return id ? document.getElementById(id) : null;
}

function normalizeQuantity(input) {
  if (!input) return 1;
  const quantity = Math.max(1, parseInt(input.value || '1', 10) || 1);
  input.value = quantity;
  return quantity;
}

function getSelectedQuantity() {
  const selectedBundle = document.querySelector('input[name="bundle"]:checked')?.value || 'Cacao Solo';
  return normalizeQuantity(getQuantityInput(selectedBundle));
}

function getAllQuantities() {
  return Object.fromEntries(
    Object.keys(bundleQuantityInputs).map((bundle) => [bundle, normalizeQuantity(getQuantityInput(bundle))])
  );
}

function getOrderFormData() {
  return {
    name: document.getElementById('name').value.trim(),
    contact: document.getElementById('contact').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('address').value.trim(),
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    notes: document.getElementById('notes').value.trim(),
    bundle: document.querySelector('input[name="bundle"]:checked')?.value || 'Cacao Solo',
    extras: getSelectedExtras(),
    quantity: getSelectedQuantity(),
    quantities: getAllQuantities(),
  };
}

function savePendingOrder() {
  try {
    localStorage.setItem(pendingOrderKey, JSON.stringify(getOrderFormData()));
  } catch (e) {
    // ignore storage failures
  }
}

function loadPendingOrder() {
  const raw = localStorage.getItem(pendingOrderKey);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    restorePendingOrder(data);
  } catch (e) {
    // ignore invalid data
  }
}

function restorePendingOrder(data) {
  if (!data) return;
  if (document.getElementById('name')) document.getElementById('name').value = data.name || '';
  if (document.getElementById('contact')) document.getElementById('contact').value = data.contact || '';
  if (document.getElementById('email')) document.getElementById('email').value = data.email || '';
  if (document.getElementById('address')) document.getElementById('address').value = data.address || '';
  if (document.getElementById('date')) document.getElementById('date').value = data.date || '';
  if (document.getElementById('time')) document.getElementById('time').value = data.time || '';
  if (document.getElementById('notes')) document.getElementById('notes').value = data.notes || '';
  if (data.bundle) {
    const bundleInput = document.querySelector(`input[name="bundle"][value="${data.bundle}"]`);
    if (bundleInput) bundleInput.checked = true;
  }
  if (Array.isArray(data.extras)) {
    document.querySelectorAll('input[name="extras"]').forEach((input) => {
      input.checked = data.extras.includes(input.value);
    });
  }
  if (data.quantities && typeof data.quantities === 'object') {
    Object.entries(data.quantities).forEach(([bundle, quantity]) => {
      const input = getQuantityInput(bundle);
      if (input) input.value = Math.max(1, parseInt(quantity || '1', 10) || 1);
    });
  } else if (data.bundle) {
    const input = getQuantityInput(data.bundle);
    if (input) input.value = data.quantity || 1;
  }
  updateSummary();
}

function clearPendingOrder() {
  localStorage.removeItem(pendingOrderKey);
}

function setOrderAccess(enabled) {
  const fields = orderForm.querySelectorAll('input, textarea, button[type="submit"]');
  fields.forEach((field) => {
    field.disabled = !enabled;
  });
  if (document.getElementById('email')) {
    document.getElementById('email').readOnly = enabled && Boolean(loggedInEmail);
  }
  loadProfileButton.disabled = !enabled;
  if (!enabled) {
    newOrderButton.disabled = true;
  }
}

function showAuthPrompt() {
  summaryStatus.textContent = 'Please log in or register before placing an order.';
  summaryStatus.style.color = 'crimson';
}

function updatePageVisibility() {
  const loggedIn = isAuthenticated;
  authNotice.classList.toggle('hidden', loggedIn);
  if (mainContent) {
    mainContent.classList.toggle('hidden', !loggedIn);
  }
  if (profileLink) {
    profileLink.classList.toggle('hidden', !loggedIn);
  }
  if (adminLink) {
    adminLink.classList.add('hidden');
  }
}

async function initializeAuthState() {
  updatePageVisibility();

  if (!isAuthenticated) {
    setOrderAccess(false);
    showAuthPrompt();
    return;
  }

  setOrderAccess(true);
  if (document.getElementById('email')) {
    document.getElementById('email').value = loggedInEmail;
  }
  try {
    await fetchCustomerProfile(loggedInEmail);
    await fetchOrders();
  } catch (error) {
    currentProfile = null;
    setOrderAccess(false);
    showAuthPrompt();
  }
}

function getSelectedExtras() {
  return Array.from(document.querySelectorAll('input[name="extras"]:checked')).map(
    (input) => input.value
  );
}

function updateSummary() {
  const selectedBundle = document.querySelector('input[name="bundle"]:checked');
  summaryBundle.textContent = selectedBundle ? selectedBundle.value : 'None';
  const dateValue = document.getElementById('date').value;
  const timeValue = document.getElementById('time').value;
  let price = selectedBundle ? bundlePrices[selectedBundle.value] || 0 : 0;
  const extras = getSelectedExtras();
  const quantity = getSelectedQuantity();
  price = price * quantity;

  const email = document.getElementById('email').value.trim() || 'N/A';
  const clientName = document.getElementById('name').value.trim() || 'N/A';
  const activeProfileMatch = currentProfile?.email === email;

  summaryName.textContent = clientName;
  summaryDateRegistered.textContent = activeProfileMatch && currentProfile?.dateRegistered
    ? new Date(currentProfile.dateRegistered).toLocaleDateString()
    : 'Pending';
  summaryDate.textContent = dateValue || 'Not selected';
  summaryTime.textContent = timeValue || 'Not selected';
  summaryPrice.textContent = formatPeso(price);
  summaryExtras.textContent = extras.length ? extras.join(', ') : 'None';
  document.getElementById('summaryQuantity').textContent = quantity;
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Failed to load orders');
    orders = await res.json();
    renderOrderHistory();
  } catch (e) {
    orderHistory.innerHTML = '<li class="empty">Unable to load orders</li>';
  }
  updateCustomerProfile();
}

function renderOrderHistory() {
  orderHistory.innerHTML = '';

  if (!orders || !orders.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty';
    emptyItem.textContent = 'No transactions yet.';
    orderHistory.appendChild(emptyItem);
    return;
  }

  orders.slice().reverse().forEach((order, index) => {
    const item = document.createElement('li');
    const extrasText = order.extras && order.extras.length ? `Extras: ${order.extras.join(', ')}` : 'No extras';
    item.innerHTML = `
      <strong>Order ${orders.length - index}</strong>
      <p>${order.email ? `Email: ${order.email}` : ''} ${order.name ? `(${order.name})` : ''}</p>
      <p>${order.bundle} ${order.quantity ? `× ${order.quantity}` : ''} • ${order.date} at ${order.time}</p>
      <p>Date Registered: ${order.dateRegistered ? new Date(order.dateRegistered).toLocaleDateString() : 'N/A'}</p>
      <p>Price: ${formatPeso(order.price || 0)}</p>
      <p>${extrasText}</p>
      <p>${order.notes ? `Notes: ${order.notes}` : 'No special notes'}</p>
    `;
    orderHistory.appendChild(item);
  });
}

function resetForm() {
  orderForm.reset();
  const defaultBundle = document.querySelector('input[name="bundle"][value="Cacao Solo"]');
  if (defaultBundle) defaultBundle.checked = true;
  Object.values(bundleQuantityInputs).forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = 1;
  });
  summaryStatus.textContent = 'Ready for a new transaction. Choose another bundle anytime.';
  summaryStatus.style.color = 'var(--muted)';
  newOrderButton.disabled = true;
  updateSummary();
}

bundleInputs.forEach((input) => {
  input.addEventListener('change', updateSummary);
});

function attachQuantityControls(prefix, bundle) {
  const plus = document.getElementById(`${prefix}Plus`);
  const minus = document.getElementById(`${prefix}Minus`);
  const input = getQuantityInput(bundle);
  const bundleInput = document.querySelector(`input[name="bundle"][value="${bundle}"]`);

  if (!plus || !minus || !input) return;

  plus.addEventListener('click', () => {
    input.value = normalizeQuantity(input) + 1;
    if (bundleInput) bundleInput.checked = true;
    updateSummary();
  });

  minus.addEventListener('click', () => {
    input.value = Math.max(1, normalizeQuantity(input) - 1);
    if (bundleInput) bundleInput.checked = true;
    updateSummary();
  });

  input.addEventListener('change', () => {
    normalizeQuantity(input);
    if (bundleInput) bundleInput.checked = true;
    updateSummary();
  });
}

attachQuantityControls('solo', 'Cacao Solo');
attachQuantityControls('barkada', 'Barkada');
attachQuantityControls('giftPack', 'Gift Pack');

document.getElementById('date').addEventListener('change', updateSummary);
document.getElementById('time').addEventListener('change', updateSummary);

document.querySelectorAll('input[name="extras"]').forEach((input) => {
  input.addEventListener('change', updateSummary);
});

document.getElementById('email').addEventListener('blur', () => {
  const email = document.getElementById('email').value.trim();
  if (email) fetchCustomerProfile(email);
});

loadProfileButton.addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  if (email) fetchCustomerProfile(email);
});

function updateCustomerProfile() {
  const matchedOrders = currentProfile?.email
    ? orders.filter((order) => order.email === currentProfile.email)
    : [];

  profileName.textContent = currentProfile?.name || 'N/A';
  profileContact.textContent = currentProfile?.contact || 'N/A';
  profileEmail.textContent = currentProfile?.email || 'N/A';
  profileAddress.textContent = currentProfile?.address || 'N/A';
  profileDateRegistered.textContent = currentProfile?.dateRegistered
    ? new Date(currentProfile.dateRegistered).toLocaleDateString()
    : 'N/A';
  profileOrderCount.textContent = matchedOrders.length;
  profileRewards.textContent = currentProfile?.rewards ?? '0';
}

async function fetchCustomerProfile(email) {
  try {
    const res = await fetch(`/api/auth/profile?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Customer not found');
    currentProfile = await res.json();
    document.getElementById('name').value = currentProfile.name || document.getElementById('name').value;
    document.getElementById('contact').value = currentProfile.contact || document.getElementById('contact').value;
    document.getElementById('address').value = currentProfile.address || document.getElementById('address').value;
    updateCustomerProfile();
    updateSummary();
  } catch (err) {
    currentProfile = null;
    profileName.textContent = 'N/A';
    profileContact.textContent = 'N/A';
    profileEmail.textContent = 'N/A';
    profileAddress.textContent = 'N/A';
    profileDateRegistered.textContent = 'N/A';
    profileOrderCount.textContent = '0';
    profileRewards.textContent = '0';
    throw err;
  }
}

orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const bundle = document.querySelector('input[name="bundle"]:checked')?.value || 'Cacao Solo';
  const notes = document.getElementById('notes').value.trim();
  const extras = getSelectedExtras();

  const contact = document.getElementById('contact').value.trim();
  const address = document.getElementById('address').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name || !contact || !email || !address || !date || !time) {
    summaryStatus.textContent = 'Please complete all required fields.';
    summaryStatus.style.color = 'crimson';
    return;
  }

  const quantity = normalizeQuantity(getQuantityInput(bundle));

  if (!isAuthenticated || !currentProfile || currentProfile.email !== email) {
    summaryStatus.textContent = 'You must be logged in with your account to place an order.';
    summaryStatus.style.color = 'crimson';
    return;
  }

  const orderData = {
    name,
    contact,
    email,
    address,
    bundle,
    quantity,
    date,
    time,
    notes,
    extras,
    price: (bundlePrices[bundle] || 0) * quantity,
    submittedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Order failed');

    if (body.customer) {
      currentProfile = body.customer;
    }
    if (body.dateRegistered) {
      currentProfile = currentProfile || {};
      currentProfile.dateRegistered = body.dateRegistered;
      summaryDateRegistered.textContent = new Date(body.dateRegistered).toLocaleDateString();
    }

    updateCustomerProfile();
    await fetchOrders();
    updateSummary();

    localStorage.setItem(latestOrderKey, JSON.stringify({
      ...orderData,
      orderId: body.orderId,
      dateRegistered: body.dateRegistered,
    }));
    clearPendingOrder();

    if (body.lowStock && body.lowStock.length) {
      alert('Low stock alert for: ' + body.lowStock.join(', '));
    }

    location.href = 'order-confirmation.html';
  } catch (err) {
    summaryStatus.textContent = err.message;
    summaryStatus.style.color = 'crimson';
  }
});

newOrderButton.addEventListener('click', () => {
  clearPendingOrder();
  resetForm();
});

window.addEventListener('beforeunload', savePendingOrder);
orderForm.addEventListener('input', savePendingOrder);
orderForm.addEventListener('change', savePendingOrder);

// Init
resetForm();
loadPendingOrder();
initializeAuthState();

// Load product images from Django (proxied) and apply to bundle cards
async function loadProductImages() {
  try {
    const res = await fetch('/api/django-products');
    if (!res.ok) throw new Error('Products not available');
    const products = await res.json();
    products.forEach(p => {
      if (!p || !p.category) return;
      const img = document.querySelector(`.bundle-card input[value="${p.category}"]`)?.closest('.bundle-card')?.querySelector('.bundle-image');
      if (img && p.image_url) {
        img.src = p.image_url;
      }
    });
  } catch (e) {
    // silently ignore — fall back to local images
    console.warn('Could not load product images from Django:', e.message);
  }
}

loadProductImages();
