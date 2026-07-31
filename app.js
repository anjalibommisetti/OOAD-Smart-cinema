/* =====================================================
   Smart Cinema – OOP JS (mirrors the Python design)
   ===================================================== */

// ── Enums ──────────────────────────────────────────────
const SeatType   = { REGULAR:'Regular', PREMIUM:'Premium', RECLINER:'Recliner' };
const SeatStatus = { AVAILABLE:'Available', BOOKED:'Booked', LOCKED:'Locked' };
const BookingStatus = { PENDING:'Pending', CONFIRMED:'Confirmed', CANCELLED:'Cancelled' };

function uid(n=8){ return Math.random().toString(36).slice(2,2+n).toUpperCase(); }

// ── Seat ───────────────────────────────────────────────
class Seat {
  constructor(row, number, type=SeatType.REGULAR){
    this.row=row; this.number=number; this.type=type;
    this.status=SeatStatus.AVAILABLE;
  }
  get label(){ return `${this.row}${this.number}`; }
  isAvailable(){ return this.status===SeatStatus.AVAILABLE; }
  lock(){
    if(!this.isAvailable()) throw new Error(`Seat ${this.label} is not available`);
    this.status=SeatStatus.LOCKED;
  }
  book(){ this.status=SeatStatus.BOOKED; }
  release(){ this.status=SeatStatus.AVAILABLE; }
  get priceMultiplier(){
    return { [SeatType.REGULAR]:1.0, [SeatType.PREMIUM]:1.5, [SeatType.RECLINER]:2.0 }[this.type];
  }
}

// ── Screen ─────────────────────────────────────────────
class Screen {
  constructor(id, rows, seatsPerRow, premiumRows=[], reclinerRows=[]){
    this.id=id; this.seats={};
    const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for(let r=0;r<rows;r++){
      const rowLetter=letters[r], rowNum=r+1;
      const type = reclinerRows.includes(rowNum) ? SeatType.RECLINER
                 : premiumRows.includes(rowNum)  ? SeatType.PREMIUM
                 : SeatType.REGULAR;
      for(let n=1;n<=seatsPerRow;n++){
        const seat=new Seat(rowLetter,n,type);
        this.seats[seat.label]=seat;
      }
    }
  }
  availableCount(){ return Object.values(this.seats).filter(s=>s.isAvailable()).length; }
  getSeat(label){ return this.seats[label]; }
}

// ── Movie ──────────────────────────────────────────────
class Movie {
  constructor(title, duration, genre, rating, emoji){
    this.title=title; this.duration=duration; this.genre=genre; this.rating=rating; this.emoji=emoji;
  }
}

