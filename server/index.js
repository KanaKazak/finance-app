require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pgSession = require('connect-pg-simple')(session);

const app = express();

const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// session middleware
app.use(session({
    store: new pgSession({ pool }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// middleware that protects routes
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next(); // user is logged in, continue
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
}

// create tables if they don't exist
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS budgets (
            category TEXT PRIMARY KEY,
            amount REAL NOT NULL
        );
    `);
}

// --- Auth routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// --- Protected routes
app.get('/api/transactions', requireAuth, async (req, res) => {
    const result = await pool.query('SELECT * FROM transactions');
    res.json(result.rows);
});

app.post('/api/transactions', requireAuth, async (req, res) => {
    const { description, amount, type, category, date } = req.body;
    const result = await pool.query(
        'INSERT INTO transactions (description, amount, type, category, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [description, amount, type, category, date]
    );
    res.json({ id: result.rows[0].id });
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

app.delete('/api/transactions', requireAuth, async (req, res) => {
    await pool.query('DELETE FROM transactions');
    res.json({ success: true });
});

app.get('/api/budgets', requireAuth, async (req, res) => {
    const result = await pool.query('SELECT * FROM budgets');
    const budgets = {};
    result.rows.forEach(row => { budgets[row.category] = row.amount; });
    res.json(budgets);
});

app.post('/api/budgets', requireAuth, async (req, res) => {
    const { category, amount } = req.body;
    await pool.query(
        'INSERT INTO budgets (category, amount) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET amount = $2',
        [category, amount]
    );
    res.json({ success: true });
});

initDB().then(() => {
    app.listen(3000, () => {
        console.log('Server running at http://localhost:3000');
    });
});