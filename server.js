/**
 * VANTURA — Backend Server
 * ------------------------------------------------------------
 * Zero external dependencies. Uses only Node.js built-in modules,
 * so there is nothing to `npm install` — just run:
 *
 *     node server.js
 *
 * Then open:  http://localhost:4000
 *
 * Data is stored in ./data/db.json and persists between restarts.
 * On first run, the file is created automatically from the seed
 * data below.
 * ------------------------------------------------------------
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_PASSWORD = 'admin123'; // change this for real use

/* ============================================================
   SEED DATA — used only the very first time the server runs
============================================================ */
const SEED = {
  products: [
    {id:'E1', name:'Aura Wireless Earbuds', category:'Electronics', price:59, mrp:79, stock:35, rating:4.7, hue:12, desc:'True wireless earbuds with active noise cancelling and a 32-hour case battery. Touch controls, IPX5 sweat resistance.', variants:['Black','White','Blue'], featured:true},
    {id:'E2', name:'Pulse Smart Fitness Band', category:'Electronics', price:45, mrp:58, stock:28, rating:4.4, hue:190, desc:'Tracks heart rate, sleep and steps with a week of battery life. Syncs to a companion app over Bluetooth.', variants:['Black','Grey']},
    {id:'E3', name:'Nova LED Strip Lights (5M)', category:'Electronics', price:24, mrp:32, stock:60, rating:4.5, hue:280, desc:'App-controlled RGB lighting with music sync and voice assistant support. Cuts to size, sticks to any wall.', variants:['Warm White','RGB']},
    {id:'E4', name:'Orbit Fast Wireless Charger', category:'Electronics', price:29, mrp:36, stock:40, rating:4.3, hue:45, desc:'15W fast charging pad compatible with most phone cases. Slim aluminum body with a soft-glow LED ring.', variants:['Black','White']},
    {id:'W1', name:'Meridian Steel Chronograph', category:'Watches', price:89, mrp:120, stock:16, rating:4.8, hue:220, desc:'A stainless-steel chronograph with sapphire-coated glass and a fold-over clasp. Water resistant to 50m.', variants:['Silver','Black','Gold'], featured:true},
    {id:'W2', name:'Lumen Minimalist Watch', category:'Watches', price:69, mrp:85, stock:22, rating:4.6, hue:30, desc:'A clean-dial watch with a genuine leather strap, built for everyday wear from desk to dinner.', variants:['Tan','Black']},
    {id:'W3', name:'Pulse X Smartwatch', category:'Watches', price:99, mrp:129, stock:18, rating:4.5, hue:200, desc:'Full-color touchscreen smartwatch with call notifications, GPS tracking and 10-day battery life.', variants:['Black','Silver'], featured:true},
    {id:'W4', name:'Aria Rose Gold Bracelet Watch', category:'Watches', price:75, mrp:95, stock:14, rating:4.6, hue:340, desc:'A slim bracelet-style watch in rose gold plating with a mother-of-pearl dial face.', variants:['Rose Gold','Silver']},
    {id:'H1', name:'Halo LED Moon Lamp', category:'Home Decor', price:34, mrp:42, stock:30, rating:4.7, hue:260, desc:'A 3D-printed moon replica lamp with 16 color modes and touch dimming. Runs on USB-C, no cords required at night.', variants:['10cm','15cm'], featured:true},
    {id:'H2', name:'Terra Ceramic Vase Set (3pc)', category:'Home Decor', price:42, mrp:52, stock:20, rating:4.5, hue:25, desc:'A trio of hand-glazed ceramic vases in graduated sizes, built to anchor a shelf or console table.', variants:['Sand','Sage']},
    {id:'H3', name:'Woven Macrame Wall Hanging', category:'Home Decor', price:28, mrp:35, stock:25, rating:4.4, hue:35, desc:'Hand-knotted cotton cord wall art on a driftwood dowel. Adds texture to any bare wall in minutes.', variants:['Natural','Ivory']},
    {id:'H4', name:'Drift Abstract Canvas Print', category:'Home Decor', price:39, mrp:48, stock:18, rating:4.3, hue:160, desc:'Gallery-wrapped canvas print with a soft abstract wash, ready to hang out of the box.', variants:['24x36','30x40']},
    {id:'K1', name:'Precision 6-Piece Knife Set', category:'Kitchen', price:54, mrp:70, stock:24, rating:4.8, hue:8, desc:'Forged high-carbon steel knives with a walnut block. Holds an edge through daily prep work.', variants:['Standard'], featured:true},
    {id:'K2', name:'Frotha Electric Milk Frother', category:'Kitchen', price:22, mrp:28, stock:45, rating:4.4, hue:40, desc:'Hand-held frother that turns milk into café-style foam in under 30 seconds. USB-C rechargeable.', variants:['Black','White']},
    {id:'K3', name:'Grove Bamboo Cutting Board Set', category:'Kitchen', price:32, mrp:40, stock:30, rating:4.6, hue:90, desc:'Three sustainably-sourced bamboo boards with juice grooves, sized for prep, serving and everyday use.', variants:['Set of 3']},
    {id:'K4', name:'Flex Silicone Utensil Set (10pc)', category:'Kitchen', price:26, mrp:33, stock:38, rating:4.3, hue:150, desc:'Heat-resistant silicone utensils on beechwood handles, safe for non-stick cookware up to 450°F.', variants:['Grey','Terracotta']},
  ],
  coupons: [
    {code:'VANTURA10', type:'percent', value:10, minOrder:0, active:true, desc:'10% off your order'},
    {code:'FREESHIP', type:'shipping', value:0, minOrder:0, active:true, desc:'Free standard shipping'},
    {code:'SAVE20', type:'flat', value:20, minOrder:120, active:true, desc:'$20 off orders over $120'},
  ],
  orders: [],
  customers: [],
};