// ── Show ───────────────────────────────────────────────
class Show {
  constructor(movie, screen, dateTime, basePrice){
    this.id=uid(); this.movie=movie; this.screen=screen;
    this.dateTime=dateTime; this.basePrice=basePrice;
  }
  priceForSeat(seat){ return Math.round(this.basePrice * seat.priceMultiplier); }
  get formattedTime(){
    return this.dateTime.toLocaleString('en-IN',{
      month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }
  get formattedDate(){ return this.dateTime.toLocaleDateString('en-IN',{weekday:'short',month:'short',day:'numeric'}); }
  get formattedHour(){ return this.dateTime.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }
}

// ── Customer ───────────────────────────────────────────
class Customer {
  constructor(name, email){
    this.id=uid(); this.name=name; this.email=email; this.bookings=[];
  }
  get initial(){ return this.name.trim()[0].toUpperCase(); }
}

// ── Booking ────────────────────────────────────────────
class Booking {
  constructor(customer, show, seats){
    this.id=uid(); this.customer=customer; this.show=show;
    this.seats=[...seats]; this.status=BookingStatus.PENDING;
    this.total=seats.reduce((s,seat)=>s+show.priceForSeat(seat),0);
    this.createdAt=new Date();
  }
  confirm(){
    this.seats.forEach(s=>s.book());
    this.status=BookingStatus.CONFIRMED;
    this.customer.bookings.push(this);
  }
  cancel(){
    if(this.status===BookingStatus.CONFIRMED){
      this.seats.forEach(s=>s.release());
      this.status=BookingStatus.CANCELLED;
    }
  }
}

// ── Cinema (Facade) ────────────────────────────────────
class Cinema {
  constructor(name){ this.name=name; this.screens={}; this.shows={}; }
  addScreen(s){ this.screens[s.id]=s; }
  addShow(sh){ this.shows[sh.id]=sh; }
  getShowsByMovie(movieTitle){
    return Object.values(this.shows).filter(sh=>sh.movie.title===movieTitle);
  }
  bookSeats(customer, showId, seatLabels){
    const show=this.shows[showId];
    const seats=seatLabels.map(l=>show.screen.getSeat(l));
    const locked=[];
    try{ seats.forEach(s=>{ s.lock(); locked.push(s); }); }
    catch(e){ locked.forEach(s=>s.release()); throw e; }
    const booking=new Booking(customer,show,seats);
    booking.confirm();
    return booking;
  }
}

// ─────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────
function buildCinema(){
  const cinema=new Cinema('SDG Smart Cinema');

  const sc1=new Screen('Screen-1',5,8,[3,4],[5]);
  const sc2=new Screen('Screen-2',4,10,[3,4],[]);
  cinema.addScreen(sc1); cinema.addScreen(sc2);

  const movies=[
    new Movie('Inception 2',148,'Sci-Fi','UA','🚀'),
    new Movie('The Last Village',120,'Drama','U','🌿'),
    new Movie('Neon Shadows',105,'Thriller','A','🕵️'),
    new Movie('Laugh Out Loud',95,'Comedy','U','😂'),
  ];

  const base=new Date(2026,7,1); // Aug 1 2026
  const times=[[18,30],[21,0],[10,0],[14,0]];

  movies.forEach((mv,i)=>{
    const sc=i%2===0?sc1:sc2;
    times.forEach(([h,m])=>{
      const dt=new Date(base); dt.setDate(base.getDate()+i);
      dt.setHours(h,m,0,0);
      cinema.addShow(new Show(mv,sc,dt,150+i*50));
    });
  });
  return {cinema,movies};
}

const {cinema,movies}=buildCinema();

// ─────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────
let currentCustomer=null;
let selectedSeats=[];     // Seat objects
let pendingShow=null;

// ─────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────
function showToast(msg, type='success'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast ${type} show`;
  setTimeout(()=>t.className='toast',2800);
}
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

// ─────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────
document.querySelectorAll('.nav-link').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const view=a.dataset.view;
    document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
    a.classList.add('active');
    if(view==='home'){
      document.getElementById('view-home').classList.remove('hidden');
      document.getElementById('view-my-bookings').classList.add('hidden');
    } else {
      document.getElementById('view-home').classList.add('hidden');
      document.getElementById('view-my-bookings').classList.remove('hidden');
      renderMyBookings();
    }
  });
});

// ─────────────────────────────────────────────────────
// REGISTER / LOGIN
// ─────────────────────────────────────────────────────
document.getElementById('btn-open-register').addEventListener('click',()=>{
  refreshProfileModal(); openModal('modal-register');
});
document.getElementById('btn-register').addEventListener('click',()=>{
  const name=document.getElementById('input-name').value.trim();
  const email=document.getElementById('input-email').value.trim();
  if(!name||!email){ showToast('Please fill in all fields','error'); return; }
  if(!/\S+@\S+\.\S+/.test(email)){ showToast('Enter a valid email','error'); return; }
  currentCustomer=new Customer(name,email);
  document.getElementById('user-label').textContent=name.split(' ')[0];
  refreshProfileModal();
  showToast(`Welcome, ${name}! 🎬`);
});
document.getElementById('btn-logout').addEventListener('click',()=>{
  currentCustomer=null;
  document.getElementById('user-label').textContent='Register / Login';
  closeModal('modal-register');
  showToast('Logged out');
});

function refreshProfileModal(){
  const formArea=document.getElementById('register-form-area');
  const infoArea=document.getElementById('register-info-area');
  if(currentCustomer){
    formArea.style.display='none'; infoArea.style.display='block';
    document.getElementById('profile-avatar').textContent=currentCustomer.initial;
    document.getElementById('profile-name').textContent=currentCustomer.name;
    document.getElementById('profile-email-display').textContent=currentCustomer.email;
    document.getElementById('profile-id').textContent=`ID: #${currentCustomer.id}`;
  } else {
    formArea.style.display='block'; infoArea.style.display='none';
  }
}

// Close buttons
document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click',()=>closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('click',e=>{ if(e.target===ov) ov.classList.remove('open'); });
});

