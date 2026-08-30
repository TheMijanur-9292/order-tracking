# Kolkata Swiggy & Zomato Order Tracker (ZOMSWI)

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
Create or edit `.env` in the root directory:

```env
# Port Configuration
PORT=3045

# Database Configuration (Neon Cloud PostgreSQL or Leave blank for local SQLite fallback)
DATABASE_URL=

# Admin Authentication Credentials
ADMIN_EMAIL=superadmin@gmail.com
ADMIN_PASSWORD=YourSecurePassword
AUTH_SALT=zomswi_salt_2026
```

*(Note: If `DATABASE_URL` is left empty, the application automatically uses a local `data.db` SQLite database).*

---

## 🚀 Running the Application

### Development Mode (with Live Reload)
```bash
npm run dev
```

### Production Build & Start
```bash
npm run build
npm start
```

Access in your browser at:
- **Public Tracker:** [http://localhost:3045](http://localhost:3045)
- **Admin Workspace:** [http://localhost:3045/admin](http://localhost:3045/admin)
