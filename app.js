/* ═════════════════════════════════════════════════════════════
   SMART CINEMA — OBJECT-ORIENTED SINGLE PAGE APPLICATION (SPA)
   Built with ES6+ JavaScript, OOP Principles & Local Storage
   ═════════════════════════════════════════════════════════════ */

// ── UTILITY FUNCTIONS ──
function uid(prefix = 'ID', len = 6) {
  return `${prefix}-${Math.random().toString(36).substring(2, 2 + len).toUpperCase()}`;
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// ── ENUMS ──
const SeatType = { REGULAR: 'Regular', PREMIUM: 'Premium', RECLINER: 'Recliner' };
const SeatStatus = { AVAILABLE: 'Available', BOOKED: 'Booked', LOCKED: 'Locked' };
const BookingStatus = { PENDING: 'Pending', CONFIRMED: 'Confirmed', CANCELLED: 'Cancelled' };

// ── DOMAIN MODEL CLASSES (OOP Hierarchy & Encapsulation) ──

class Person {
  constructor(name, email, role = 'Customer') {
    this.name = name;
    this.email = email;
    this.role = role;
  }
}

class Customer extends Person {
  constructor(name, email, phone = '', password = 'password123') {
    super(name, email, 'Customer');
    this.id = uid('CUST', 6);
    this.phone = phone;
    this.password = password;
    this.createdAt = new Date().toISOString();
  }
}

class Admin extends Person {
  constructor(name, email, password = 'admin123') {
    super(name, email, 'Admin');
    this.id = uid('ADM', 4);
    this.password = password;
  }
}

class Seat {
  constructor(row, number, type = SeatType.REGULAR) {
    this.row = row;
    this.number = number;
    this.type = type;
    this.status = SeatStatus.AVAILABLE;
  }

  get label() { return `${this.row}${this.number}`; }

  isAvailable() { return this.status === SeatStatus.AVAILABLE; }

  lock() {
    if (!this.isAvailable()) throw new Error(`Seat ${this.label} is unavailable.`);
    this.status = SeatStatus.LOCKED;
  }

  book() { this.status = SeatStatus.BOOKED; }

  release() { this.status = SeatStatus.AVAILABLE; }

  get priceMultiplier() {
    if (this.type === SeatType.RECLINER) return 2.0;
    if (this.type === SeatType.PREMIUM) return 1.5;
    return 1.0;
  }
}

class Screen {
  constructor(id, name = 'Screen 1', rows = 5, seatsPerRow = 8, premiumRows = [3, 4], reclinerRows = [5]) {
    this.id = id;
    this.name = name;
    this.rows = rows;
    this.seatsPerRow = seatsPerRow;
    this.seats = {};

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < rows; r++) {
      const rowLetter = letters[r];
      const rowNum = r + 1;
      const type = reclinerRows.includes(rowNum) ? SeatType.RECLINER
                 : premiumRows.includes(rowNum)  ? SeatType.PREMIUM
                 : SeatType.REGULAR;

      for (let n = 1; n <= seatsPerRow; n++) {
        const seat = new Seat(rowLetter, n, type);
        this.seats[seat.label] = seat;
      }
    }
  }

  availableCount() {
    return Object.values(this.seats).filter(s => s.isAvailable()).length;
  }

  getSeat(label) { return this.seats[label]; }
}

class Movie {
  constructor(title, duration, genre, rating = 'U/A', emoji = '🎬', lang = 'Telugu, English', basePrice = 150, description = '', releaseDate = '2026-08-01', id = null) {
    this.id = id || uid('MOV', 6);
    this.title = title;
    this.duration = parseInt(duration) || 120;
    this.genre = genre;
    this.rating = rating;
    this.emoji = emoji || '🎬';
    this.lang = lang;
    this.basePrice = parseFloat(basePrice) || 150;
    this.description = description || 'Experience the cinema magic in ultra-high resolution and Dolby Atmos audio.';
    this.releaseDate = releaseDate;
  }
}

class Theatre {
  constructor(name, location, screensCount = 3, id = null) {
    this.id = id || uid('TH', 6);
    this.name = name;
    this.location = location;
    this.screensCount = parseInt(screensCount) || 3;
  }
}

class Show {
  constructor(movie, theatre, screen, dateTimeStr, basePrice = null, id = null) {
    this.id = id || uid('SH', 6);
    this.movie = movie;
    this.theatre = theatre;
    this.screen = screen;
    this.dateTime = new Date(dateTimeStr);
    this.basePrice = basePrice || movie.basePrice;
  }

  priceForSeat(seat) {
    return Math.round(this.basePrice * seat.priceMultiplier);
  }