// ─────────────────────────────────────────────────────
// MOVIES GRID
// ─────────────────────────────────────────────────────
function renderMovies(){
  const grid=document.getElementById('movies-grid');
  grid.innerHTML='';
  movies.forEach((mv,i)=>{
    const shows=cinema.getShowsByMovie(mv.title);
    const minPrice=Math.min(...shows.map(s=>s.basePrice));
    const card=document.createElement('div');
    card.className='movie-card';
    card.style.animationDelay=`${i*0.08}s`;
    card.innerHTML=`
      <div class="movie-poster">${mv.emoji}</div>
      <div class="movie-info">
        <span class="movie-genre">${mv.genre}</span>
        <div class="movie-title">${mv.title}</div>
        <div class="movie-meta">
          <span>⏱ ${mv.duration} min</span>
          <span class="movie-rating">⭐ ${mv.rating}</span>
        </div>
        <button class="btn-book" id="book-btn-${i}">Book Tickets · From ₹${minPrice}</button>
      </div>`;
    card.querySelector('.btn-book').addEventListener('click',()=>openShowtimes(mv));
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────
// SHOWTIMES
// ─────────────────────────────────────────────────────
function openShowtimes(mv){
  const shows=cinema.getShowsByMovie(mv.title);
  const el=document.getElementById('showtimes-content');
  el.innerHTML=`
    <div class="show-movie-header">
      <div class="show-poster">${mv.emoji}</div>
      <div>
        <h2 class="show-title">${mv.title}</h2>
        <div class="show-tags">
          <span class="tag">${mv.genre}</span>
          <span class="tag">⏱ ${mv.duration} min</span>
          <span class="tag">${mv.rating}</span>
        </div>
      </div>
    </div>
    <h3 style="margin-bottom:16px;font-size:16px;color:var(--text-dim)">Select a showtime</h3>
    <div class="shows-grid">
      ${shows.map(sh=>`
        <div class="show-card" id="show-${sh.id}" data-show="${sh.id}">
          <div class="show-time">${sh.formattedHour}</div>
          <div class="show-date">${sh.formattedDate}</div>
          <div class="show-avail">✅ ${sh.screen.availableCount()} seats</div>
          <div class="show-price">From ₹${sh.basePrice}</div>
        </div>`).join('')}
    </div>`;
  el.querySelectorAll('.show-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const show=cinema.shows[card.dataset.show];
      closeModal('modal-showtimes');
      openSeatMap(show);
    });
  });
  openModal('modal-showtimes');
}

// ─────────────────────────────────────────────────────
// SEAT MAP
// ─────────────────────────────────────────────────────
function openSeatMap(show){
  if(!currentCustomer){
    showToast('Please register first!','error');
    openModal('modal-register'); return;
  }
  pendingShow=show; selectedSeats=[];
  renderSeatMap(show);
  openModal('modal-seats');
}

