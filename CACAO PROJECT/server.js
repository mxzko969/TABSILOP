const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const port = process.env.PORT || 3000;
const djangoBaseUrl = process.env.DJANGO_BASE_URL || 'http://127.0.0.1:8000';
// Keep this in sync with your Django admin password for the admin-only page.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password || '').digest('hex');
}

function isFourDigitPin(value) {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
const dataDir = path.join(__dirname, 'data');
const fallbackProducts = [
  { name: 'Cacao Solo', category: 'Cacao Solo', image_url: '/images/cacao-solo.svg' },
  { name: 'Barkada', category: 'Barkada', image_url: '/images/barkada.svg' },
  { name: 'Gift Pack', category: 'Gift Pack', image_url: '/images/gift-pack.svg' },
];

function toDjangoMediaProxyUrl(imageUrl) {
  if (!imageUrl) return null;
  try {
    const parsedUrl = new URL(imageUrl, djangoBaseUrl);
    if (!parsedUrl.pathname.startsWith('/media/')) return imageUrl;
    return `/api/django-media?path=${encodeURIComponent(parsedUrl.pathname + parsedUrl.search)}`;
  } catch (e) {
    return imageUrl;
  }
}

function ensureDataDir() {
  try { fs.mkdirSync(dataDir); } catch (e) { /* ignore */ }
}

function readJson(file, fallback) {
  try {
    const p = path.join(dataDir, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8') || 'null');
  } catch (e) {
    return fallback;
  }
}

function findCustomerByEmail(customers, email) {
  if (!email) return null;
  if (customers[email]) return { key: email, customer: customers[email] };
  for (const [key, value] of Object.entries(customers)) {
    if (value && value.email === email) {
      return { key, customer: value };
    }
  }
  return null;
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2));
}

ensureDataDir();

// Simple business logic mappings
const bundleIngredients = {
  'Cacao Solo': { cacao: 1, sugar: 1, packaging: 1, tablea: 1 },
  'Barkada': { cacao: 4, sugar: 2, packaging: 2, tablea: 4 },
  'Gift Pack': { cacao: 3, sugar: 2, packaging: 2, tablea: 2 },
};

