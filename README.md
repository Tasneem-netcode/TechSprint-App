# EcoSphere AI / TechSprint-App 📋

**Short description:** EcoSphere AI is a lightweight environmental intelligence platform that provides pollution forecasting, a pollution predictor UI, incident reporting with persistence, and a small admin UI for reviewing and verifying reports. The project is implemented as a Node.js + Express backend and a static, themed frontend (vanilla JS + CSS).

---

## Table of contents
- ✅ Features
- ⚙️ Quick start
- 🔧 Requirements
- 🔐 Environment variables
- 🚀 Run & development
- 🗂️ Important project files
- 🔬 Testing & verification
- 👩‍💻 Admin account setup
- 🤖 Gemini (AI) integration notes & troubleshooting
- 📝 API Reference (summary)
- 📦 Deployment notes
- 🧾 License & contact

---

## ✅ Features
- Pollution Predictor UI (themed to Tasneem UI)
- Report Incident form with geolocation and persistence to MongoDB (with JSON file fallback)
- Authentication: register/login (bcrypt-hashed passwords)
- Session helper (in-memory) for easy demo sessions
- Admin UI for paginated report review + verification endpoints
- Industry-aware risk calculation (vulnerability multipliers)
- Gemini AI integration for condition interpretation and forecast insights (model auto-detection + REST ListModels fallback)

---

## ⚙️ Quick start

1. Clone repository or ensure workspace contains `tasneem/`.
2. Install dependencies:
   - Server: run from `tasneem`:
     ```
     npm install
     npm install mongodb bcryptjs
     ```
3. Create an `.env` (copy `.env.example`) and set required variables (see below).
4. Start the server:
   ```
   npm start
   ```
5. Open the frontend:
   - Visit http://localhost:3000

---

## 🔧 Requirements
- Node.js (>= 16)
- npm
- MongoDB (Atlas or self-hosted) — optional but recommended for persistence
- (Optional) Google Generative API access for Gemini features

---

## 🔐 Environment variables
Add to `.env`:

- `PORT` (optional, default 3000)
- `MONGODB_URI` — MongoDB connection string (optional; fallback uses `server/data/reports.json`)
- `MONGODB_DBNAME` — database name (e.g., `ecosphere`)
- `OPENAQ_API_KEY` — optional
- `OPENWEATHERMAP_API_KEY` — optional
- `GEMINI_API_KEY` — Google API key for Generative AI (see notes below)

Example:
```
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DBNAME=ecosphere
GEMINI_API_KEY=AIzaSy...
```

---

## 🚀 Run & development
- Start server: `npm start`
- Dev: `npm run dev` (same script, server runs directly with `node server/index.js`)
- Frontend assets are in `public/` (HTML, CSS, JS)
- Server routes in `server/routes/`, services in `server/services/`

---

## 🗂️ Important project files
- `server/index.js` — main Express server
- `server/routes/api.js` — forecast, environmental data, report endpoints (including admin endpoints)
- `server/routes/auth.js` — register/login/logout/verify
- `server/services/gemini.js` — Gemini integration (auto-detect model & fallback)
- `server/lib/mongo.js` — MongoDB helper
- `server/lib/sessions.js` — in-memory sessions
- `public/index.html` — UI pages & nav
- `public/js/pollutionPredictor.js` — predictor UI module
- `public/js/reportIncident.js` — report form module
- `public/js/admin.js` — admin reports module (pagination + verify)
- `public/css/styles.css` — Tasneem theme styles

---

## 🔬 Testing & verification (local)
- Register/login:
  - POST /auth/register { email, password, name, role? }
  - POST /auth/login { email, password } → returns `sessionId` and `user`
  - Client uses header `x-session-id` when calling admin endpoints (stored in `localStorage.sessionId` by client)
- Submit a report:
  - POST /api/report with JSON body:
    ```
    {
      "location": "Location text",
      "pollutantType": "PM2.5",
      "severityLevel": "High",
      "description": "...",
      "reportedBy": "Alice",
      "coords": { "lat": 12.34, "lon": 56.78 }
    }
    ```
- Admin endpoints:
  - GET /api/reports?page=1&limit=10 — requires admin `x-session-id`
  - POST /api/reports/:id/verify — mark verified (admin only)

---

## 👩‍💻 Admin account setup
- Two options:
  - Use the registration endpoint to create an admin user:
    ```
    POST /auth/register
    { "email": "admin@example.com", "password": "pw123", "name": "Admin", "role":"admin" }
    ```
    Note: the frontend registration form does not expose `role`; use curl or Postman or seed DB directly.
  - Seed directly in MongoDB: insert a document in `users` collection with `role: 'admin'` and hashed password (bcrypt).

---

## 🤖 Gemini (AI) integration & troubleshooting
- The app uses `@google/generative-ai` and the `GEMINI_API_KEY` env var.
- Implementation details:
  - The service attempts to use client `listModels()` when available; otherwise it calls the public REST `GET https://generativelanguage.googleapis.com/v1/models?key=KEY`.
  - It prefers modern models like `models/gemini-2.5-flash` or `models/gemini-2.5-pro`.
  - If a model does not support `generateContent` for your key, it logs a clear message and falls back to a default interpretation.
- Common errors & fixes:
  - 404 / model not found → your key may not permit `generateContent` for the requested model or the model name changed. Try ListModels to see available models:
    ```
    curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY"
    ```
  - Permission denied / authentication → ensure the API key has the necessary permissions or use a service account/OAuth bearer token (some generate endpoints require specific auth).
- If Gemini fails, the app uses safe default textual/JSON fallbacks so the app continues to work.

---

## 📝 API Reference (summary)
- GET /api/environmental-data?city=&industry= — returns current AQ + weather + risk analysis (+ aiInsights when available)
- GET /api/forecast?city=&industry= — returns short-term + long-term forecast (+ AI JSON when available)
- POST /api/report — create an incident report (stores to MongoDB when configured)
- GET /api/reports?page=&limit= — list reports (admin-only)
- POST /api/reports/:id/verify — mark a report verified (admin-only)
- POST /api/ai-interpret — helper to call custom AI interpretations

Auth:
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- GET /auth/verify — requires header `x-session-id`

---

## 📦 Deployment notes
- Ensure `MONGODB_URI`, `GEMINI_API_KEY` are set in your production environment.
- Consider moving sessions to a persistent store (Redis or DB) for multi-server deployments.
- Rotate API keys and secure `.env` (do not commit secrets).

---

## 🧾 License & contact
- MIT License
- For questions, contact the project maintainer or add an issue in the repo.

---

If you want, I can:
- Write an `admin:seed` script to create a default admin user, or
- Add a small health/diagnostic endpoint that returns Gemini `ListModels` output for easy debugging.

Tell me which one you prefer and I'll add it next.