/* ============================================================
   PERSISTENCE
============================================================ */
function loadDb(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
  if(!fs.existsSync(DB_FILE)){
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED, null, 2));
    console.log('Created new database at', DB_FILE);
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
let db = loadDb();
function saveDb(){
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ============================================================
   AUTH — simple bearer token, held in memory
============================================================ */
const sessions = new Set();
function isAuthed(req){
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  return token && sessions.has(token);
}

/* ============================================================
   HELPERS
============================================================ */
function send(res, status, body){
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end(json);
}
function readBody(req){
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', c => chunks += c);
    req.on('end', () => {
      if(!chunks) return resolve({});
      try { resolve(JSON.parse(chunks)); } catch(e){ reject(e); }
    });
    req.on('error', reject);
  });
}
const uid = (p) => p + '-' + crypto.randomBytes(4).toString('hex');
const round2 = n => Math.round(n * 100) / 100;

function calcTotals(items, couponCode){
  let subtotal = 0;
  const lineItems = [];
  for(const it of items){
    const product = db.products.find(p => p.id === it.id);
    if(!product) throw {status:400, message:`Product ${it.id} does not exist`};
    if(it.qty < 1) throw {status:400, message:`Invalid quantity for ${product.name}`};
    if(product.stock < it.qty) throw {status:400, message:`Not enough stock for ${product.name} (only ${product.stock} left)`};
    subtotal += product.price * it.qty;
    lineItems.push({id:product.id, name:product.name, price:product.price, qty:it.qty, variant:it.variant || product.variants[0]});
  }
  subtotal = round2(subtotal);

  let discount = 0, freeShip = false, appliedCode = null;
  if(couponCode){
    const coupon = db.coupons.find(c => c.code === couponCode.toUpperCase() && c.active);
    if(coupon && subtotal >= coupon.minOrder){
      appliedCode = coupon.code;
      if(coupon.type === 'percent') discount = subtotal * coupon.value / 100;
      if(coupon.type === 'flat') discount = coupon.value;
      if(coupon.type === 'shipping') freeShip = true;
    }
  }
  discount = round2(Math.min(discount, subtotal));
  const shipping = (subtotal > 75 || freeShip || subtotal === 0) ? 0 : 5.99;
  const tax = round2((subtotal - discount) * 0.08);
  const total = round2(subtotal - discount + shipping + tax);
  return { lineItems, subtotal, discount, shipping, tax, total, couponCode: appliedCode };
}