const server = http.createServer((req, res) => {
  const { method } = req;
  const reqUrl = decodeURI(req.url.split('?')[0]);

  if (reqUrl.startsWith('/api/')) {
    // Collect body for POST/PUT
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        if (reqUrl === '/api/inventory' && method === 'GET') {
          const inv = readJson('inventory.json', { cacao: 100, sugar: 100, packaging: 100, tablea: 50 });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(inv));
          return;
        }

        if (reqUrl === '/api/orders' && method === 'GET') {
          const q = req.url.split('?')[1] || '';
          const params = new URLSearchParams(q);
          const email = params.get('email');
          let orders = readJson('orders.json', []);
          if (email) {
            orders = orders.filter((order) => order.email === email);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(orders));
          return;
        }

        if (reqUrl === '/api/orders' && method === 'POST') {
          const payload = body ? JSON.parse(body) : {};
          const orders = readJson('orders.json', []);
          const inventory = readJson('inventory.json', { cacao: 100, sugar: 100, packaging: 100, tablea: 50 });
          const customers = readJson('customers.json', {});

          // Basic validation
          const { name, contact, email, address, bundle, date, time, notes, extras, price } = payload;
          if (!name || !contact || !email || !address || !bundle || !date || !time) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }

          const existingCustomer = customers[email] || {};
          const dateRegistered = existingCustomer.dateRegistered || new Date().toISOString();
          customers[email] = {
            email,
            name,
            contact,
            address,
            dateRegistered,
            rewards: existingCustomer.rewards || 0,
            passwordHash: existingCustomer.passwordHash,
          };
          writeJson('customers.json', customers);

          // Apply inventory consumption (respect quantity if provided)
          const quantity = payload.quantity && Number.isFinite(+payload.quantity) ? Math.max(1, +payload.quantity) : 1;
          const consumed = bundleIngredients[bundle] || { cacao: 1, sugar: 1, packaging: 1, tablea: 1 };
          Object.keys(consumed).forEach(k => {
            const use = consumed[k] * quantity;
            inventory[k] = Math.max(0, (inventory[k] || 0) - use);
          });

          const order = Object.assign({}, payload, {
            id: Date.now().toString(36),
            quantity: quantity,
            price: payload.price || 0,
            dateRegistered,
            createdAt: new Date().toISOString(),
          });

          orders.push(order);
          writeJson('orders.json', orders);
          writeJson('inventory.json', inventory);

          // Append to sales log
          const sales = readJson('sales.json', []);
          sales.push({ id: order.id, bundle: order.bundle, price: order.price || 0, date: order.date, createdAt: order.createdAt });
          writeJson('sales.json', sales);

          // Update rewards
          const rewards = readJson('rewards.json', {});
          const points = Math.round(order.price || 0);
          rewards[order.email] = (rewards[order.email] || 0) + points;
          writeJson('rewards.json', rewards);

          customers[order.email].rewards = rewards[order.email];
          writeJson('customers.json', customers);

          // Low-stock check
          const low = Object.entries(inventory).filter(([k, v]) => v <= 5).map(([k]) => k);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ orderId: order.id, lowStock: low, dateRegistered, customer: customers[order.email] }));
          return;
        }

        if (reqUrl === '/api/orders' && method === 'DELETE') {
          const q = req.url.split('?')[1] || '';
          const params = new URLSearchParams(q);
          const id = params.get('id');
          if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing order id' }));
            return;
          }

          const orders = readJson('orders.json', []);
          const orderIndex = orders.findIndex((order) => order.id === id);
          if (orderIndex < 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Order not found' }));
            return;
          }

          const order = orders.splice(orderIndex, 1)[0];
          writeJson('orders.json', orders);

          const inventory = readJson('inventory.json', { cacao: 100, sugar: 100, packaging: 100, tablea: 50 });
          const consumed = bundleIngredients[order.bundle] || { cacao: 1, sugar: 1, packaging: 1, tablea: 1 };
          const quantity = order.quantity && Number.isFinite(+order.quantity) ? Math.max(1, +order.quantity) : 1;
          Object.keys(consumed).forEach((k) => {
            inventory[k] = (inventory[k] || 0) + consumed[k] * quantity;
          });
          writeJson('inventory.json', inventory);

          const sales = readJson('sales.json', []).filter((sale) => sale.id !== id);
          writeJson('sales.json', sales);

          const rewards = readJson('rewards.json', {});
          const points = Math.round(order.price || 0);
          rewards[order.email] = Math.max(0, (rewards[order.email] || 0) - points);
          writeJson('rewards.json', rewards);

          const customers = readJson('customers.json', {});
          if (customers[order.email]) {
            customers[order.email].rewards = rewards[order.email];
            writeJson('customers.json', customers);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, orderId: id, customer: customers[order.email] || null }));
          return;
        }

        if (reqUrl === '/api/production' && method === 'POST') {
          const payload = body ? JSON.parse(body) : {};
          const production = readJson('production.json', []);
          production.push(Object.assign({ id: Date.now().toString(36), timestamp: new Date().toISOString() }, payload));
          writeJson('production.json', production);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (reqUrl === '/api/auth/register' && method === 'POST') {
          const payload = body ? JSON.parse(body) : {};
          const { name, contact, email, address, password } = payload;
          if (!name || !contact || !email || !address || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }

          if (!isFourDigitPin(password)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Password must be exactly 4 digits' }));
            return;
          }

          const customers = readJson('customers.json', {});
          const existingCustomer = customers[email] || {};
          if (existingCustomer.passwordHash) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Email already registered' }));
            return;
          }

          const passwordHash = hashPassword(password);
          const dateRegistered = existingCustomer.dateRegistered || new Date().toISOString();
          customers[email] = {
            email,
            name,
            contact,
            address,
            dateRegistered,
            rewards: existingCustomer.rewards || 0,
            passwordHash,
          };
          writeJson('customers.json', customers);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, email }));
          return;
        }

        if (reqUrl === '/api/auth/login' && method === 'POST') {
          const payload = body ? JSON.parse(body) : {};
          const { email, password } = payload;
          if (!email || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing email or password' }));
            return;
          }

          if (!isFourDigitPin(password)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Password must be exactly 4 digits' }));
            return;
          }

          const customers = readJson('customers.json', {});
          const found = findCustomerByEmail(customers, email);
          const customer = found && found.customer;
          if (!customer || !customer.passwordHash || customer.passwordHash !== hashPassword(password)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid login credentials' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, email, name: customer.name }));
          return;
        }

        if (reqUrl === '/api/auth/profile' && method === 'GET') {
          const q = req.url.split('?')[1] || '';
          const params = new URLSearchParams(q);
          const email = params.get('email');
          const customers = readJson('customers.json', {});
          const found = findCustomerByEmail(customers, email);
          if (!email || !found) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Profile not found' }));
            return;
          }
          const { passwordHash, ...profile } = found.customer;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(profile));
          return;
        }

        if (reqUrl === '/api/auth/profile' && method === 'PUT') {
          const payload = body ? JSON.parse(body) : {};
          const { currentEmail, name, contact, email, address, password } = payload;
          const customers = readJson('customers.json', {});
          const found = currentEmail ? findCustomerByEmail(customers, currentEmail) : null;
          const existing = found && found.customer;
          const existingKey = found && found.key;
          if (!existing) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Profile not found' }));
            return;
          }

          const updatedEmail = email || currentEmail;
          const targetFound = findCustomerByEmail(customers, updatedEmail);
          const emailConflict = targetFound && targetFound.key !== existingKey;
          if (updatedEmail !== currentEmail && emailConflict) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Email already in use' }));
            return;
          }

          const updatedProfile = {
            ...existing,
            email: updatedEmail,
            name: name || existing.name,
            contact: contact || existing.contact,
            address: address || existing.address,
            dateRegistered: existing.dateRegistered || new Date().toISOString(),
            rewards: existing.rewards || 0,
            passwordHash: existing.passwordHash,
          };
          if (password && !isFourDigitPin(password)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Password must be exactly 4 digits' }));
            return;
          }
          if (password) {
            updatedProfile.passwordHash = hashPassword(password);
          }

          if (updatedEmail !== currentEmail) {
            delete customers[currentEmail];
          }
          customers[updatedEmail] = updatedProfile;
          writeJson('customers.json', customers);

          const { passwordHash, ...profile } = updatedProfile;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(profile));
          return;
        }

        if (reqUrl === '/api/auth/admin-login' && method === 'POST') {
          const payload = body ? JSON.parse(body) : {};
          const { password } = payload;
          if (!password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing password' }));
            return;
          }

          if (password !== ADMIN_PASSWORD) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid admin password' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (reqUrl === '/api/customers' && method === 'GET') {
          const q = req.url.split('?')[1] || '';
          const params = new URLSearchParams(q);
          const email = params.get('email');
          const customers = readJson('customers.json', {});
          const customer = email && customers[email];
          if (!customer) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Customer not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(customer));
          return;
        }

        if (reqUrl === '/api/analytics/sales' && method === 'GET') {
          const sales = readJson('sales.json', []);
          // Very simple totals
          const total = sales.reduce((s, r) => s + (r.price || 0), 0);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ totalSales: total, count: sales.length }));
          return;
        }

        if (reqUrl.startsWith('/api/rewards') && method === 'GET') {
          const q = req.url.split('?')[1] || '';
          const params = new URLSearchParams(q);
          const email = params.get('email');
          const rewards = readJson('rewards.json', {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ email, points: rewards[email] || 0 }));
          return;
        }

        if (reqUrl === '/api/django-products' && method === 'GET') {
          // Proxy to Django products API to avoid CORS in browser
          const djangoUrl = new URL('/api/products/', djangoBaseUrl);
          const djangoReq = http.request(djangoUrl, { method: 'GET' }, djangoRes => {
            let data = '';
            djangoRes.on('data', chunk => data += chunk);
            djangoRes.on('end', () => {
              try {
                const products = JSON.parse(data);
                const proxiedProducts = Array.isArray(products)
                  ? products.map((product) => ({
                    ...product,
                    image_url: toDjangoMediaProxyUrl(product.image_url),
                  }))
                  : products;
                res.writeHead(djangoRes.statusCode || 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(proxiedProducts));
                return;
              } catch (e) {
                // Fall through and return the original Django response.
              }
              res.writeHead(djangoRes.statusCode || 200, { 'Content-Type': 'application/json' });
              res.end(data);
            });
          });
          djangoReq.on('error', err => {
            if (process.env.DJANGO_BASE_URL) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unable to reach Django API', detail: err.message }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(fallbackProducts));
          });
          djangoReq.end();
          return;
        }

        if (reqUrl === '/api/django-media' && method === 'GET') {
          const q = req.url.split('?')[1] || '';
          const params = new URLSearchParams(q);
          const mediaPath = params.get('path') || '';

          if (!mediaPath.startsWith('/media/')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid media path' }));
            return;
          }

          const djangoUrl = new URL(mediaPath, djangoBaseUrl);
          const djangoReq = http.request(djangoUrl, { method: 'GET' }, djangoRes => {
            const contentType = djangoRes.headers['content-type'] || 'application/octet-stream';
            res.writeHead(djangoRes.statusCode || 200, { 'Content-Type': contentType });
            djangoRes.pipe(res);
          });
          djangoReq.on('error', err => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unable to reach Django media', detail: err.message }));
          });
          djangoReq.end();
          return;
        }

        // Unknown API route
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static file serving (fall back to index.html for '/')
  const requestedPath = reqUrl;
  let sanitizedPath = path.normalize(requestedPath).replace(/^\.+/, '');
  if (sanitizedPath === '/' || sanitizedPath === '\\') {
    sanitizedPath = 'index.html';
  } else {
    sanitizedPath = sanitizedPath.replace(/^[/\\]+/, '');
  }

  let filePath = path.join(__dirname, sanitizedPath === '' ? 'index.html' : sanitizedPath);

  if (!filePath.startsWith(path.join(__dirname))) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid request');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`Tabsilop app running at http://localhost:${port}`);
});
