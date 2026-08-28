-- ═════════════════════════════════════════════════════════════════
-- SMART CINEMA SYSTEM — MYSQL WORKBENCH DATABASE SCHEMA & SEED DATA
-- ═════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS smart_cinema_db;
USE smart_cinema_db;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('Customer', 'Admin') DEFAULT 'Customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MOVIES TABLE
CREATE TABLE IF NOT EXISTS movies (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    duration INT NOT NULL,
    genre VARCHAR(50) NOT NULL,
    rating VARCHAR(10) DEFAULT 'U/A',
    emoji VARCHAR(10) DEFAULT '🎬',
    lang VARCHAR(100) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    trending_tag VARCHAR(50),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. THEATRES TABLE
CREATE TABLE IF NOT EXISTS theatres (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    city VARCHAR(50) NOT NULL,
    distance VARCHAR(20),
    screens_count INT DEFAULT 4,
    image_url TEXT
);

-- 4. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY,
    user_email VARCHAR(100) NOT NULL,
    movie_title VARCHAR(150) NOT NULL,
    theatre_name VARCHAR(150) NOT NULL,
    city VARCHAR(50) NOT NULL,
    seats VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Card',
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Confirmed', 'Cancelled') DEFAULT 'Confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- ═════════════════════════════════════════════════════════════════
-- SEED DATA INSERTION
-- ═════════════════════════════════════════════════════════════════

-- Default Users (Password: admin123 and user123)
INSERT INTO users (id, name, email, password, phone, role) VALUES
('ADM-0001', 'System Admin', 'admin@smartcinema.com', 'admin123', '0000000000', 'Admin'),
('CUST-0001', 'Anjali Bommisetti', 'user@example.com', 'user123', '9876543210', 'Customer')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Default Movies
INSERT INTO movies (id, title, duration, genre, rating, emoji, lang, base_price, description, trending_tag, image_url) VALUES
('MOV-001', 'Kalki 2898 AD', 180, 'Sci-Fi', 'U/A', '⚡', 'Telugu, Hindi, English', 250.00, 'A modern avatar descends to earth in a futuristic dystopian era to save humanity from dark forces.', '🔥 Trending #1', 'https://upload.wikimedia.org/wikipedia/en/4/4c/Kalki_2898_AD.jpg'),
('MOV-002', 'Pushpa 2: The Rule', 165, 'Action', 'U/A', '🪓', 'Telugu, Hindi, Tamil', 220.00, 'The clash continues as Pushpa Raj expands his red sandalwood empire and asserts his dominance.', '🔥 Trending #2', 'https://upload.wikimedia.org/wikipedia/en/1/11/Pushpa_2-_The_Rule.jpg'),
('MOV-003', 'Devara: Part 1', 158, 'Action', 'U/A', '🌊', 'Telugu, Hindi, Tamil', 200.00, 'An epic coastal saga of bravery, fearlessness, and loyalty set across treacherous seas.', '🔥 Trending #3', 'https://upload.wikimedia.org/wikipedia/en/4/44/Devara_Poster.jpeg'),
('MOV-004', 'Game Changer', 155, 'Drama', 'U/A', '🗳️', 'Telugu, Tamil, Hindi', 200.00, 'An honest IAS officer takes on corrupt political systems to revolutionize democratic elections.', '⚡ New Release', 'https://upload.wikimedia.org/wikipedia/en/6/6a/Game_Changer_Telugu.jpg'),
('MOV-005', 'Stree 2', 147, 'Horror', 'U/A', '👻', 'Hindi, Telugu', 180.00, 'The town of Chanderi faces a new terrifying headless entity, Sarkata.', '😂 Blockbuster', 'https://upload.wikimedia.org/wikipedia/en/8/85/Stree_2_poster.jpeg'),
('MOV-006', 'Deadpool & Wolverine', 128, 'Comedy', 'A', '⚔️', 'English, Telugu, Hindi', 240.00, 'Wolverine crosses paths with the loudmouth Deadpool to defeat a common enemy.', '🍿 Global Hit', 'https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg')
ON DUPLICATE KEY UPDATE title=VALUES(title), image_url=VALUES(image_url);

-- Default Theatres
INSERT INTO theatres (id, name, location, city, distance, screens_count) VALUES
('TH-001', 'AMB Cinemas - VIP Dolby Atmos', 'Kondapur, Hyderabad', 'Hyderabad', '2.1 km', 7),
('TH-002', 'PVR Next Galleria Mall', 'Panjagutta, Hyderabad', 'Hyderabad', '4.5 km', 6),
('TH-003', 'Prasads Multiplex & IMAX Screen', 'NTR Marg, Hyderabad', 'Hyderabad', '5.2 km', 5),
('TH-004', 'INOX Megaplex - GVK One', 'Banjara Hills, Hyderabad', 'Hyderabad', '3.8 km', 5),
('TH-005', 'PVP Square Cinepolis', 'M.G. Road, Vijayawada', 'Vijayawada', '1.5 km', 6),
('TH-006', 'INOX CMR Central', 'Maddilapalem, Visakhapatnam', 'Vizag', '2.0 km', 6)
ON DUPLICATE KEY UPDATE name=VALUES(name);
