# Kisan Setu — Farmer & Procurement Centre Tracking System

Three independent projects that together form one system:

```
procurement-system/
├── backend/       Express + SQLite API — the single source of truth (the "database")
├── farmer-app/    Farmer website (React, port 5173)
└── centre-app/    Procurement centre website (React, port 5174)
```

## Why one backend but two websites

The farmer site and centre site are genuinely separate applications — separate
codebases, separate `package.json`s, separate dev servers, and in production
you'd deploy them to two different domains (e.g. `farmer.kisansetu.in` and
`centre.kisansetu.in`). Neither app can see the other's source code or run
without the other.

But they must both read and write the *same* appointment records — when a
farmer books a slot, the centre needs to see it. So both websites are just
clients of one backend API and one SQLite database. That's not a limitation,
it's the correct architecture: it's how banking apps, food delivery apps,
etc. all work (a customer app and a driver/restaurant app, one backend).
Giving each site its own separate database would make it impossible for a
centre to ever see a farmer's booking.

**Where the real separation lives:** every centre-only route in
`backend/routes/centreRoutes.js` is protected by `requireRole('centre')` and
filtered `WHERE centre_id = <the logged-in centre>`. Every farmer-only route
is protected by `requireRole('farmer')` and filtered `WHERE farmer_id = <the
logged-in farmer>`. A farmer's login token is cryptographically rejected by
every centre endpoint, and vice versa — this is enforced in the database
queries themselves, not just hidden in the UI.

## Data model (SQLite, see `backend/db.js`)

- **farmers** — id, phone (unique login), name, village, password hash
- **centres** — id, code (login id), name, location, password hash, capacity per slot
- **appointments** — the booking: farmer, centre, crop details, slot, token, status
- **status_history** — an audit trail of every status change on an appointment
- **procurements** — final quantity + rate once a centre marks an appointment procured

## Running it locally

You need Node.js 18+.

```bash
# 1. Backend (run this first)
cd backend
npm install
cp .env.example .env      # optionally edit JWT_SECRET
npm run dev                # http://localhost:4000

# 2. Farmer site (new terminal)
cd farmer-app
npm install
npm run dev                # http://localhost:5173

# 3. Centre site (new terminal)
cd centre-app
npm install
npm run dev                # http://localhost:5174
```

Open `http://localhost:5173` to register/log in as a farmer, and
`http://localhost:5174` to log in as a centre. Demo centre logins (change
these before going live):

| Code | PIN  | Centre |
|------|------|--------|
| RVP  | 1111 | Ravulapalli Mandi Centre |
| KDP  | 2222 | Kondapur Procurement Yard |
| SBD  | 3333 | Shamshabad Grain Depot |

Farmers self-register with name, phone, and password on first use.

## The flows, as built

**Farmer site:** Login/Register → Home (own profile + bookings only) → Add
Crop → Select Centre → Select Slot (live availability per slot) → Booking
Confirmation → Token → Procurement Status (with full status timeline).

**Centre site:** Login → Dashboard (stats) → Today's Appointments / Live
Queue (sorted by token, oldest first) → Update Status (Confirm → Move to
Queue → Reject / No-show, or record final Procured qty & rate) → Analytics
(procured volume by crop, status mix, total value).

## Taking this to production

This is a real, working full-stack app, but a few things are worth doing
before it's public-facing:

1. **Swap SQLite for a hosted database** (Postgres on Railway/Render/Supabase)
   — SQLite is a single file, which is fine for one server but doesn't scale
   across multiple server instances.
2. **Set a strong, secret `JWT_SECRET`** in production and never commit `.env`.
3. **Deploy the three pieces separately**: backend to a Node host, each
   frontend as a static build (`npm run build` in each app) to something like
   Vercel/Netlify, pointed at the backend's public URL via `VITE_API_URL`.
4. **Add HTTPS, rate limiting on login, and phone/OTP verification** for
   farmers if this handles real payments or real farmer data.
5. **Consider a proper migration tool** (e.g. Prisma or Drizzle) once the
   schema needs to evolve without hand-written SQL migrations.