  get formattedTime() {
    return this.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  get formattedDate() {
    return this.dateTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

class Booking {
  constructor(customer, show, seats, paymentMethod = 'Card', id = null) {
    this.id = id || uid('BK', 8);
    this.customer = customer;
    this.show = show;
    this.seats = seats.map(s => typeof s === 'string' ? show.screen.getSeat(s) || new Seat(s[0], parseInt(s.slice(1))) : s);
    this.paymentMethod = paymentMethod;
    this.subtotal = this.seats.reduce((sum, seat) => sum + show.priceForSeat(seat), 0);
    this.convFee = Math.round(this.subtotal * 0.02);
    this.totalAmount = this.subtotal + this.convFee;
    this.status = BookingStatus.CONFIRMED;
    this.createdAt = new Date().toLocaleString();
  }

  cancel() {
    if (this.status === BookingStatus.CONFIRMED) {
      this.seats.forEach(s => s.release());
      this.status = BookingStatus.CANCELLED;
    }
  }
}

// ── CINEMA SYSTEM DATA ORCHESTRATOR ──

class CinemaSystem {
  constructor() {
    this.movies = [];
    this.theatres = [];
    this.shows = [];
    this.users = [];
    this.bookings = [];
    this.currentUser = null;
    this.selectedMovie = null;
    this.selectedShow = null;
    this.selectedSeats = [];
    this.activeGenre = 'All';

    this.initData();
  }

  initData() {
    // Load from LocalStorage if present
    const savedMovies = localStorage.getItem('sc_movies');
    const savedTheatres = localStorage.getItem('sc_theatres');
    const savedUsers = localStorage.getItem('sc_users');
    const savedBookings = localStorage.getItem('sc_bookings');
    const savedCurrentUser = localStorage.getItem('sc_current_user');

    if (savedMovies) {
      const raw = JSON.parse(savedMovies);
      this.movies = raw.map(m => new Movie(m.title, m.duration, m.genre, m.rating, m.emoji, m.lang, m.basePrice, m.description, m.releaseDate, m.id));
    } else {
      this.movies = [
        new Movie('Inception 2: Mind Shift', 148, 'Sci-Fi', 'U/A', '🚀', 'English, Telugu', 200, 'A mind-bending thriller exploring deeper layers of the subconscious realm.'),
        new Movie('The Last Village', 120, 'Drama', 'U', '🌿', 'Telugu', 150, 'An inspiring tale of resilience and community spirit in a remote valley.'),
        new Movie('Neon Shadows', 105, 'Thriller', 'A', '🕵️', 'Hindi, English', 180, 'A cyber-noir detective story set in a glowing futuristic metropolis.'),
        new Movie('Laugh Out Loud', 95, 'Comedy', 'U', '😂', 'Telugu, Hindi', 120, 'A hilarious journey of three friends embarking on an unexpected road trip.'),
        new Movie('Spectral Hunt', 110, 'Horror', 'A', '👻', 'English', 160, 'Paranormal investigators uncover ancient secrets in an abandoned estate.'),
        new Movie('Hearts in Venice', 130, 'Romance', 'U/A', '💖', 'English', 175, 'A picturesque romantic journey through the romantic canals of Italy.')
      ];
      this.saveMovies();
    }

    if (savedTheatres) {
      const raw = JSON.parse(savedTheatres);
      this.theatres = raw.map(t => new Theatre(t.name, t.location, t.screensCount, t.id));
    } else {
      this.theatres = [
        new Theatre('PVR Cinemax - Gachibowli', 'Hyderabad, Telangana', 4),
        new Theatre('Inox Megaplex - Banjara Hills', 'Hyderabad, Telangana', 5),
        new Theatre('AMB Cinemas - Kondapur', 'Hyderabad, Telangana', 7)
      ];
      this.saveTheatres();
    }

    if (savedUsers) {
      const raw = JSON.parse(savedUsers);
      this.users = raw.map(u => u.role === 'Admin' ? new Admin(u.name, u.email, u.password) : new Customer(u.name, u.email, u.phone, u.password));
    } else {
      this.users = [
        new Admin('System Admin', 'admin@smartcinema.com', 'admin123'),
        new Customer('Anjali Bommisetti', 'user@example.com', '9876543210', 'user123')
      ];
      this.saveUsers();
    }

    // Build shows dynamically based on movies & theatres
    this.buildShows();

    if (savedCurrentUser) {
      this.currentUser = JSON.parse(savedCurrentUser);
    }
  }

  buildShows() {
    this.shows = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1);

    this.movies.forEach((movie, mIdx) => {
      this.theatres.forEach((theatre, tIdx) => {
        const screen = new Screen(`Screen-${(mIdx + tIdx) % 3 + 1}`, `Audi ${(mIdx + tIdx) % 3 + 1}`);
        const showTimes = ['11:00', '14:30', '18:15', '21:30'];

        showTimes.forEach((timeStr, sIdx) => {
          const [hours, mins] = timeStr.split(':');
          const dt = new Date(baseDate);
          dt.setHours(parseInt(hours), parseInt(mins), 0);
          dt.setDate(baseDate.getDate() + sIdx);
          this.shows.push(new Show(movie, theatre, screen, dt.toISOString(), movie.basePrice));
        });
      });
    });
  }

  saveMovies() { localStorage.setItem('sc_movies', JSON.stringify(this.movies)); }
  saveTheatres() { localStorage.setItem('sc_theatres', JSON.stringify(this.theatres)); }
  saveUsers() { localStorage.setItem('sc_users', JSON.stringify(this.users)); }
  saveBookings() { localStorage.setItem('sc_bookings', JSON.stringify(this.bookings)); }
  saveSession() { localStorage.setItem('sc_current_user', JSON.stringify(this.currentUser)); }

  login(email, password) {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    this.currentUser = user;
    this.saveSession();
    return user;
  }

  register(fname, lname, email, phone, password) {
    const name = `${fname} ${lname}`.trim();
    if (this.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const newUser = new Customer(name, email, phone, password);
    this.users.push(newUser);
    this.saveUsers();
    this.currentUser = newUser;
    this.saveSession();
    return newUser;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('sc_current_user');
  }

  addBooking(booking) {
    this.bookings.push(booking);
    this.saveBookings();
  }
}

// Instantiate global system
const app = new CinemaSystem();

// ── GLOBAL INTERFACE HANDLERS & ROUTING ──

window.navigate = function(viewId) {
  // Hide all view sections
  const views = document.querySelectorAll('.view');
  views.forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.classList.add('active');
  }

  // Header & Footer visibility
  const navbar = document.getElementById('main-navbar');
  const footer = document.getElementById('main-footer');
  if (viewId === 'splash' || viewId === 'auth') {
    if (navbar) navbar.classList.add('hidden');
    if (footer) footer.classList.add('hidden');
  } else {
    if (navbar) navbar.classList.remove('hidden');
    if (footer) footer.classList.remove('hidden');
  }

  // Update Nav Links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.nav === viewId) link.classList.add('active');
    else link.classList.remove('active');
  });