/* ============================================================
   STATIC FILE SERVING (serves the frontend from /public)
============================================================ */
const MIME = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml'};
function serveStatic(req, res, pathname){
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if(!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if(err){
      // SPA fallback: serve index.html for unknown non-API routes
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
        if(err2){ res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, {'Content-Type':'text/html'});
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(data);
  });
}

/* ============================================================
   ROUTER
============================================================ */
const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsed.pathname;
  const parts = pathname.split('/').filter(Boolean); // e.g. ['api','products','E1']

  if(req.method === 'OPTIONS') return send(res, 204, {});

  if(parts[0] !== 'api') return serveStatic(req, res, pathname);

  try {
    /* ---------- PRODUCTS ---------- */
    if(pathname === '/api/products' && req.method === 'GET'){
      return send(res, 200, db.products);
    }
    if(pathname === '/api/products' && req.method === 'POST'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      const body = await readBody(req);
      if(!body.name || body.price == null) return send(res, 400, {message:'Name and price are required'});
      const product = {
        id: uid('P'), name: body.name, category: body.category || 'Electronics',
        price: parseFloat(body.price) || 0, mrp: parseFloat(body.mrp) || parseFloat(body.price) || 0,
        stock: parseInt(body.stock) || 0, rating: parseFloat(body.rating) || 4.5, hue: parseInt(body.hue) || 20,
        desc: body.desc || '', variants: Array.isArray(body.variants) ? body.variants : (body.variants||'One Size').split(',').map(s=>s.trim()).filter(Boolean),
        featured: !!body.featured,
      };
      db.products.push(product); saveDb();
      return send(res, 201, product);
    }
    if(parts[1] === 'products' && parts[2] && req.method === 'PUT'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      const idx = db.products.findIndex(p => p.id === parts[2]);
      if(idx === -1) return send(res, 404, {message:'Product not found'});
      const body = await readBody(req);
      const existing = db.products[idx];
      const updated = {
        ...existing, ...body,
        price: parseFloat(body.price ?? existing.price),
        mrp: parseFloat(body.mrp ?? existing.mrp),
        stock: parseInt(body.stock ?? existing.stock),
        hue: parseInt(body.hue ?? existing.hue),
        variants: Array.isArray(body.variants) ? body.variants : (typeof body.variants === 'string' ? body.variants.split(',').map(s=>s.trim()).filter(Boolean) : existing.variants),
      };
      db.products[idx] = updated; saveDb();
      return send(res, 200, updated);
    }
    if(parts[1] === 'products' && parts[2] && req.method === 'DELETE'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      const before = db.products.length;
      db.products = db.products.filter(p => p.id !== parts[2]);
      if(db.products.length === before) return send(res, 404, {message:'Product not found'});
      saveDb();
      return send(res, 200, {deleted:true});
    }

    /* ---------- COUPONS ---------- */
    if(pathname === '/api/coupons' && req.method === 'GET'){
      return send(res, 200, db.coupons);
    }
    if(pathname === '/api/coupons' && req.method === 'POST'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      const body = await readBody(req);
      if(!body.code) return send(res, 400, {message:'Coupon code is required'});
      const code = body.code.toUpperCase();
      if(db.coupons.some(c => c.code === code)) return send(res, 409, {message:'Coupon code already exists'});
      const coupon = {code, type: body.type||'percent', value: parseFloat(body.value)||0, minOrder: parseFloat(body.minOrder)||0, active: body.active !== false, desc: body.desc||''};
      db.coupons.push(coupon); saveDb();
      return send(res, 201, coupon);
    }
    if(parts[1] === 'coupons' && parts[2] && req.method === 'PUT'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      const idx = db.coupons.findIndex(c => c.code === decodeURIComponent(parts[2]));
      if(idx === -1) return send(res, 404, {message:'Coupon not found'});
      const body = await readBody(req);
      db.coupons[idx] = {...db.coupons[idx], ...body, value: parseFloat(body.value ?? db.coupons[idx].value), minOrder: parseFloat(body.minOrder ?? db.coupons[idx].minOrder)};
      saveDb();
      return send(res, 200, db.coupons[idx]);
    }
    if(parts[1] === 'coupons' && parts[2] && req.method === 'DELETE'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      const before = db.coupons.length;
      db.coupons = db.coupons.filter(c => c.code !== decodeURIComponent(parts[2]));
      if(db.coupons.length === before) return send(res, 404, {message:'Coupon not found'});
      saveDb();
      return send(res, 200, {deleted:true});
    }

    /* ---------- ORDERS ---------- */
    if(pathname === '/api/orders' && req.method === 'POST'){
      const body = await readBody(req);
      if(!body.items || !body.items.length) return send(res, 400, {message:'Cart is empty'});
      if(!body.customer || !body.customer.email || !body.customer.name) return send(res, 400, {message:'Customer name and email are required'});
      if(!body.address || !body.address.line1 || !body.address.city || !body.address.zip) return send(res, 400, {message:'Shipping address is incomplete'});

      const totals = calcTotals(body.items, body.couponCode);

      let customer = db.customers.find(c => c.email === body.customer.email);
      if(!customer){
        customer = {id: uid('C'), name: body.customer.name, email: body.customer.email, phone: body.customer.phone||'', since: new Date().toISOString().slice(0,10)};
        db.customers.push(customer);
      }

      const order = {
        id: uid('VT'), customer, items: totals.lineItems,
        subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, tax: totals.tax, total: totals.total,
        couponCode: totals.couponCode, payment: body.payment || 'Card', status: 'Processing',
        date: new Date().toISOString(), address: body.address,
      };
      // decrement stock now that order is confirmed
      order.items.forEach(it => {
        const p = db.products.find(p => p.id === it.id);
        if(p) p.stock = Math.max(0, p.stock - it.qty);
      });
      db.orders.unshift(order);
      saveDb();
      return send(res, 201, order);
    }
    if(pathname === '/api/orders' && req.method === 'GET'){
      const email = parsed.searchParams.get('email');
      if(email) return send(res, 200, db.orders.filter(o => o.customer.email.toLowerCase() === email.toLowerCase()));
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required to view all orders'});
      return send(res, 200, db.orders);
    }
    if(parts[1] === 'orders' && parts[2] && req.method === 'PATCH'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      const order = db.orders.find(o => o.id === parts[2]);
      if(!order) return send(res, 404, {message:'Order not found'});
      const body = await readBody(req);
      if(body.status) order.status = body.status;
      saveDb();
      return send(res, 200, order);
    }

    /* ---------- CUSTOMERS (admin only) ---------- */
    if(pathname === '/api/customers' && req.method === 'GET'){
      if(!isAuthed(req)) return send(res, 401, {message:'Admin login required'});
      return send(res, 200, db.customers);
    }

    /* ---------- ADMIN AUTH ---------- */
    if(pathname === '/api/admin/login' && req.method === 'POST'){
      const body = await readBody(req);
      if(body.password !== ADMIN_PASSWORD) return send(res, 401, {message:'Incorrect password'});
      const token = crypto.randomBytes(24).toString('hex');
      sessions.add(token);
      return send(res, 200, {token});
    }
    if(pathname === '/api/admin/logout' && req.method === 'POST'){
      const h = req.headers['authorization'] || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if(token) sessions.delete(token);
      return send(res, 200, {loggedOut:true});
    }

    if(pathname === '/api/health') return send(res, 200, {ok:true, time:new Date().toISOString()});

    return send(res, 404, {message:'Not found'});
  } catch(err){
    if(err && err.status) return send(res, err.status, {message: err.message});
    console.error(err);
    return send(res, 500, {message:'Server error'});
  }
});

server.listen(PORT, () => {
  console.log(`\n  VANTURA backend running →  http://localhost:${PORT}`);
  console.log(`  Admin password: ${ADMIN_PASSWORD}\n`);
});
