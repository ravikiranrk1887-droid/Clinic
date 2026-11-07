# ClinicQueue Lite

**Clinic Appointment and Queue Management System**

ClinicQueue Lite is a full-stack web application designed for small healthcare clinics to manage scheduled appointments, walk-in patients, daily queue assignments, real-time consultation calling, and waiting-time estimation.

---

## 1. Features

- **Staff Portal & Dashboard:**
  - Real-time statistics: Total appointments, waiting count, active consultations, completed visits.
  - Active queue preview and next-in-line patient card.
  - Quick action shortcuts to register walk-ins or schedule new appointments.
  - Recent activity feed updated live via WebSockets.

- **Appointment Management:**
  - Schedule appointments with patient name, phone number, date, time slot, and clinical notes.
  - Search, filter by date, and filter by status (`scheduled`, `checked-in`, `completed`, `cancelled`, `no-show`).
  - One-click check-in converting scheduled appointments directly into queue tickets with generated access codes.

- **Queue Management (Core):**
  - Unique daily queue numbering (`#1, #2, #3, ...`) reset per clinic day.
  - Walk-in patient registration with immediate queue assignment and secure 6-character access codes.
  - Real-time workflow actions: **Call Next**, **In Consultation**, **Complete Consultation**, **Skip Patient**, **Return Skipped to Queue**, and **Cancel Entry**.
  - Configurable queue policies: *Appointments First*, *FIFO (First In, First Out)*, *Walk-ins First*, or *Mixed / Balanced*.
  - Multi-room consultation support.

- **Real-Time Patient Status Portal (Public):**
  - Mobile-first, public-facing status page (`/patient-status`).
  - Zero private healthcare or contact data exposed.
  - Patients enter their Queue Number and 6-character Access Code to view their current status, position, patients ahead, and estimated waiting time.
  - Prominent disclaimer clarifying that waiting times are operational estimates and do not provide medical advice or emergency triage.

- **Historical Queue Records:**
  - Paginated audit log of all completed, skipped, and cancelled queue entries.
  - Filter by date, queue number, and resolution status.
  - Preserves registration, consultation start, and completion timestamps.

- **Clinic Settings & Configuration:**
  - Configurable clinic name, operating hours, average service duration (minutes), consultation rooms count, and maximum waiting time display cap.
  - Protected with role-based access control (Admin only).

---

## 2. Technology Stack

- **Frontend:**
  - React 18, Vite
  - React Router DOM v6
  - Axios for REST API communication
  - Socket.IO Client for real-time queue synchronization
  - Lucide React for modern healthcare icons
  - React Hot Toast for non-intrusive notifications
  - CSS Custom Properties with a clean healthcare design system (Navy `#1e293b`, Primary Blue `#0ea5e9`, Teal `#14b8a6`)

- **Backend:**
  - Node.js & Express.js REST API
  - MongoDB with Mongoose ODM
  - Socket.IO for server-sent real-time queue updates
  - JWT (JSON Web Tokens) for staff session authentication
  - BcryptJS for password and access-code cryptographic hashing
  - Express-Validator & Express-Rate-Limit for API safety
  - Jest & Supertest for automated unit and integration tests

---

## 3. Waiting-Time Estimation Algorithm

The system implements a dynamic waiting-time estimation algorithm:

$$\text{Estimated Waiting Time} = \text{Remaining Consultation Time} + \sum (\text{Average Duration of Patients Ahead})$$

Where:
- $\text{Remaining Consultation Time} = \max(0, \text{Average Duration} - \text{Elapsed Consultation Time})$
- For multiple consultation rooms ($N > 1$), upcoming waiting patients are distributed across the earliest available room workload pipelines.
- Recalculation triggers automatically on any queue change (check-in, walk-in, call, complete, skip, return, or settings adjustment).

---

## 4. Project Structure

