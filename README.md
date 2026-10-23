# Kolkata Order Tracker (ZOMSWI)

A high-performance full-stack web application for tracking, dispatching, and managing monthly food orders across Kolkata zones.

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

## ⚙️ Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create or edit `.env` in the root directory (see `.env.example`):

```env
# Database Configuration (Neon Cloud PostgreSQL, or leave blank for local SQLite fallback)
DATABASE_URL=

# Admin Authentication Credentials (used to seed the first admin user)
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Secret used to sign admin session cookies — use a long random string
SESSION_SECRET=

# Only needed if you have admin users whose passwords were hashed by older versions
AUTH_SALT=
```

Generate a secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

*(Note: If `DATABASE_URL` is left empty, the application uses a local `data.db` SQLite database. This only works locally — on Vercel, `DATABASE_URL` is required.)*

---

## 🚀 Running the Application

### Development Mode (with Live Reload)
```bash
npm run dev
```

### Production Build & Preview
```bash
npm run build
npm run preview
```

Access in your browser at:
- **Public Tracker:** [http://localhost:3058](http://localhost:3058)
- **Admin Workspace:** [http://localhost:3058/admin](http://localhost:3058/admin)

### Deploying
The app uses `@sveltejs/adapter-vercel`. Set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `SESSION_SECRET` in the Vercel project's environment variables.

---

## 👤 Admin Accounts

`ADMIN_EMAIL` / `ADMIN_PASSWORD` only create the **first** admin, when the `users` table is empty — changing them later has no effect, and an admin removed from the UI does not come back.
After that, manage accounts from **Admin → Account & Admins**:

- change your own password (all other logged-in sessions for that account are signed out)
- add or remove other admins (a removed admin is signed out on their next request)

---

## 🧪 Tests

```bash
npm test
```

Unit tests cover the order-suggestion logic, password/session handling, IST date helpers and phone/address masking. They never touch a database.
