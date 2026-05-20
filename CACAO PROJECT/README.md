# Tabsilop Web App

A simple static web application for Tabsilop. Users can choose a bundle, select a delivery date and time, and place an order.

## Deployment

This project is ready to deploy as a static site on Render.

### Run locally

1. Open a terminal in this project folder.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in your browser.

### To deploy on Render

1. Create a new static site on Render.
2. Connect your Git repository containing this project.
3. Set the publish directory to `/`.
4. Render will automatically serve `index.html`.

## Files

- `index.html` — main user interface
- `styles.css` — page styling
- `script.js` — form behavior and order summary

## Features

- Bundle selection
- Delivery date and time picker
- Bundle extras like gift wrap and tasting guides
- Order summary panel
- Repeat order support with transaction history
- Simple client-side order confirmation