```
clinicqueue-lite/
├── client/                      # React + Vite Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable UI components (Card, Button, Modal, StatusBadge, etc.)
│   │   ├── context/             # AuthContext (JWT) and SocketContext (Socket.IO)
│   │   ├── layouts/             # AppLayout with responsive Sidebar and Header
│   │   ├── pages/               # Dashboard, Appointments, Queue, PatientStatus, History, Settings, Login
│   │   ├── services/            # Axios API client with interceptors
│   │   ├── utils/               # Formatters, date helpers, status styling
│   │   ├── App.jsx              # Routing & route guards
│   │   ├── index.css            # CSS variables and global healthcare styles
│   │   └── main.jsx             # Entry mount
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Express + Node.js Backend
│   ├── scripts/
│   │   └── seed.js              # Database seeder (Admin, Nurse, Settings, Demo Appointments & Queue)
│   ├── src/
│   │   ├── config/              # MongoDB connection
│   │   ├── controllers/         # Auth, Appointments, Queue, PatientStatus, Dashboard, History, Settings
│   │   ├── middleware/          # JWT authentication, role verification, validation, error handler
│   │   ├── models/              # Staff, Appointment, QueueEntry, ClinicSettings
│   │   ├── routes/              # Express API route definitions
│   │   ├── services/            # QueueService (queue ordering, waiting time engine, transitions)
│   │   ├── app.js               # Express application configuration & Socket.IO initialization
│   │   └── server.js            # HTTP server startup
│   ├── tests/                   # Jest unit and integration tests
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 5. Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (local `mongodb://localhost:27017/clinicqueue` or MongoDB Atlas URI)

---

### Step 1: Backend Setup

1. Open a terminal in the `server` directory:
   ```bash
   cd clinicqueue-lite/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Verify your `PORT`, `MONGODB_URI`, and `JWT_SECRET` in `.env`.*

4. Seed the database with demo accounts, settings, and appointments:
   ```bash
   npm run seed
   ```

5. Start the backend server:
   ```bash
   npm run dev
   # Server runs at http://localhost:5000
   ```

---

### Step 2: Frontend Setup

1. Open a new terminal in the `client` directory:
   ```bash
   cd clinicqueue-lite/client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   # Frontend runs at http://localhost:5173
   ```

---

## 6. Default Credentials & Demo Access

The seed script creates the following accounts:

| Role | Username | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Admin@1234` | Full access (including Clinic Settings) |
| **Staff / Nurse** | `nurse1` | `Nurse@1234` | Queue and Appointments operations |

### Demo Patient Access Codes (for `/patient-status`):
- **Queue #3** (In Consultation): Access Code `GHI789`
- **Queue #4** (Waiting - 1st in line): Access Code `JKL012`
- **Queue #5** (Waiting - 2nd in line): Access Code `MNO345`

---

## 7. Running Tests

To run the automated test suite (Jest unit & Supertest integration):
```bash
cd clinicqueue-lite/server
npm test
```

To build the frontend for production:
```bash
cd clinicqueue-lite/client
npm run build
```

---

## 8. REST API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status | No |
| `POST` | `/api/auth/login` | Staff authentication | No |
| `GET` | `/api/auth/me` | Current authenticated user profile | Yes |
| `GET` | `/api/dashboard` | Daily operational summary metrics | Yes |
| `GET` | `/api/appointments` | List / search appointments | Yes |
| `POST` | `/api/appointments` | Create appointment | Yes |
| `PUT` | `/api/appointments/:id` | Update appointment | Yes |
| `PATCH`| `/api/appointments/:id/status`| Update appointment status | Yes |
| `GET` | `/api/queue` | Get current active queue | Yes |
| `POST` | `/api/queue/walk-in` | Register walk-in patient | Yes |
| `POST` | `/api/queue/check-in` | Check in scheduled appointment | Yes |
| `POST` | `/api/queue/:id/call` | Call patient into consultation | Yes |
| `POST` | `/api/queue/:id/complete`| Complete consultation | Yes |
| `POST` | `/api/queue/:id/skip` | Mark patient as skipped | Yes |
| `POST` | `/api/queue/:id/return` | Return skipped patient to waiting list | Yes |
| `POST` | `/api/queue/:id/cancel` | Cancel queue entry | Yes |
| `GET` | `/api/patient-status/overview`| Public queue overview counts | No |
| `GET` | `/api/patient-status/:queueNumber`| Secure individual patient wait status | No (code required) |
| `GET` | `/api/history` | Paginated queue history | Yes |
| `GET` | `/api/settings` | Retrieve clinic configuration | Yes |
| `PUT` | `/api/settings` | Update configuration & recalculate | Admin only |