  // Page specific renders
  if (viewId === 'home') renderMoviesGrid();
  if (viewId === 'history') renderHistoryView();
  if (viewId === 'profile') renderProfileView();
  if (viewId === 'admin') renderAdminView();

  window.scrollTo(0, 0);
};

window.switchAuthTab = function(tab) {
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');

  if (tab === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
  } else {
    regTab.classList.add('active');
    loginTab.classList.remove('active');
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
};

window.togglePass = function(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
};

window.handleLogin = function(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value.trim();

  try {
    const user = app.login(email, pass);
    updateUserNavbar();
    showToast(`Welcome back, ${user.name}! 🍿`);
    if (user.role === 'Admin') navigate('admin');
    else navigate('home');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.handleRegister = function(event) {
  event.preventDefault();
  const fname = document.getElementById('reg-fname').value.trim();
  const lname = document.getElementById('reg-lname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass = document.getElementById('reg-password').value.trim();

  try {
    const user = app.register(fname, lname, email, phone, pass);
    updateUserNavbar();
    showToast(`Account created successfully! Welcome ${user.name} 🎉`);
    navigate('home');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.authLogout = function() {
  app.logout();
  updateUserNavbar();
  showToast('Logged out successfully');
  navigate('auth');
};

function updateUserNavbar() {
  const userLabel = document.getElementById('nav-user-name');
  const adminNav = document.querySelector('.nav-link.admin-only');

  if (app.currentUser) {
    if (userLabel) userLabel.textContent = `👤 ${app.currentUser.name}`;
    if (adminNav) {
      if (app.currentUser.role === 'Admin') adminNav.classList.remove('hidden');
      else adminNav.classList.add('hidden');
    }
  } else {
    if (userLabel) userLabel.textContent = '';
    if (adminNav) adminNav.classList.add('hidden');
  }
}

// ── MOVIES & FILTERS ──

window.setGenre = function(genre, btnElement) {
  app.activeGenre = genre;
  document.querySelectorAll('#filter-chips .chip').forEach(c => c.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderMoviesGrid();
};

window.filterMovies = function() {
  renderMoviesGrid();
};

function renderMoviesGrid() {
  const grid = document.getElementById('movies-grid');
  const noRes = document.getElementById('no-results');
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();

  if (!grid) return;

  const filtered = app.movies.filter(m => {
    const matchGenre = app.activeGenre === 'All' || m.genre.toLowerCase() === app.activeGenre.toLowerCase();
    const matchSearch = m.title.toLowerCase().includes(query) || m.genre.toLowerCase().includes(query);
    return matchGenre && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noRes) noRes.classList.remove('hidden');
    return;
  }

  if (noRes) noRes.classList.add('hidden');
  grid.innerHTML = filtered.map(m => `
    <div class="movie-card" onclick="viewMovieDetail('${m.id}')">
      <div class="movie-poster">${m.emoji}</div>
      <div class="movie-info">
        <div>
          <span class="movie-genre">${m.genre}</span>
          <h3 class="movie-title">${m.title}</h3>
          <div class="movie-meta">
            <span>⏱ ${m.duration} min</span>
            <span class="movie-rating">⭐ ${m.rating}</span>
          </div>
        </div>
        <button class="btn-book" onclick="event.stopPropagation(); startBooking('${m.id}')">Book Tickets · From ₹${m.basePrice}</button>
      </div>
    </div>
  `).join('');
}

window.viewMovieDetail = function(movieId) {
  const movie = app.movies.find(m => m.id === movieId);
  if (!movie) return;
  app.selectedMovie = movie;

  const container = document.getElementById('movie-detail-content');
  if (!container) return;

  const showsForMovie = app.shows.filter(s => s.movie.id === movie.id);

  container.innerHTML = `
    <div class="movie-detail-grid">
      <div class="detail-poster">${movie.emoji}</div>
      <div class="detail-info">
        <h1>${movie.title}</h1>
        <div class="detail-tags">
          <span class="tag">🎭 ${movie.genre}</span>
          <span class="tag">⏱ ${movie.duration} min</span>
          <span class="tag">⭐ ${movie.rating}</span>
          <span class="tag">🗣 ${movie.lang}</span>
        </div>
        <p class="detail-desc">${movie.description}</p>

        <h3 style="margin-top:24px;margin-bottom:16px;">Available Showtimes</h3>
        <div class="shows-grid">
          ${showsForMovie.slice(0, 6).map(s => `
            <div class="show-chip" onclick="selectShowtime('${s.id}')">
              <div class="show-time">${s.formattedTime}</div>
              <div class="show-sub">${s.theatre.name.split('-')[0]}</div>
              <div class="show-sub" style="color:var(--gold);font-weight:600">₹${s.basePrice}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  navigate('movie-detail');
};

window.startBooking = function(movieId) {
  const movie = app.movies.find(m => m.id === movieId);
  if (!movie) return;
  app.selectedMovie = movie;

  const titleEl = document.getElementById('theatre-movie-name');
  if (titleEl) titleEl.textContent = `${movie.emoji} ${movie.title} (${movie.genre} · ${movie.duration} min)`;

  const theatreListEl = document.getElementById('theatre-list');
  if (!theatreListEl) return;

  const showsForMovie = app.shows.filter(s => s.movie.id === movie.id);
  const theatreMap = {};

  showsForMovie.forEach(s => {
    if (!theatreMap[s.theatre.id]) {
      theatreMap[s.theatre.id] = { theatre: s.theatre, shows: [] };
    }
    theatreMap[s.theatre.id].shows.push(s);
  });

  theatreListEl.innerHTML = Object.values(theatreMap).map(item => `
    <div class="theatre-card">
      <div class="theatre-header">
        <div>
          <div class="theatre-name">${item.theatre.name}</div>
          <div class="theatre-loc">📍 ${item.theatre.location}</div>
        </div>
      </div>
      <div class="shows-grid">
        ${item.shows.map(sh => `
          <div class="show-chip" onclick="selectShowtime('${sh.id}')">
            <div class="show-time">${sh.formattedTime}</div>
            <div class="show-sub">${sh.screen.name}</div>
            <div class="show-sub" style="color:var(--gold);font-weight:600">₹${sh.basePrice}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  navigate('theatre');
};

window.selectShowtime = function(showId) {
  if (!app.currentUser) {
    showToast('Please login or register to book seats!', 'error');
    navigate('auth');
    return;
  }

  const show = app.shows.find(s => s.id === showId);
  if (!show) return;
  app.selectedShow = show;
  app.selectedSeats = [];

  renderSeatSelectionView();
  navigate('seats');
};

// ── SEAT MATRIX VIEW ──

function renderSeatSelectionView() {
  const show = app.selectedShow;
  const container = document.getElementById('seat-selection-content');
  if (!container || !show) return;

  const screen = show.screen;
  const rows = {};
  Object.values(screen.seats).forEach(s => {
    if (!rows[s.row]) rows[s.row] = [];
    rows[s.row].push(s);
  });

  const sortedRows = Object.keys(rows).sort();

  let mapHTML = `
    <div class="seat-screen-wrap">
      <div class="screen-curved"></div>
      <div class="screen-text">SCREEN THIS WAY</div>
    </div>
    <div class="seat-map">
  `;

  sortedRows.forEach(rowKey => {
    const seats = rows[rowKey].sort((a, b) => a.number - b.number);
    mapHTML += `<div class="seat-row"><div class="seat-row-label">${rowKey}</div>`;
    seats.forEach(s => {
      const typeClass = s.type === SeatType.PREMIUM ? 'premium' : s.type === SeatType.RECLINER ? 'recliner' : '';
      const isSel = app.selectedSeats.includes(s.label);
      const statusClass = isSel ? 'selected' : (s.status === SeatStatus.BOOKED ? 'booked' : 'available');
      mapHTML += `<div class="seat ${typeClass} ${statusClass}" onclick="toggleSeat('${s.label}')">${s.number}</div>`;
    });
    mapHTML += '</div>';
  });

  mapHTML += '</div>';

  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2>${show.movie.emoji} ${show.movie.title}</h2>
      <p style="color:var(--text-dim);">${show.theatre.name} · ${show.screen.name} · ${show.formattedDate} at ${show.formattedTime}</p>
    </div>

    ${mapHTML}

    <div class="seat-legend">
      <div class="legend-item"><div class="legend-dot ld-avail"></div>Regular (₹${show.basePrice})</div>
      <div class="legend-item"><div class="legend-dot ld-premium"></div>Premium (₹${Math.round(show.basePrice * 1.5)})</div>
      <div class="legend-item"><div class="legend-dot ld-recliner"></div>Recliner (₹${Math.round(show.basePrice * 2.0)})</div>
      <div class="legend-item"><div class="legend-dot ld-sel"></div>Selected</div>
      <div class="legend-item"><div class="legend-dot ld-booked"></div>Booked</div>
    </div>

    <div class="seat-summary-box">
      <div>
        <div style="font-size:12px;color:var(--text-dim)">SELECTED SEATS</div>
        <div style="font-size:18px;font-weight:700" id="selected-seat-labels">None</div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--text-dim)">TOTAL AMOUNT</div>
        <div style="font-size:24px;font-weight:800;color:var(--gold)" id="selected-seat-total">₹0</div>
      </div>
      <button class="btn-primary" onclick="proceedToPayment()">Proceed to Payment →</button>
    </div>
  `;
}

window.toggleSeat = function(label) {
  const show = app.selectedShow;
  if (!show) return;
  const seat = show.screen.getSeat(label);
  if (!seat || !seat.isAvailable()) return;

  const idx = app.selectedSeats.indexOf(label);
  if (idx > -1) {
    app.selectedSeats.splice(idx, 1);
  } else {
    app.selectedSeats.push(label);
  }

  // Update Summary UI
  const labelsEl = document.getElementById('selected-seat-labels');
  const totalEl = document.getElementById('selected-seat-total');

  if (labelsEl && totalEl) {
    labelsEl.textContent = app.selectedSeats.join(', ') || 'None';
    const total = app.selectedSeats.reduce((sum, l) => sum + show.priceForSeat(show.screen.getSeat(l)), 0);
    totalEl.textContent = `₹${total}`;
  }

  // Update seat element active class
  renderSeatSelectionView();
};

window.proceedToPayment = function() {
  if (app.selectedSeats.length === 0) {
    showToast('Please select at least one seat!', 'error');
    return;
  }

  renderPaymentView();
  navigate('payment');
};

// ── PAYMENT VIEW ──

function renderPaymentView() {
  const show = app.selectedShow;
  const container = document.getElementById('payment-content');
  if (!container || !show) return;

  const seatObjects = app.selectedSeats.map(l => show.screen.getSeat(l));
  const subtotal = seatObjects.reduce((sum, s) => sum + show.priceForSeat(s), 0);
  const convFee = Math.round(subtotal * 0.02);
  const total = subtotal + convFee;

  container.innerHTML = `
    <div class="pay-card">
      <h3 style="margin-bottom:16px;">Order Summary</h3>
      <div class="pay-breakdown">
        <div class="pay-line"><span>Movie</span><strong>${show.movie.emoji} ${show.movie.title}</strong></div>
        <div class="pay-line"><span>Theatre</span><span>${show.theatre.name}</span></div>
        <div class="pay-line"><span>Showtime</span><span>${show.formattedFull}</span></div>
        <div class="pay-line"><span>Seats (${app.selectedSeats.length})</span><span>${app.selectedSeats.join(', ')}</span></div>
        <div class="pay-line"><span>Subtotal</span><span>₹${subtotal}</span></div>
        <div class="pay-line"><span>Convenience Fee (2%)</span><span>₹${convFee}</span></div>
        <div class="pay-line total"><span>Total Payable</span><span>₹${total}</span></div>
      </div>

      <h3 style="margin-bottom:16px;">Select Payment Method</h3>
      <div class="pay-methods">
        <label class="pay-method-option selected">
          <input type="radio" name="pay-method" value="Card" checked/> 💳 Credit / Debit Card
        </label>
        <label class="pay-method-option">
          <input type="radio" name="pay-method" value="UPI"/> 📱 UPI / GPay / PhonePe
        </label>
        <label class="pay-method-option">
          <input type="radio" name="pay-method" value="NetBanking"/> 🏦 Net Banking
        </label>
      </div>

      <button class="btn-primary full" onclick="submitPayment()">Pay ₹${total} & Confirm Booking</button>
    </div>
  `;
}

window.submitPayment = function() {
  openModal('modal-processing');
  const bar = document.getElementById('proc-fill');
  if (bar) bar.style.width = '100%';

  setTimeout(() => {
    closeModal('modal-processing');
    if (bar) bar.style.width = '0%';

    const show = app.selectedShow;
    const booking = new Booking(app.currentUser, show, app.selectedSeats, 'Card');
    booking.seats.forEach(s => s.book());
    app.addBooking(booking);

    renderTicketView(booking);
    showToast('Payment successful! Ticket confirmed 🎉');
    navigate('ticket');
  }, 1600);
};

// ── DIGITAL TICKET VIEW ──

function renderTicketView(booking) {
  const container = document.getElementById('ticket-content');
  if (!container || !booking) return;

  const show = booking.show;

  container.innerHTML = `
    <div class="ticket-card">
      <div class="ticket-header-stub">
        <h2>SmartCinema</h2>
        <p>E-TICKET CONFIRMATION</p>
      </div>
      <div class="ticket-body-stub">
        <div class="ticket-info-grid">
          <div>
            <div class="ticket-field-label">BOOKING REF</div>
            <div class="ticket-field-value" style="color:var(--gold)">#${booking.id}</div>
          </div>
          <div>
            <div class="ticket-field-label">PASSENGER</div>
            <div class="ticket-field-value">${booking.customer.name}</div>
          </div>
          <div>
            <div class="ticket-field-label">MOVIE</div>
            <div class="ticket-field-value">${show.movie.emoji} ${show.movie.title}</div>
          </div>
          <div>
            <div class="ticket-field-label">THEATRE</div>
            <div class="ticket-field-value">${show.theatre.name}</div>
          </div>
          <div>
            <div class="ticket-field-label">SHOW DATE & TIME</div>
            <div class="ticket-field-value">${show.formattedFull}</div>
          </div>
          <div>
            <div class="ticket-field-label">SEATS BOOKED</div>
            <div class="ticket-field-value">${booking.seats.map(s => s.label).join(', ')}</div>
          </div>
        </div>

        <div class="ticket-barcode-wrap">
          <div class="barcode-lines"></div>
          <div style="font-size:12px;color:var(--text-dim);letter-spacing:3px;">*${booking.id}*</div>
        </div>
      </div>
    </div>
  `;
}

window.printTicket = function() {
  window.print();
};

// ── MY BOOKINGS HISTORY VIEW ──

function renderHistoryView() {
  const container = document.getElementById('history-content');
  if (!container) return;

  if (!app.currentUser) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <h3>Please log in to view your bookings.</h3>
        <button class="btn-primary mt" onclick="navigate('auth')">Login Now</button>
      </div>
    `;
    return;
  }

  const userBookings = app.bookings.filter(b => b.customer.email === app.currentUser.email);

  if (userBookings.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:12px">🎟️</div>
        <h3>No bookings found yet.</h3>
        <p>Book your favorite movie to see your tickets here!</p>
        <button class="btn-primary mt" onclick="navigate('home')">Browse Movies</button>
      </div>
    `;
    return;
  }

  container.innerHTML = userBookings.slice().reverse().map(b => `
    <div class="booking-ticket">
      <div class="ticket-poster-icon">${b.show.movie.emoji}</div>
      <div class="ticket-details">
        <h3 class="ticket-title">${b.show.movie.title}</h3>
        <div class="ticket-sub">📍 ${b.show.theatre.name} · ⏰ ${b.show.formattedFull}</div>
        <div class="ticket-badges">
          ${b.seats.map(s => `<span class="seat-badge">${s.label}</span>`).join('')}
          <span class="status-badge ${b.status.toLowerCase()}">${b.status}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;color:var(--gold)">₹${b.totalAmount}</div>
        ${b.status === BookingStatus.CONFIRMED ? `<button class="btn-danger mt" onclick="cancelBooking('${b.id}')">Cancel Booking</button>` : ''}
      </div>
    </div>
  `).join('');
}

window.cancelBooking = function(bookingId) {
  const booking = app.bookings.find(b => b.id === bookingId);
  if (booking) {
    booking.cancel();
    app.saveBookings();
    renderHistoryView();
    showToast('Booking cancelled successfully');
  }
};

// ── USER PROFILE VIEW ──

function renderProfileView() {
  const container = document.getElementById('profile-content');
  if (!container) return;

  if (!app.currentUser) {
    container.innerHTML = `<p>Please login first.</p>`;
    return;
  }

  const userBookings = app.bookings.filter(b => b.customer.email === app.currentUser.email);
  const confirmedCount = userBookings.filter(b => b.status === BookingStatus.CONFIRMED).length;
  const totalSpent = userBookings.filter(b => b.status === BookingStatus.CONFIRMED).reduce((sum, b) => sum + b.totalAmount, 0);

  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-header-user">
        <div class="profile-avatar-circle">${app.currentUser.name[0]}</div>
        <div>
          <h2>${app.currentUser.name}</h2>
          <p style="color:var(--text-dim)">${app.currentUser.email} · ${app.currentUser.role}</p>
        </div>
      </div>
      <div class="profile-stats-grid">
        <div class="stat-box">
          <div class="stat-val">${confirmedCount}</div>
          <div class="stat-lbl">Active Bookings</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">₹${totalSpent}</div>
          <div class="stat-lbl">Total Spent</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">VIP</div>
          <div class="stat-lbl">Member Status</div>
        </div>
      </div>
    </div>
  `;
}

// ── ADMIN DASHBOARD VIEW ──

window.switchAdminTab = function(tabName, btnElement) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`admin-${tabName}`);
  if (target) target.classList.add('active');

  renderAdminView();
};

function renderAdminView() {
  if (!app.currentUser || app.currentUser.role !== 'Admin') return;

  // Overview Stats
  const statsContainer = document.getElementById('admin-stats');
  if (statsContainer) {
    const totalRev = app.bookings.filter(b => b.status === BookingStatus.CONFIRMED).reduce((sum, b) => sum + b.totalAmount, 0);
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="lbl">TOTAL REVENUE</div>
        <div class="num">₹${totalRev}</div>
      </div>
      <div class="stat-card">
        <div class="lbl">ACTIVE MOVIES</div>
        <div class="num">${app.movies.length}</div>
      </div>
      <div class="stat-card">
        <div class="lbl">TOTAL BOOKINGS</div>
        <div class="num">${app.bookings.length}</div>
      </div>
      <div class="stat-card">
        <div class="lbl">REGISTERED USERS</div>
        <div class="num">${app.users.length}</div>
      </div>
    `;
  }

  // Admin Movies List
  const moviesContent = document.getElementById('admin-movies-content');
  if (moviesContent) {
    moviesContent.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3>Movie Catalog Management</h3>
        <button class="btn-primary" onclick="openAddMovieModal()">+ Add New Movie</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>Emoji</th><th>Title</th><th>Genre</th><th>Duration</th><th>Base Price</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${app.movies.map(m => `
              <tr>
                <td>${m.emoji}</td>
                <td><strong>${m.title}</strong></td>
                <td>${m.genre}</td>
                <td>${m.duration} min</td>
                <td>₹${m.basePrice}</td>
                <td>
                  <button class="btn-outline" style="padding:4px 10px;font-size:12px;" onclick="editMovie('${m.id}')">Edit</button>
                  <button class="btn-danger" style="padding:4px 10px;font-size:12px;" onclick="deleteMovie('${m.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Admin Theatres List
  const theatresContent = document.getElementById('admin-theatres-content');
  if (theatresContent) {
    theatresContent.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3>Theatre Facilities</h3>
        <button class="btn-primary" onclick="openModal('modal-theatre')">+ Add Theatre</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>Theatre Name</th><th>Location</th><th>Screens</th></tr>
          </thead>
          <tbody>
            ${app.theatres.map(t => `
              <tr>
                <td><strong>${t.name}</strong></td>
                <td>${t.location}</td>
                <td>${t.screensCount} Screens</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Admin Bookings List
  const bookingsContent = document.getElementById('admin-bookings-content');
  if (bookingsContent) {
    bookingsContent.innerHTML = `
      <h3 style="margin-bottom:20px;">All Customer Bookings Audit Log</h3>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>ID</th><th>Customer</th><th>Movie</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${app.bookings.map(b => `
              <tr>
                <td>#${b.id}</td>
                <td>${b.customer.name}</td>
                <td>${b.show.movie.title}</td>
                <td>₹${b.totalAmount}</td>
                <td><span class="status-badge ${b.status.toLowerCase()}">${b.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Admin Users List
  const usersContent = document.getElementById('admin-users-content');
  if (usersContent) {
    usersContent.innerHTML = `
      <h3 style="margin-bottom:20px;">Registered System Accounts</h3>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th></tr>
          </thead>
          <tbody>
            ${app.users.map(u => `
              <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="status-badge ${u.role === 'Admin' ? 'confirmed' : 'available'}">${u.role}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Admin Reports
  const reportsContent = document.getElementById('admin-reports-content');
  if (reportsContent) {
    reportsContent.innerHTML = `
      <h3>System Performance Reports</h3>
      <p style="color:var(--text-dim);margin-top:8px;">Real-time booking occupancy rate is currently at <strong>84% peak volume</strong>.</p>
    `;
  }
}

// Admin Movie CRUD Handlers
window.openAddMovieModal = function() {
  document.getElementById('movie-form').reset();
  document.getElementById('m-edit-id').value = '';
  document.getElementById('movie-modal-title').textContent = 'Add Movie';
  openModal('modal-movie');
};

window.editMovie = function(movieId) {
  const m = app.movies.find(mov => mov.id === movieId);
  if (!m) return;
  document.getElementById('m-edit-id').value = m.id;
  document.getElementById('m-title').value = m.title;
  document.getElementById('m-genre').value = m.genre;
  document.getElementById('m-lang').value = m.lang;
  document.getElementById('m-duration').value = m.duration;
  document.getElementById('m-release').value = m.releaseDate;
  document.getElementById('m-rating').value = m.rating;
  document.getElementById('m-price').value = m.basePrice;
  document.getElementById('m-emoji').value = m.emoji;
  document.getElementById('m-desc').value = m.description;
  document.getElementById('movie-modal-title').textContent = 'Edit Movie';
  openModal('modal-movie');
};

window.saveMovie = function(event) {
  event.preventDefault();
  const id = document.getElementById('m-edit-id').value;
  const title = document.getElementById('m-title').value.trim();
  const genre = document.getElementById('m-genre').value;
  const lang = document.getElementById('m-lang').value.trim();
  const duration = document.getElementById('m-duration').value;
  const release = document.getElementById('m-release').value;
  const rating = document.getElementById('m-rating').value;
  const price = document.getElementById('m-price').value;
  const emoji = document.getElementById('m-emoji').value.trim() || '🎬';
  const desc = document.getElementById('m-desc').value.trim();

  if (id) {
    const m = app.movies.find(mov => mov.id === id);
    if (m) {
      m.title = title; m.genre = genre; m.lang = lang; m.duration = duration;
      m.releaseDate = release; m.rating = rating; m.basePrice = price; m.emoji = emoji; m.description = desc;
    }
  } else {
    app.movies.push(new Movie(title, duration, genre, rating, emoji, lang, price, desc, release));
  }

  app.saveMovies();
  app.buildShows();
  closeModal('modal-movie');
  renderAdminView();
  renderMoviesGrid();
  showToast('Movie catalog updated!');
};

window.deleteMovie = function(movieId) {
  app.movies = app.movies.filter(m => m.id !== movieId);
  app.saveMovies();
  app.buildShows();
  renderAdminView();
  renderMoviesGrid();
  showToast('Movie deleted');
};

window.saveTheatre = function(event) {
  event.preventDefault();
  const name = document.getElementById('t-name').value.trim();
  const loc = document.getElementById('t-location').value.trim();
  const screens = document.getElementById('t-screens').value;

  app.theatres.push(new Theatre(name, loc, screens));
  app.saveTheatres();
  app.buildShows();
  closeModal('modal-theatre');
  renderAdminView();
  showToast('Theatre added successfully');
};

// ── INITIALIZATION ──

document.addEventListener('DOMContentLoaded', () => {
  updateUserNavbar();

  // Attach navbar item click handlers
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.nav;
      if (target) navigate(target);
    });
  });

  // Hide splash screen after 1.2s and launch SPA
  setTimeout(() => {
    if (app.currentUser) {
      navigate('home');
    } else {
      navigate('auth');
    }
  }, 1200);
});
