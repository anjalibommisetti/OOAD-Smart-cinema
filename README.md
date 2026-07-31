# Smart Cinema: Object-Oriented Cinema Ticket Booking and Seat Reservation System

## How to run
```
python smart_cinema_system.py
```

## Structure
- `smart_cinema_system.py` — full OOP implementation (Movie, Screen, Seat, Show,
  Customer, Admin, Booking, Cinema, Payment strategy classes) plus an
  interactive console menu to demo the system end-to-end.

## Features
- Register customers
- List available shows
- View live seat maps (O = available, X = booked)
- Book one or more seats per show (all-or-nothing locking, so a partial
  failure never leaves seats stuck)
- Multiple payment methods (Card / UPI) via a simple strategy pattern
- View booking history and cancel bookings (seats are released back to the pool)

## Core OOP concepts demonstrated
- **Encapsulation**: Seat status can only change through its own methods.
- **Abstraction**: `Cinema` is a facade; the menu never touches internals directly.
- **Inheritance & Polymorphism**: `Person` -> `Customer` / `Admin`;
  `PaymentMethod` -> `CardPayment` / `UPIPayment`.
- **Composition**: `Cinema` owns `Screen`s and `Show`s; `Screen` owns `Seat`s;
  `Booking` ties together a `Customer`, `Show`, and list of `Seat`s.
