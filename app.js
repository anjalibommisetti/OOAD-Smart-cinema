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
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('open');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    modal.classList.add('hidden');
  }
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
  constructor(title, duration, genre, rating = 'U/A', emoji = '🎬', lang = 'Telugu, English', basePrice = 180, description = '', trendingTag = '🔥 Trending', releaseDate = '2026-08-01', id = null, imageUrl = '') {
    this.id = id || uid('MOV', 6);
    this.title = title;
    this.duration = parseInt(duration) || 120;
    this.genre = genre;
    this.rating = rating;
    this.emoji = emoji || '🎬';
    this.lang = lang;
    this.basePrice = parseFloat(basePrice) || 180;
    this.description = description || 'Experience the cinema magic in ultra-high resolution and Dolby Atmos audio.';
    this.trendingTag = trendingTag;
    this.releaseDate = releaseDate;
    this.imageUrl = imageUrl || '';
  }
}

class Theatre {
  constructor(name, location, city = 'Hyderabad', distance = '2.5 km', screensCount = 4, id = null, imageUrl = '') {
    this.id = id || uid('TH', 6);
    this.name = name;
    this.location = location;
    this.city = city;
    this.distance = distance;
    this.screensCount = parseInt(screensCount) || 4;
    this.imageUrl = imageUrl || '';
  }
}

