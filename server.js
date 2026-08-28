/* ═════════════════════════════════════════════════════════════════
   SMART CINEMA — NODE.JS + EXPRESS + MYSQL BACKEND SERVER
   ═════════════════════════════════════════════════════════════════ */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Connection Configuration
// Replace password with your MySQL Workbench root password if required
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Anjali@18', 
    database: process.env.DB_NAME || 'smart_cinema_db',
    port: process.env.DB_PORT || 3306
};

let pool;

async function initDB() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL Workbench database successfully!');
        connection.release();
    } catch (err) {
        console.error('❌ MySQL Connection Failed:', err.message);
    }
}

initDB();

// ── API ROUTES ──

// 1. Get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM movies');
        res.json({ success: true, movies: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Get all theatres
app.get('/api/theatres', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM theatres');
        res.json({ success: true, theatres: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. User Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. User Register
app.post('/api/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    const id = `CUST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    try {
        await pool.query(
            'INSERT INTO users (id, name, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, email, password, phone, 'Customer']
        );
        const newUser = { id, name, email, phone, role: 'Customer' };
        res.json({ success: true, user: newUser });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// 5. Create Booking
app.post('/api/bookings', async (req, res) => {
    const { userEmail, movieTitle, theatreName, city, seats, paymentMethod, totalAmount } = req.body;
    const id = `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    try {
        await pool.query(
            'INSERT INTO bookings (id, user_email, movie_title, theatre_name, city, seats, payment_method, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, userEmail, movieTitle, theatreName, city, seats.join(','), paymentMethod, totalAmount, 'Confirmed']
        );
        res.json({ success: true, bookingId: id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Get User Bookings
app.get('/api/bookings/:email', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM bookings WHERE user_email = ? ORDER BY created_at DESC', [req.params.email]);
        res.json({ success: true, bookings: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Smart Cinema MySQL Server running at http://localhost:${PORT}`);
});