function renderSeatMap(show){
  const screen=show.screen;
  const rows={};
  Object.values(screen.seats).forEach(s=>{
    (rows[s.row]=rows[s.row]||[]).push(s);
  });
  const sortedRows=Object.keys(rows).sort();

  let mapHTML='<div class="seat-map">';
  sortedRows.forEach(rowKey=>{
    const seats=rows[rowKey].sort((a,b)=>a.number-b.number);
    mapHTML+=`<div class="seat-row"><div class="seat-row-label">${rowKey}</div>`;
    seats.forEach(s=>{
      const typeClass=s.type===SeatType.PREMIUM?'premium':s.type===SeatType.RECLINER?'recliner':'';
      const statusClass=s.status===SeatStatus.BOOKED?'booked':'available';
      mapHTML+=`<div class="seat ${typeClass} ${statusClass}" data-seat="${s.label}" title="${s.label} · ${s.type} · ₹${show.priceForSeat(s)}"></div>`;
    });
    mapHTML+='</div>';
  });
  mapHTML+='</div>';

  const el=document.getElementById('seats-content');
  el.innerHTML=`
    <div class="seat-header">
      <h3>${show.movie.emoji} ${show.movie.title}</h3>
      <p>${show.formattedTime} · ${show.screen.id}</p>
    </div>
    <div class="screen-label">SCREEN</div>
    ${mapHTML}
    <div class="seat-legend">
      <div class="legend-item"><div class="legend-dot ld-avail"></div>Available</div>
      <div class="legend-item"><div class="legend-dot ld-sel"></div>Selected</div>
      <div class="legend-item"><div class="legend-dot ld-booked"></div>Booked</div>
      <div class="legend-item"><div class="legend-dot ld-premium"></div>Premium</div>
      <div class="legend-item"><div class="legend-dot ld-recliner"></div>Recliner</div>
    </div>
    <div class="seat-summary">
      <div class="seat-summary-left">
        <span>Selected Seats</span><br>
        <strong id="selected-labels">None</strong>
      </div>
      <div class="seat-summary-right">
        <div class="amount" id="selected-total">₹0</div>
      </div>
    </div>
    <button class="btn-primary full" id="btn-proceed-payment">Proceed to Payment →</button>`;

  // Seat click
  el.querySelectorAll('.seat.available').forEach(sEl=>{
    sEl.addEventListener('click',()=>toggleSeat(sEl, show));
  });
  document.getElementById('btn-proceed-payment').addEventListener('click',()=>{
    if(selectedSeats.length===0){ showToast('Select at least one seat','error'); return; }
    closeModal('modal-seats');
    openPayment();
  });
}

function toggleSeat(el, show){
  const seat=show.screen.seats[el.dataset.seat];
  if(selectedSeats.includes(seat)){
    selectedSeats=selectedSeats.filter(s=>s!==seat);
    el.classList.remove('selected'); el.classList.add('available');
  } else {
    selectedSeats.push(seat);
    el.classList.remove('available'); el.classList.add('selected');
  }
  updateSeatSummary(show);
}

function updateSeatSummary(show){
  const labels=selectedSeats.map(s=>s.label).join(', ')||'None';
  const total=selectedSeats.reduce((t,s)=>t+show.priceForSeat(s),0);
  document.getElementById('selected-labels').textContent=labels;
  document.getElementById('selected-total').textContent=`₹${total}`;
}

// ─────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────
function openPayment(){
  const show=pendingShow;
  const subtotal=selectedSeats.reduce((t,s)=>t+show.priceForSeat(s),0);
  const conv=Math.round(subtotal*0.02);
  const total=subtotal+conv;

  document.getElementById('payment-summary').innerHTML=`
    <div class="pay-line"><span>${show.movie.emoji} ${show.movie.title}</span><span>${show.formattedHour}</span></div>
    <div class="pay-line"><span>Seats</span><span>${selectedSeats.map(s=>s.label).join(', ')}</span></div>
    <div class="pay-line"><span>Subtotal</span><span>₹${subtotal}</span></div>
    <div class="pay-line"><span>Convenience Fee</span><span>₹${conv}</span></div>
    <div class="pay-line"><span>Total</span><span>₹${total}</span></div>`;

  openModal('modal-payment');
}

