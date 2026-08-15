# CivicPulse AI — AI-Powered Urban Intelligence Platform

CivicPulse AI is an AI-powered urban response system designed for the **BrainWave 2026** hackathon. It allows citizens to report local civic issues (potholes, garbage, water leaks, etc.) via image captures, descriptions, and maps. The backend analyzes the report using Google Gemini AI, groups duplicates within 100 meters, computes a deterministic priority score, and displays incidents on an authority dashboard map for worker dispatch and resolution tracking.

---

## Workspace Structure

- `backend/`: Node.js Express server.
  - `database.sqlite`: SQLite database file populated dynamically.
  - `db.js`: Schema definitions and queries using built-in `node:sqlite`.
  - `routes/`: Auth, reports, incidents, and demo seeder REST endpoints.
  - `uploads/`: Static image folder for uploaded citizen evidence and resolution proofs.
- `frontend/`: React Vite client.
  - `src/components/`: Map components, landing pages, civilian portals, and admin consoles.
  - `src/index.css`: Custom vanilla dark-theme CSS design system.

---

## Local Installation & Startup

### Prerequisites
- Node.js v22.5.0 or higher (which contains the native `node:sqlite` module).

### 1. Run Backend Server
Navigate to the backend folder:
```bash
cd backend
npm install
```

Start the server:
```bash
npm run dev
```
The server will run on `http://localhost:5000`.

To register your first admin user, run:
```bash
node scripts/create-admin.js --email=admin@civilpulse.gov.in --password=AdminSecurePassword123 --name="Civic Admin"
```

### 2. Run Frontend Client
Open a second terminal and navigate to the frontend folder:
```bash
cd frontend
npm install
npm run dev
```
The client will run on `http://localhost:5173`. Open this URL in your web browser.

---

## Quick Demo Seeding (Judging Instructions)

For instant judging evaluation:
1. Open the login screen (`http://localhost:5173/login`).
2. Scroll to the bottom and click **Seed Delhi Demo Incidents**.
3. The database will automatically reset and seed 10 distinct, realistic civic incidents centered in Delhi.
4. Use the provided demo login credentials shown on-screen to access civilian portals or administrative command dashboards instantly.
