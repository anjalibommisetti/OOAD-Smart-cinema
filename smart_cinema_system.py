"""
Smart Cinema: Object-Oriented Cinema Ticket Booking and Seat Reservation System
--------------------------------------------------------------------------------
A demonstration of core OOP principles (encapsulation, abstraction, composition,
inheritance and polymorphism) applied to a real-world booking problem.

Run this file directly to use the interactive console menu:
    python smart_cinema_system.py
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
import uuid


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SeatType(Enum):
    REGULAR = "Regular"
    PREMIUM = "Premium"
    RECLINER = "Recliner"


class SeatStatus(Enum):
    AVAILABLE = "Available"
    BOOKED = "Booked"
    LOCKED = "Locked"          # temporarily held during checkout


class BookingStatus(Enum):
    PENDING = "Pending"
    CONFIRMED = "Confirmed"
    CANCELLED = "Cancelled"


# ---------------------------------------------------------------------------
# Person hierarchy (inheritance)
# ---------------------------------------------------------------------------

class Person(ABC):
    def __init__(self, name: str, email: str):
        self._name = name
        self._email = email

    @property
    def name(self) -> str:
        return self._name

    @property
    def email(self) -> str:
        return self._email

    @abstractmethod
    def role(self) -> str:
        ...

    def __str__(self):
        return f"{self.role()}: {self._name} ({self._email})"


class Customer(Person):
    def __init__(self, name: str, email: str):
        super().__init__(name, email)
        self._customer_id = str(uuid.uuid4())[:8]
        self._booking_history: list["Booking"] = []

    @property
    def customer_id(self) -> str:
        return self._customer_id

    def add_booking(self, booking: "Booking"):
        self._booking_history.append(booking)

    def booking_history(self) -> list["Booking"]:
        return list(self._booking_history)

    def role(self) -> str:
        return "Customer"


class Admin(Person):
    def role(self) -> str:
        return "Admin"


# ---------------------------------------------------------------------------
# Seat
# ---------------------------------------------------------------------------

class Seat:
    def __init__(self, row: str, number: int, seat_type: SeatType = SeatType.REGULAR):
        self._row = row
        self._number = number
        self._seat_type = seat_type
        self._status = SeatStatus.AVAILABLE

    @property
    def label(self) -> str:
        return f"{self._row}{self._number}"

    @property
    def seat_type(self) -> SeatType:
        return self._seat_type

    @property
    def status(self) -> SeatStatus:
        return self._status

    def is_available(self) -> bool:
        return self._status == SeatStatus.AVAILABLE

    def lock(self):
        if not self.is_available():
            raise ValueError(f"Seat {self.label} cannot be locked (status={self._status.value})")
        self._status = SeatStatus.LOCKED

    def book(self):
        if self._status not in (SeatStatus.AVAILABLE, SeatStatus.LOCKED):
            raise ValueError(f"Seat {self.label} is not available for booking")
        self._status = SeatStatus.BOOKED

    def release(self):
        self._status = SeatStatus.AVAILABLE

    def price_multiplier(self) -> float:
        return {
            SeatType.REGULAR: 1.0,
            SeatType.PREMIUM: 1.5,
            SeatType.RECLINER: 2.0,
        }[self._seat_type]

    def __str__(self):
        return f"{self.label}[{self._seat_type.value}/{self._status.value}]"


# ---------------------------------------------------------------------------
# Movie & Show
# ---------------------------------------------------------------------------

class Movie:
    def __init__(self, title: str, duration_minutes: int, genre: str, rating: str = "U/A"):
        self.title = title
        self.duration_minutes = duration_minutes
        self.genre = genre
        self.rating = rating

    def __str__(self):
        return f"{self.title} ({self.genre}, {self.duration_minutes} min, {self.rating})"


class Screen:
    """A physical screen/auditorium with a grid of seats."""

    def __init__(self, screen_id: str, rows: int, seats_per_row: int,
                 premium_rows: tuple[int, ...] = (), recliner_rows: tuple[int, ...] = ()):
        self.screen_id = screen_id
        self.seats: dict[str, Seat] = {}
        row_letters = [chr(ord('A') + i) for i in range(rows)]
        for r_idx, row in enumerate(row_letters, start=1):
            if r_idx in recliner_rows:
                seat_type = SeatType.RECLINER
            elif r_idx in premium_rows:
                seat_type = SeatType.PREMIUM
            else:
                seat_type = SeatType.REGULAR
            for num in range(1, seats_per_row + 1):
                seat = Seat(row, num, seat_type)
                self.seats[seat.label] = seat

    def available_seats(self) -> list[Seat]:
        return [s for s in self.seats.values() if s.is_available()]

    def get_seat(self, label: str) -> Seat:
        if label not in self.seats:
            raise KeyError(f"No such seat: {label}")
        return self.seats[label]


class Show:
    """A specific screening of a Movie on a Screen at a given time."""

    def __init__(self, movie: Movie, screen: Screen, start_time: datetime, base_price: float):
        self.show_id = str(uuid.uuid4())[:8]
        self.movie = movie
        self.screen = screen
        self.start_time = start_time
        self.base_price = base_price

    def price_for_seat(self, seat: Seat) -> float:
        return round(self.base_price * seat.price_multiplier(), 2)

    def __str__(self):
        return (f"[{self.show_id}] {self.movie.title} @ {self.screen.screen_id} "
                f"on {self.start_time.strftime('%Y-%m-%d %H:%M')}")


# ---------------------------------------------------------------------------
# Payment (simple strategy pattern for extensibility)
# ---------------------------------------------------------------------------

class PaymentMethod(ABC):
    @abstractmethod
    def pay(self, amount: float) -> bool:
        ...


class CardPayment(PaymentMethod):
    def pay(self, amount: float) -> bool:
        print(f"  [Card] Charging ₹{amount:.2f}... approved.")
        return True


class UPIPayment(PaymentMethod):
    def pay(self, amount: float) -> bool:
        print(f"  [UPI] Requesting ₹{amount:.2f}... approved.")
        return True


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class Booking:
    def __init__(self, customer: Customer, show: Show, seats: list[Seat]):
        self.booking_id = str(uuid.uuid4())[:8]
        self.customer = customer
        self.show = show
        self.seats = seats
        self.status = BookingStatus.PENDING
        self.total_amount = sum(show.price_for_seat(s) for s in seats)
        self.created_at = datetime.now()

    def confirm(self, payment_method: PaymentMethod) -> bool:
        if payment_method.pay(self.total_amount):
            for seat in self.seats:
                seat.book()
            self.status = BookingStatus.CONFIRMED
            self.customer.add_booking(self)
            return True
        return False

    def cancel(self):
        if self.status == BookingStatus.CONFIRMED:
            for seat in self.seats:
                seat.release()
            self.status = BookingStatus.CANCELLED

    def receipt(self) -> str:
        seat_labels = ", ".join(s.label for s in self.seats)
        return (
            f"--- Booking Receipt ---\n"
            f"Booking ID : {self.booking_id}\n"
            f"Customer   : {self.customer.name}\n"
            f"Show       : {self.show}\n"
            f"Seats      : {seat_labels}\n"
            f"Amount     : ₹{self.total_amount:.2f}\n"
            f"Status     : {self.status.value}\n"
        )


# ---------------------------------------------------------------------------
# Cinema (facade / orchestrator)
# ---------------------------------------------------------------------------

class Cinema:
    def __init__(self, name: str):
        self.name = name
        self.screens: dict[str, Screen] = {}
        self.shows: dict[str, Show] = {}
        self.customers: dict[str, Customer] = {}
        self.bookings: dict[str, Booking] = {}

    def add_screen(self, screen: Screen):
        self.screens[screen.screen_id] = screen

    def add_show(self, show: Show):
        self.shows[show.show_id] = show

    def register_customer(self, name: str, email: str) -> Customer:
        customer = Customer(name, email)
        self.customers[customer.customer_id] = customer
        return customer

    def list_shows(self) -> list[Show]:
        return list(self.shows.values())

    def book_seats(self, customer: Customer, show_id: str, seat_labels: list[str],
                   payment_method: PaymentMethod) -> Booking:
        show = self.shows[show_id]
        seats = [show.screen.get_seat(lbl) for lbl in seat_labels]

        # Lock all requested seats first (all-or-nothing)
        locked = []
        try:
            for seat in seats:
                seat.lock()
                locked.append(seat)
        except ValueError as e:
            for seat in locked:
                seat.release()
            raise e

        booking = Booking(customer, show, seats)
        if booking.confirm(payment_method):
            self.bookings[booking.booking_id] = booking
            return booking
        else:
            for seat in seats:
                seat.release()
            raise RuntimeError("Payment failed; seats released.")


# ---------------------------------------------------------------------------
# Demo / interactive console menu
# ---------------------------------------------------------------------------

def seed_demo_data() -> Cinema:
    cinema = Cinema("SDG Smart Cinema")

    screen1 = Screen("Screen-1", rows=5, seats_per_row=8, premium_rows=(3, 4), recliner_rows=(5,))
    cinema.add_screen(screen1)

    movie1 = Movie("Inception 2", 148, "Sci-Fi", "UA")
    show1 = Show(movie1, screen1, datetime(2026, 8, 1, 18, 30), base_price=200.0)
    cinema.add_show(show1)

    movie2 = Movie("The Last Village", 120, "Drama", "U")
    show2 = Show(movie2, screen1, datetime(2026, 8, 1, 21, 0), base_price=150.0)
    cinema.add_show(show2)

    return cinema


def print_seat_map(screen: Screen):
    rows: dict[str, list[Seat]] = {}
    for seat in screen.seats.values():
        rows.setdefault(seat._row, []).append(seat)
    for row in sorted(rows):
        seats = sorted(rows[row], key=lambda s: s._number)
        print(" ".join(f"{s.label}:{'O' if s.is_available() else 'X'}" for s in seats))


def main():
    cinema = seed_demo_data()
    customer = None

    while True:
        print("\n===== Smart Cinema Menu =====")
        print("1. Register as customer")
        print("2. List shows")
        print("3. View seat map for a show")
        print("4. Book seats")
        print("5. View my bookings")
        print("6. Cancel a booking")
        print("0. Exit")
        choice = input("Select an option: ").strip()

        if choice == "1":
            name = input("Name: ").strip()
            email = input("Email: ").strip()
            customer = cinema.register_customer(name, email)
            print(f"Registered! Your customer ID is {customer.customer_id}")

        elif choice == "2":
            for show in cinema.list_shows():
                print(show)

        elif choice == "3":
            show_id = input("Show ID: ").strip()
            show = cinema.shows.get(show_id)
            if not show:
                print("Show not found.")
                continue
            print_seat_map(show.screen)

        elif choice == "4":
            if not customer:
                print("Please register first (option 1).")
                continue
            show_id = input("Show ID: ").strip()
            show = cinema.shows.get(show_id)
            if not show:
                print("Show not found.")
                continue
            print_seat_map(show.screen)
            seat_labels = input("Enter seat labels to book, comma-separated (e.g. A1,A2): ").strip()
            seats = [s.strip().upper() for s in seat_labels.split(",") if s.strip()]
            method = input("Payment method (card/upi): ").strip().lower()
            payment = CardPayment() if method == "card" else UPIPayment()
            try:
                booking = cinema.book_seats(customer, show_id, seats, payment)
                print(booking.receipt())
            except (KeyError, ValueError, RuntimeError) as e:
                print(f"Booking failed: {e}")

        elif choice == "5":
            if not customer:
                print("Please register first (option 1).")
                continue
            history = customer.booking_history()
            if not history:
                print("No bookings yet.")
            for b in history:
                print(b.receipt())

        elif choice == "6":
            if not customer:
                print("Please register first (option 1).")
                continue
            booking_id = input("Booking ID to cancel: ").strip()
            booking = cinema.bookings.get(booking_id)
            if booking and booking.customer is customer:
                booking.cancel()
                print("Booking cancelled and seats released.")
            else:
                print("Booking not found for this customer.")

        elif choice == "0":
            print("Thank you for using Smart Cinema. Goodbye!")
            break

        else:
            print("Invalid option, try again.")


if __name__ == "__main__":
    main()