document.getElementById('btn-confirm-payment').addEventListener('click',()=>{
  if(!pendingShow||selectedSeats.length===0) return;
  try{
    const booking=cinema.bookSeats(
      currentCustomer, pendingShow.id, selectedSeats.map(s=>s.label)
    );
    closeModal('modal-payment');
    showReceipt(booking);
    showToast('Booking confirmed! 🎉');
  } catch(e){
    showToast(e.message,'error');
  }
});

// ─────────────────────────────────────────────────────
// RECEIPT
// ─────────────────────────────────────────────────────
function showReceipt(booking){
  const show=booking.show;
  const conv=Math.round(booking.total*0.02);
  document.getElementById('receipt-content').innerHTML=`
    <div class="receipt-header">
      <div class="receipt-icon">🎟️</div>
      <h2>Booking Confirmed!</h2>
      <p>Your seats are reserved. Enjoy the show!</p>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div class="booking-id-badge">#${booking.id}</div>
    </div>
    <div class="receipt-body">
      <div class="receipt-row"><span class="label">Movie</span><span class="value">${show.movie.emoji} ${show.movie.title}</span></div>
      <div class="receipt-row"><span class="label">Show</span><span class="value">${show.formattedTime}</span></div>
      <div class="receipt-row"><span class="label">Screen</span><span class="value">${show.screen.id}</span></div>
      <div class="receipt-row"><span class="label">Seats</span><span class="value">${booking.seats.map(s=>s.label).join(', ')}</span></div>
      <div class="receipt-row"><span class="label">Customer</span><span class="value">${booking.customer.name}</span></div>
      <div class="receipt-row"><span class="label">Amount Paid</span><span class="value" style="color:var(--gold)">₹${booking.total + conv}</span></div>
    </div>
    <button class="btn-primary full" id="btn-close-receipt">Done ✓</button>`;
  document.getElementById('btn-close-receipt').addEventListener('click',()=>closeModal('modal-receipt'));
  openModal('modal-receipt');
}

// ─────────────────────────────────────────────────────
// MY BOOKINGS
// ─────────────────────────────────────────────────────
function renderMyBookings(){
  const el=document.getElementById('bookings-list');
  if(!currentCustomer){
    el.innerHTML=`<div class="no-bookings"><div class="nb-icon">🔐</div><h3>Login Required</h3><p>Please register to view your bookings.</p></div>`;
    return;
  }
  const bookings=currentCustomer.bookings;
  if(bookings.length===0){
    el.innerHTML=`<div class="no-bookings"><div class="nb-icon">🎟️</div><h3>No bookings yet</h3><p>Book a movie and your tickets will appear here.</p></div>`;
    return;
  }
  el.innerHTML=bookings.slice().reverse().map(b=>{
    const statusClass=b.status===BookingStatus.CONFIRMED?'status-confirmed':'status-cancelled';
    const cancelBtn=b.status===BookingStatus.CONFIRMED
      ?`<button class="btn-danger" data-cancel="${b.id}">Cancel Booking</button>`:'';
    return `
      <div class="booking-ticket">
        <div class="ticket-poster">${b.show.movie.emoji}</div>
        <div class="ticket-body">
          <div class="ticket-movie">${b.show.movie.title}</div>
          <div class="ticket-time">⏰ ${b.show.formattedTime}</div>
          <div class="ticket-meta">🎬 ${b.show.screen.id} · #${b.id}</div>
          <div class="ticket-seats">${b.seats.map(s=>`<span class="seat-badge">${s.label}</span>`).join('')}</div>
          <div class="ticket-footer">
            <span class="ticket-amount">₹${b.total}</span>
            <div style="display:flex;gap:10px;align-items:center">
              <span class="status-badge ${statusClass}">${b.status}</span>
              ${cancelBtn}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('[data-cancel]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const booking=currentCustomer.bookings.find(b=>b.id===btn.dataset.cancel);
      if(booking){ booking.cancel(); renderMyBookings(); showToast('Booking cancelled'); }
    });
  });
}

// ─────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────
renderMovies();