class Show {
  constructor(movie, theatre, screen, dateTimeStr, basePrice = null, statusText = '🟢 Available', id = null) {
    this.id = id || uid('SH', 6);
    this.movie = movie;
    this.theatre = theatre;
    this.screen = screen;
    this.dateTime = new Date(dateTimeStr);
    this.basePrice = basePrice || movie.basePrice;
    this.statusText = statusText;
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

  get formattedFull() {
    return `${this.formattedDate} at ${this.formattedTime}`;
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
    this.currentCity = localStorage.getItem('sc_city') || 'Hyderabad';

    this.initData();
    this.syncBackend();
  }

  async syncBackend() {
    try {
      const res = await fetch('http://localhost:3000/api/movies');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.movies && data.movies.length > 0) {
          this.movies = data.movies.map(m => new Movie(
            m.title, m.duration, m.genre, m.rating, m.emoji, m.lang, 
            parseFloat(m.base_price || m.basePrice), m.description, m.trending_tag || m.trendingTag, m.releaseDate, m.id, m.image_url || m.imageUrl || ''
          ));
          if (typeof renderMoviesGrid === 'function') renderMoviesGrid();
          console.log('⚡ Synced live movies from MySQL backend database!');
        }
      }
    } catch (e) {
      console.log('ℹ️ Running in standalone mode using local storage');
    }
  }

  initData() {
    const savedMovies = localStorage.getItem('sc_movies_v4');
    const savedTheatres = localStorage.getItem('sc_theatres_v4');
    const savedUsers = localStorage.getItem('sc_users');
    const savedBookings = localStorage.getItem('sc_bookings');
    const savedCurrentUser = localStorage.getItem('sc_current_user');

    if (savedMovies) {
      const raw = JSON.parse(savedMovies);
      this.movies = raw.map(m => new Movie(m.title, m.duration, m.genre, m.rating, m.emoji, m.lang, m.basePrice, m.description, m.trendingTag, m.releaseDate, m.id, m.imageUrl || ''));
    } else {
      this.movies = [
        new Movie('Kalki 2898 AD', 180, 'Sci-Fi', 'U/A', '⚡', 'Telugu, Hindi, English', 250, 'A modern avatar descends to earth in a futuristic dystopian era to save humanity from dark forces. Starring Prabhas, Amitabh Bachchan & Kamal Haasan.', '🔥 Trending #1', '2026-08-01', null, 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80'),
        new Movie('Pushpa 2: The Rule', 165, 'Action', 'U/A', '🪓', 'Telugu, Hindi, Tamil', 220, 'The clash continues as Pushpa Raj expands his red sandalwood empire and asserts his dominance against SP Bhanwar Singh Shekhawat. Starring Allu Arjun.', '🔥 Trending #2', '2026-08-01', null, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80'),
        new Movie('Devara: Part 1', 158, 'Action', 'U/A', '🌊', 'Telugu, Hindi, Tamil', 200, 'An epic coastal saga of bravery, fearlessness, and loyalty set across treacherous seas. Starring NTR Jr, Saif Ali Khan & Janhvi Kapoor.', '🔥 Trending #3', '2026-08-01', null, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'),
        new Movie('Game Changer', 155, 'Drama', 'U/A', '🗳️', 'Telugu, Tamil, Hindi', 200, 'An honest IAS officer takes on corrupt political systems to revolutionize democratic elections. Directed by S. Shankar, starring Ram Charan.', '⚡ New Release', '2026-08-01', null, 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80'),
        new Movie('Stree 2', 147, 'Horror', 'U/A', '👻', 'Hindi, Telugu', 180, 'The town of Chanderi faces a new terrifying headless entity, Sarkata. The group must unite with Stree to save the town. Starring Shraddha Kapoor.', '😂 Blockbuster', '2026-08-01', null, 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80'),
        new Movie('G.O.A.T: Greatest of All Time', 170, 'Sci-Fi', 'U/A', '🎯', 'Tamil, Telugu, Hindi', 210, 'An elite anti-terrorist squad agent is haunted by past missions, leading to high-octane action and clone mysteries. Starring Thalapathy Vijay.', '🔥 Mass Hit', '2026-08-01', null, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'),
        new Movie('Deadpool & Wolverine', 128, 'Comedy', 'A', '⚔️', 'English, Telugu, Hindi', 240, 'Wolverine is recovering from his injuries when he crosses paths with the loudmouth Deadpool to defeat a common enemy.', '🍿 Global Hit', '2026-08-01', null, 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80'),
        new Movie('Singham Again', 160, 'Action', 'U/A', '🦁', 'Hindi, Telugu', 190, 'Bajirao Singham leads the cop universe in an explosive fight against dangerous syndicate cartels. Starring Ajay Devgn & Ranveer Singh.', '💥 Action Spectacle', '2026-08-01', null, 'https://images.unsplash.com/photo-1533928298208-27ff66a55d8d?w=600&auto=format&fit=crop&q=80'),
        new Movie('Vettaiyan', 162, 'Drama', 'U/A', '🕶️', 'Tamil, Telugu, Hindi', 200, 'A ruthless senior police officer fights against corruption and extrajudicial encounter setups. Starring Rajinikanth & Amitabh Bachchan.', '🔥 Superstar Hit', '2026-08-01', null, 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80')
      ];
      this.saveMovies();
    }

    if (savedTheatres) {
      const raw = JSON.parse(savedTheatres);
      this.theatres = raw.map(t => new Theatre(t.name, t.location, t.city, t.distance, t.screensCount, t.id, t.imageUrl || ''));
    } else {
      this.theatres = [
        // Hyderabad
        new Theatre('AMB Cinemas - VIP Dolby Atmos', 'Kondapur, Hyderabad', 'Hyderabad', '2.1 km', 7),
        new Theatre('PVR Next Galleria Mall', 'Panjagutta, Hyderabad', 'Hyderabad', '4.5 km', 6),
        new Theatre('Prasads Multiplex & IMAX Screen', 'NTR Marg, Hyderabad', 'Hyderabad', '5.2 km', 5),
        new Theatre('INOX Megaplex - GVK One', 'Banjara Hills, Hyderabad', 'Hyderabad', '3.8 km', 5),
        new Theatre('Asian Jyoti Cinema', 'Kukatpally, Hyderabad', 'Hyderabad', '6.0 km', 4),

        // Vijayawada
        new Theatre('PVP Square Cinepolis', 'M.G. Road, Vijayawada', 'Vijayawada', '1.5 km', 6),
        new Theatre('Trendset Mall INOX', 'Benz Circle, Vijayawada', 'Vijayawada', '2.8 km', 5),
        new Theatre('Capital Cinemas', 'Vijayawada Central', 'Vijayawada', '3.2 km', 4),

        // Vizag
        new Theatre('INOX CMR Central', 'Maddilapalem, Visakhapatnam', 'Vizag', '2.0 km', 6),
        new Theatre('Jagadamba Theatre Complex', 'VSP Central, Visakhapatnam', 'Vizag', '1.8 km', 3),
        new Theatre('Mukta A2 Cinemas', 'Beach Road, Visakhapatnam', 'Vizag', '3.5 km', 4),

        // Bengaluru
        new Theatre('PVR Forum Mall', 'Koramangala, Bengaluru', 'Bengaluru', '3.0 km', 7),
        new Theatre('INOX Mantri Square', 'Malleshwaram, Bengaluru', 'Bengaluru', '4.2 km', 6),
        new Theatre('Cinepolis SJR Orion Mall', 'Rajajinagar, Bengaluru', 'Bengaluru', '5.5 km', 5),

        // Chennai
        new Theatre('SPI Luxe Cinemas', 'Phoenix Marketcity, Velachery', 'Chennai', '2.4 km', 8),
        new Theatre('PVR VR Chennai', 'Anna Nagar, Chennai', 'Chennai', '4.1 km', 10),

        // Mumbai
        new Theatre('PVR ICON Oberoi Mall', 'Goregaon East, Mumbai', 'Mumbai', '3.2 km', 6),
        new Theatre('INOX Laserplex R-City', 'Ghatkopar West, Mumbai', 'Mumbai', '4.0 km', 9)
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

    this.buildShows();

    if (savedCurrentUser) {
      this.currentUser = JSON.parse(savedCurrentUser);
    }
  }

  buildShows() {
    this.shows = [];
    const baseDate = new Date();

    this.movies.forEach((movie, mIdx) => {
      this.theatres.forEach((theatre, tIdx) => {
        const screenNumber = (mIdx + tIdx) % theatre.screensCount + 1;
        const formatName = screenNumber === 1 ? 'Audi 1 - 4K Atmos' : screenNumber === 2 ? 'Audi 2 - VIP Recliner' : `Audi ${screenNumber} - Digital 3D`;
        const screen = new Screen(`Screen-${theatre.id}-${screenNumber}`, formatName);

        const showTimes = ['10:45 AM', '02:15 PM', '06:00 PM', '09:30 PM'];

        showTimes.forEach((timeStr, sIdx) => {
          const dt = new Date(baseDate);
          dt.setDate(baseDate.getDate() + (sIdx % 2));
          const [time, period] = timeStr.split(' ');
          let [hours, mins] = time.split(':');
          hours = parseInt(hours);
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          dt.setHours(hours, parseInt(mins), 0);

          // Randomly pre-book some seats deterministically to simulate real live seat availability
          const seed = (mIdx * 17 + tIdx * 13 + sIdx * 7) % 100;
          const seatsArr = Object.values(screen.seats);
          const numBooked = Math.floor(seatsArr.length * ((seed % 40 + 10) / 100));

          for (let b = 0; b < numBooked; b++) {
            const seatIdx = (seed + b * 3) % seatsArr.length;
            seatsArr[seatIdx].status = SeatStatus.BOOKED;
          }

          const statusText = screen.availableCount() < 10 ? '🔴 Almost Full' : screen.availableCount() < 25 ? '🟡 Fast Filling' : '🟢 Available';
          this.shows.push(new Show(movie, theatre, screen, dt.toISOString(), movie.basePrice, statusText));
        });
      });
    });
  }

  saveMovies() { localStorage.setItem('sc_movies_v4', JSON.stringify(this.movies)); }
  saveTheatres() { localStorage.setItem('sc_theatres_v4', JSON.stringify(this.theatres)); }
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

// ── LOCATION SWITCHER LOGIC ──

window.changeCity = function(cityName) {
  app.currentCity = cityName;
  localStorage.setItem('sc_city', cityName);

  const navSelect = document.getElementById('nav-city-select');
  if (navSelect) navSelect.value = cityName;

  const heroCity = document.getElementById('hero-city-name');
  if (heroCity) heroCity.textContent = cityName;

  showToast(`Showing cinemas & timings near ${cityName} 📍`);
  renderMoviesGrid();

  // If in theatre view, update theatre list
  const theatreView = document.getElementById('view-theatre');
  if (theatreView && !theatreView.classList.contains('hidden')) {
    if (app.selectedMovie) startBooking(app.selectedMovie.id);
  }
};

window.detectUserLocation = function() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser. Set city manually.', 'error');
    return;
  }

  showToast('Detecting your location... 🛰️');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const detectedCity = 'Hyderabad'; // Default nearest location
      changeCity(detectedCity);
      showToast(`Detected location near ${detectedCity}! 🎯`);
    },
    (err) => {
      changeCity('Hyderabad');
      showToast('Location permission denied or timed out. Defaulted to Hyderabad 📍');
    },
    { timeout: 5000 }
  );
};

// ── GLOBAL INTERFACE HANDLERS & ROUTING ──

window.navigate = function(viewId) {
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

  const navbar = document.getElementById('main-navbar');
  const footer = document.getElementById('main-footer');
  if (viewId === 'splash' || viewId === 'auth') {
    if (navbar) navbar.classList.add('hidden');
    if (footer) footer.classList.add('hidden');
  } else {
    if (navbar) navbar.classList.remove('hidden');
    if (footer) footer.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.nav === viewId) link.classList.add('active');
    else link.classList.remove('active');
  });

  const navSelect = document.getElementById('nav-city-select');
  if (navSelect) navSelect.value = app.currentCity;
  const heroCity = document.getElementById('hero-city-name');
  if (heroCity) heroCity.textContent = app.currentCity;

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
    let matchGenre = true;
    if (app.activeGenre === 'Trending') {
      matchGenre = m.trendingTag && m.trendingTag.includes('Trending');
    } else if (['Telugu', 'Hindi', 'English', 'Tamil'].includes(app.activeGenre)) {
      matchGenre = m.lang.toLowerCase().includes(app.activeGenre.toLowerCase());
    } else if (app.activeGenre !== 'All') {
      matchGenre = m.genre.toLowerCase() === app.activeGenre.toLowerCase();
    }

    const matchSearch = m.title.toLowerCase().includes(query) ||
                        m.genre.toLowerCase().includes(query) ||
                        m.lang.toLowerCase().includes(query) ||
                        m.description.toLowerCase().includes(query);
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
      <div class="movie-poster" style="position:relative;overflow:hidden;background:#181826;">
        <span class="trending-badge">${m.trendingTag || '🔥 Trending'}</span>
        ${m.imageUrl ? `<img src="${m.imageUrl}" alt="${m.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" onerror="this.style.display='none';"/>` : ''}
        <span style="font-size:72px;">${m.emoji}</span>
      </div>
      <div class="movie-info">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="movie-genre">${m.genre}</span>
            <span style="font-size:11px;color:var(--text-dim);font-weight:600;">🗣 ${m.lang.split(',')[0]}</span>
          </div>
          <h3 class="movie-title">${m.title}</h3>
          <div class="movie-meta">
            <span>⏱ ${m.duration} min</span>
            <span class="movie-rating">⭐ ${m.rating}</span>
          </div>
        </div>
        <button class="btn-book" onclick="event.stopPropagation(); startBooking('${m.id}')">
          Book Tickets · Near ${app.currentCity} (From ₹${m.basePrice})
        </button>
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

  const showsForCity = app.shows.filter(s => s.movie.id === movie.id && s.theatre.city === app.currentCity);

  container.innerHTML = `
    <div class="movie-detail-grid">
      <div class="detail-poster" style="position:relative;overflow:hidden;background:#181826;">
        <span class="trending-badge">${movie.trendingTag}</span>
        ${movie.imageUrl ? `<img src="${movie.imageUrl}" alt="${movie.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" onerror="this.style.display='none';"/>` : ''}
        <span style="font-size:96px;">${movie.emoji}</span>
      </div>
      <div class="detail-info">
        <h1>${movie.title}</h1>
        <div class="detail-tags">
          <span class="tag">🔥 ${movie.trendingTag}</span>
          <span class="tag">🎭 ${movie.genre}</span>
          <span class="tag">⏱ ${movie.duration} min</span>
          <span class="tag">⭐ ${movie.rating}</span>
          <span class="tag">🗣 ${movie.lang}</span>
        </div>
        <p class="detail-desc">${movie.description}</p>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;margin-bottom:16px;">
          <h3>Near ${app.currentCity} Showtimes & Seat Availability</h3>
          <button class="btn-outline" style="padding:6px 14px;font-size:12px;" onclick="startBooking('${movie.id}')">See All Theatres →</button>
        </div>

        <div class="shows-grid">
          ${showsForCity.slice(0, 6).map(s => `
            <div class="show-chip" onclick="selectShowtime('${s.id}')">
              <div class="show-time">${s.formattedTime}</div>
              <div class="show-sub">${s.theatre.name.split('-')[0]}</div>
              <div class="show-status-tag ${s.statusText.includes('Almost') ? 'full' : s.statusText.includes('Fast') ? 'fast' : 'avail'}">${s.statusText}</div>
              <div class="show-sub" style="color:var(--gold);font-weight:600;margin-top:4px;">₹${s.basePrice}</div>
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
  if (titleEl) {
    titleEl.innerHTML = `
      <strong style="color:var(--gold);">${movie.emoji} ${movie.title}</strong>
      <span>(${movie.genre} · ${movie.duration} min · ${movie.lang})</span>
      <div style="font-size:13px;color:var(--text-dim);margin-top:4px;">📍 Showing Cinemas Near <strong>${app.currentCity}</strong></div>
    `;
  }

  const theatreListEl = document.getElementById('theatre-list');
  if (!theatreListEl) return;

  const showsForMovieAndCity = app.shows.filter(s => s.movie.id === movie.id && s.theatre.city === app.currentCity);
  const theatreMap = {};

  showsForMovieAndCity.forEach(s => {
    if (!theatreMap[s.theatre.id]) {
      theatreMap[s.theatre.id] = { theatre: s.theatre, shows: [] };
    }
    theatreMap[s.theatre.id].shows.push(s);
  });

  if (Object.keys(theatreMap).length === 0) {
    theatreListEl.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-dim);">
        <div style="font-size:36px;margin-bottom:8px;">📍</div>
        <p>No theatres currently playing this show in <strong>${app.currentCity}</strong>.</p>
        <button class="btn-outline mt" onclick="changeCity('Hyderabad')">Switch to Hyderabad</button>
      </div>
    `;
    navigate('theatre');
    return;
  }

  theatreListEl.innerHTML = Object.values(theatreMap).map(item => `
    <div class="theatre-card" style="display:flex;gap:20px;align-items:flex-start;">
      ${item.theatre.imageUrl ? `<img src="${item.theatre.imageUrl}" alt="${item.theatre.name}" style="width:110px;height:85px;object-fit:cover;border-radius:12px;border:1px solid var(--glass-border);flex-shrink:0;" onerror="this.style.display='none';" />` : ''}
      <div style="flex:1;">
        <div class="theatre-header">
          <div>
            <div class="theatre-name">${item.theatre.name}</div>
            <div class="theatre-badge-flex">
              <span class="theatre-distance-pill">📍 ${item.theatre.distance} away</span>
              <span class="theatre-loc">${item.theatre.location}</span>
            </div>
          </div>
        <span class="theatre-screen-pill">🎬 ${item.theatre.screensCount} Screens</span>
      </div>
      <div class="shows-grid">
        ${item.shows.map(sh => `
          <div class="show-chip" onclick="selectShowtime('${sh.id}')">
            <div class="show-time">${sh.formattedTime}</div>
            <div class="show-sub">${sh.screen.name}</div>
            <div class="show-status-tag ${sh.statusText.includes('Almost') ? 'full' : sh.statusText.includes('Fast') ? 'fast' : 'avail'}">${sh.statusText}</div>
            <div class="show-sub" style="color:var(--gold);font-weight:700;margin-top:4px;">₹${sh.basePrice}</div>
          </div>
      </div>
    </div>
  </div>
  `).join('');

  navigate('theatre');
};

window.selectShowtime = function(showId) {
  if (!app.currentUser) {
    showToast('Please login or register to view seat availability & book tickets!', 'error');
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

// ── SEAT MATRIX VIEW WITH LIVE AVAILABILITY ──

function renderSeatSelectionView() {
  const show = app.selectedShow;
  const container = document.getElementById('seat-selection-content');
  if (!container || !show) return;

  const screen = show.screen;
  const allSeats = Object.values(screen.seats);
  const availableCount = allSeats.filter(s => s.isAvailable() && !app.selectedSeats.includes(s.label)).length;
  const bookedCount = allSeats.filter(s => s.status === SeatStatus.BOOKED).length;
  const selectedCount = app.selectedSeats.length;
  const totalSeats = allSeats.length;
  const occupancyRate = Math.round((bookedCount / totalSeats) * 100);

  const rows = {};
  allSeats.forEach(s => {
    if (!rows[s.row]) rows[s.row] = [];
    rows[s.row].push(s);
  });

  const sortedRows = Object.keys(rows).sort();

  let mapHTML = `
    <div class="seat-screen-wrap">
      <div class="screen-curved"></div>
      <div class="screen-text">SCREEN THIS WAY · ALL EYES HERE</div>
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
      const seatPrice = show.priceForSeat(s);
      const tooltip = `Seat ${s.label} (${s.type}) - ₹${seatPrice}`;
      mapHTML += `<div class="seat ${typeClass} ${statusClass}" title="${tooltip}" onclick="toggleSeat('${s.label}')">${s.number}</div>`;
    });
    mapHTML += '</div>';
  });

  mapHTML += '</div>';

  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2>${show.movie.emoji} ${show.movie.title}</h2>
      <p style="color:var(--text-dim);font-size:15px;">
        📍 <strong>${show.theatre.name}</strong> (${show.theatre.location}) · 🎬 ${show.screen.name}<br/>
        ⏰ ${show.formattedDate} at <strong>${show.formattedTime}</strong>
      </p>
    </div>

    <!-- Live Seat Stats Dashboard -->
    <div class="seat-stats-card">
      <div class="stat-item">
        <div class="stat-num" style="color:var(--green);">${availableCount}</div>
        <div class="stat-lbl">🟢 Available</div>
      </div>
      <div class="stat-item">
        <div class="stat-num" style="color:var(--red);">${bookedCount}</div>
        <div class="stat-lbl">🔴 Occupied</div>
      </div>
      <div class="stat-item">
        <div class="stat-num" style="color:var(--gold);">${selectedCount}</div>
        <div class="stat-lbl">🟡 Selected</div>
      </div>
      <div class="stat-item">
        <div class="stat-num">${occupancyRate}%</div>
        <div class="stat-lbl">📊 Occupancy</div>
      </div>
    </div>

    ${mapHTML}

    <div class="seat-legend">
      <div class="legend-item"><div class="legend-dot ld-avail"></div>Regular (₹${show.basePrice})</div>
      <div class="legend-item"><div class="legend-dot ld-premium"></div>Premium Executive (₹${Math.round(show.basePrice * 1.5)})</div>
      <div class="legend-item"><div class="legend-dot ld-recliner"></div>VIP Recliner (₹${Math.round(show.basePrice * 2.0)})</div>
      <div class="legend-item"><div class="legend-dot ld-sel"></div>Selected</div>
      <div class="legend-item"><div class="legend-dot ld-booked"></div>Booked / Unavailable</div>
    </div>

    <div class="seat-summary-box">
      <div>
        <div style="font-size:12px;color:var(--text-dim)">SELECTED SEATS (${app.selectedSeats.length})</div>
        <div style="font-size:18px;font-weight:700" id="selected-seat-labels">${app.selectedSeats.join(', ') || 'None'}</div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--text-dim)">SUBTOTAL AMOUNT</div>
        <div style="font-size:24px;font-weight:800;color:var(--gold)" id="selected-seat-total">₹${app.selectedSeats.reduce((sum, l) => sum + show.priceForSeat(show.screen.getSeat(l)), 0)}</div>
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

  renderSeatSelectionView();
};

window.proceedToPayment = function() {
  if (app.selectedSeats.length === 0) {
    showToast('Please select at least one seat before proceeding!', 'error');
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
        <div class="pay-line"><span>Location / City</span><span>📍 ${app.currentCity}</span></div>
        <div class="pay-line"><span>Theatre</span><span>${show.theatre.name} (${show.theatre.distance})</span></div>
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
          <input type="radio" name="pay-method" value="UPI"/> 📱 UPI / GPay / PhonePe / Paytm
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
        <p>E-TICKET CONFIRMATION · ${app.currentCity.toUpperCase()}</p>
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
            <div class="ticket-field-label">THEATRE & LOCATION</div>
            <div class="ticket-field-value">${show.theatre.name} (${app.currentCity})</div>
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
        <div class="ticket-sub">📍 ${b.show.theatre.name} (${app.currentCity}) · ⏰ ${b.show.formattedFull}</div>
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
          <div style="font-size:12px;color:var(--gold);margin-top:4px;">📍 Preferred Location: ${app.currentCity}</div>
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

  const statsContainer = document.getElementById('admin-stats');
  if (statsContainer) {
    const totalRev = app.bookings.filter(b => b.status === BookingStatus.CONFIRMED).reduce((sum, b) => sum + b.totalAmount, 0);
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="lbl">TOTAL REVENUE</div>
        <div class="num">₹${totalRev}</div>
      </div>
      <div class="stat-card">
        <div class="lbl">TRENDING MOVIES</div>
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
            <tr><th>Emoji</th><th>Title</th><th>Genre</th><th>Languages</th><th>Base Price</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${app.movies.map(m => `
              <tr>
                <td>${m.emoji}</td>
                <td><strong>${m.title}</strong><br/><span style="font-size:11px;color:var(--gold);">${m.trendingTag || ''}</span></td>
                <td>${m.genre}</td>
                <td>${m.lang}</td>
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
            <tr><th>Theatre Name</th><th>City</th><th>Location</th><th>Screens</th></tr>
          </thead>
          <tbody>
            ${app.theatres.map(t => `
              <tr>
                <td><strong>${t.name}</strong></td>
                <td><span class="status-badge confirmed">${t.city}</span></td>
                <td>${t.location} (${t.distance})</td>
                <td>${t.screensCount} Screens</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

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

  const reportsContent = document.getElementById('admin-reports-content');
  if (reportsContent) {
    reportsContent.innerHTML = `
      <h3>System Performance Reports</h3>
      <p style="color:var(--text-dim);margin-top:8px;">Real-time booking occupancy rate is currently at <strong>88% peak volume</strong> for trending movies near <strong>${app.currentCity}</strong>.</p>
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
  if (document.getElementById('m-image')) document.getElementById('m-image').value = m.imageUrl || '';
  document.getElementById('m-desc').value = m.description;
  document.getElementById('movie-modal-title').textContent = 'Edit Movie';
  openModal('modal-movie');
};

window.saveMovie = async function(event) {
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
  const imageUrl = document.getElementById('m-image')?.value.trim() || '';
  const desc = document.getElementById('m-desc').value.trim();

  const newMovie = new Movie(title, duration, genre, rating, emoji, lang, price, desc, '🔥 Trending', release, id || null, imageUrl);

  if (id) {
    const m = app.movies.find(mov => mov.id === id);
    if (m) {
      m.title = title; m.genre = genre; m.lang = lang; m.duration = duration;
      m.releaseDate = release; m.rating = rating; m.basePrice = price; m.emoji = emoji; m.imageUrl = imageUrl; m.description = desc;
    }
  } else {
    app.movies.unshift(newMovie);
    // Send to MySQL backend API
    try {
      await fetch('http://localhost:3000/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, duration, genre, rating, emoji, lang, basePrice: price, description: desc, trendingTag: '🔥 Trending', imageUrl })
      });
    } catch (e) {
      console.log('Saved movie locally');
    }
  }

  app.saveMovies();
  app.buildShows();
  closeModal('modal-movie');
  renderAdminView();
  renderMoviesGrid();
  showToast(`Movie "${title}" saved successfully! 🎬`);
};

window.deleteMovie = function(movieId) {
  app.movies = app.movies.filter(m => m.id !== movieId);
  app.saveMovies();
  app.buildShows();
  renderAdminView();
  renderMoviesGrid();
  showToast('Movie deleted');
};

window.saveTheatre = async function(event) {
  event.preventDefault();
  const name = document.getElementById('t-name').value.trim();
  const loc = document.getElementById('t-location').value.trim();
  const imageUrl = document.getElementById('t-image')?.value.trim() || '';
  const screens = document.getElementById('t-screens').value;

  const newTheatre = new Theatre(name, loc, app.currentCity, '2.0 km', screens, null, imageUrl);
  app.theatres.unshift(newTheatre);

  try {
    await fetch('http://localhost:3000/api/theatres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location: loc, city: app.currentCity, distance: '2.0 km', screensCount: screens })
    });
  } catch (e) {
    console.log('Saved theatre locally');
  }

  app.saveTheatres();
  app.buildShows();
  closeModal('modal-theatre');
  renderAdminView();
  showToast(`Theatre "${name}" added successfully! 🏟️`);
};

// ── INITIALIZATION ──

document.addEventListener('DOMContentLoaded', () => {
  updateUserNavbar();

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.nav;
      if (target) navigate(target);
    });
  });

  setTimeout(() => {
    if (app.currentUser) {
      navigate('home');
    } else {
      navigate('auth');
    }
  }, 1200);
});
