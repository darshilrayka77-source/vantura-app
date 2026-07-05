# VANTURA — Store + Backend

A complete e-commerce site with a real backend: products, orders, customers,
and coupons are now saved to disk and shared across every visitor — not just
stored in your browser like the earlier demo.

## Requirements

Just [Node.js](https://nodejs.org) (v16 or newer). Nothing else — no `npm install`,
no database to set up. The backend uses only Node's built-in modules and
stores data in a plain JSON file.

## Run it

```bash
node server.js
```

Then open **http://localhost:4000** in your browser. That's it — the same
server hosts both the website and the API, so there's nothing else to start
or configure.

## What's different from the demo

| | Demo (single HTML file) | This version |
|---|---|---|
| Products/orders/customers | Reset on every refresh | Saved to `data/db.json`, persist forever |
| Visible to | Only your browser | Every visitor, same data |
| Admin login | Fake, client-side only | Real password check + session token |
| Stock levels | Not enforced | Server rejects orders that exceed stock |
| Order totals | Calculated in the browser | Recalculated on the server (can't be tampered with) |

## Project structure

```
vantura-app/
├── server.js          ← the backend (API + serves the website)
├── data/db.json        ← created automatically on first run — your live data
└── public/index.html   ← the storefront + admin panel (frontend)
```

## Admin access

Go to the store, click the person icon (top right) → enter the admin
password. The default is:

```
admin123
```

**Change this before putting the site anywhere public.** Open `server.js`
and edit this line near the top:

```js
const ADMIN_PASSWORD = 'admin123';
```

## Resetting the data

Delete `data/db.json` and restart the server — it will be recreated from the
built-in starter catalog (the same 16 products you saw in the demo).

## What this still doesn't do

This backend is a real, working foundation — but for an actual live
dropshipping business you'll still want to add:

- **Real payments.** Checkout currently records the order but doesn't charge
  a card. Wiring up Stripe, Razorpay, or PayPal happens inside the `/api/orders`
  route in `server.js`.
- **HTTPS + real hosting.** Right now this only runs on your computer
  (`localhost`). To make it public, deploy `server.js` somewhere like
  Render, Railway, Fly.io, or a VPS, and point a domain at it.
- **A production-grade database.** The JSON file works fine for a small
  catalog and moderate order volume, but a real launch should move to
  Postgres/MySQL/MongoDB once traffic grows.
- **Stronger admin auth.** The current login is one shared password. For a
  real team, add per-user accounts and hashed passwords.

## Quick API reference

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/products` | – | List all products |
| POST | `/api/products` | admin | Add a product |
| PUT | `/api/products/:id` | admin | Edit a product |
| DELETE | `/api/products/:id` | admin | Remove a product |
| GET | `/api/coupons` | – | List active coupons |
| POST/PUT/DELETE | `/api/coupons` | admin | Manage coupons |
| POST | `/api/orders` | – | Place an order |
| GET | `/api/orders?email=` | – | Look up a customer's orders |
| GET | `/api/orders` | admin | List every order |
| PATCH | `/api/orders/:id` | admin | Update order status |
| GET | `/api/customers` | admin | List customers |
| POST | `/api/admin/login` | – | Get an admin session token |

Admin routes require an `Authorization: Bearer <token>` header, using the
token returned from `/api/admin/login`.
