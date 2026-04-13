# Hotel Management System

A comprehensive Front Desk Hotel Management System built for small to mid-size hotels. This is an internal system for hotel staff to manage rooms, guests, check-ins, check-outs, payments, and housekeeping.

## Features

### Core Features
- **Dashboard**: Real-time overview of room status, today's check-ins/check-outs, and active stays
- **Room Management**: Add, edit, and manage rooms with real-time status updates
- **Check-In/Check-Out**: Walk-in booking and seamless check-in/check-out process
- **Guest Management**: Maintain guest database with booking history
- **Payments**: Process payments, add extra charges, and generate receipts
- **Housekeeping**: Track room cleaning status and manage housekeeping tasks
- **Reports**: Daily reports, revenue summaries, and occupancy tracking

### User Roles
- **Admin**: Full system access including user management
- ** Receptionist**: Manage bookings, check-ins, check-outs, and payments
- **Housekeeping**: Update room status and manage cleaning tasks

## Technology Stack

### Frontend
- React 18
- React Router v6
- Axios for API calls
- CSS Custom Properties for styling

### Backend
- Node.js with Express
- PostgreSQL Database
- JWT Authentication
- bcryptjs for password hashing

## Project Structure

```
hotel-management/
├── backend/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── bookings.js         # Booking routes
│   │   ├── guests.js            # Guest routes
│   │   ├── housekeeping.js      # Housekeeping routes
│   │   ├── payments.js          # Payment routes
│   │   ├── reports.js           # Report routes
│   │   └── rooms.js             # Room routes
│   ├── scripts/
│   │   └── init-db.js           # Database initialization
│   ├── utils/
│   │   └── helpers.js           # Utility functions
│   ├── server.js                # Express server
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js         # API client
│   │   ├── context/
│   │   │   └── AuthContext.js   # Authentication context
│   │   ├── App.css              # Global styles
│   │   ├── App.js               # Main app component
│   │   └── index.js             # Entry point
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v14 or higher)

### 1. Database Setup

Create a PostgreSQL database named `hotel_management`:

```sql
CREATE DATABASE hotel_management;
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Configure the database connection in `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
PORT=5000
```

Initialize the database schema:

```bash
npm run init-db
```

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm start
```

The frontend will run on `http://localhost:3000`

### 4. Production Build

To create a production build:

```bash
cd frontend
npm run build
```

The built files will be in `frontend/build`. The backend server is configured to serve these files.

## Default Login Credentials

- **Username:** admin
- **Password:** admin123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create room (admin)
- `PUT /api/rooms/:id` - Update room
- `PATCH /api/rooms/:id/status` - Update room status

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/active` - Get active stays
- `GET /api/bookings/today` - Get today's check-ins/check-outs
- `POST /api/bookings/check-in` - Check-in guest
- `POST /api/bookings/:id/check-out` - Check-out guest

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/search` - Search guests
- `POST /api/guests` - Create guest

### Payments
- `POST /api/payments` - Process payment
- `POST /api/payments/extra-charge` - Add extra charge
- `GET /api/payments/summary/:bookingId` - Get payment summary

### Housekeeping
- `GET /api/housekeeping` - Get all tasks
- `POST /api/housekeeping/mark-clean/:roomId` - Mark room as clean

### Reports
- `GET /api/reports/dashboard` - Dashboard stats
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/occupancy` - Occupancy report

## Room Status
- **Available**: Room is ready for check-in
- **Occupied**: Room has an active guest
- **Cleaning**: Room needs cleaning after checkout
- **Maintenance**: Room is under maintenance

## Payment Methods
- Cash
- M-Pesa
- Card
- Bank Transfer

## License

MIT License
