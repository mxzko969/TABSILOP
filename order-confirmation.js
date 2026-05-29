const confirmationDetails = document.getElementById('confirmationDetails');
const latestOrderKey = 'latestOrderReceipt';

function formatPeso(amount) {
  return `₱${amount}`;
}

function renderConfirmation() {
  const raw = localStorage.getItem(latestOrderKey);
  if (!raw) {
    confirmationDetails.innerHTML = `
      <p class="form-note">No recent order was found on this device.</p>
      <a href="index.html" class="primary-button">Back to Order Page</a>
    `;
    return;
  }

  const order = JSON.parse(raw);
  const extras = Array.isArray(order.extras) && order.extras.length ? order.extras.join(', ') : 'None';

  confirmationDetails.innerHTML = `
    <div class="receipt-grid">
      <p><strong>Order ID:</strong> <span>${order.orderId || 'Pending'}</span></p>
      <p><strong>Name:</strong> <span>${order.name || 'N/A'}</span></p>
      <p><strong>Email:</strong> <span>${order.email || 'N/A'}</span></p>
      <p><strong>Contact:</strong> <span>${order.contact || 'N/A'}</span></p>
      <p><strong>Address:</strong> <span>${order.address || 'N/A'}</span></p>
      <p><strong>Bundle:</strong> <span>${order.bundle || 'N/A'}</span></p>
      <p><strong>Tabsilop Quantity:</strong> <span>${order.quantity || 1}</span></p>
      <p><strong>Delivery:</strong> <span>${order.date || 'N/A'} at ${order.time || 'N/A'}</span></p>
      <p><strong>Extras:</strong> <span>${extras}</span></p>
      <p><strong>Total:</strong> <span>${formatPeso(order.price || 0)}</span></p>
      <p><strong>Status:</strong> <span>Received</span></p>
    </div>
    ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
  `;
}

try {
  renderConfirmation();
} catch (error) {
  confirmationDetails.innerHTML = '<p class="form-note">Unable to load order details.</p>';
}
