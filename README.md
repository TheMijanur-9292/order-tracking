# Kolkata Swiggy & Zomato Food Order Tracker (Awign Zone Manager)

An intuitive, full-stack web application designed for single-user management and tracking of monthly food orders across Kolkata zones (Jadavpur, Salt Lake, Garia, Park Street, Behala, Howrah, Dum Dum, etc.) from Awign restaurant lists.

---

## 🚀 Key Features

1. **Awign Excel/CSV Import**:
   - Drag & drop your Awign Excel spreadsheet (`.xlsx`, `.xls`, `.csv`).
   - Automatically parses restaurant names, distance ranges, platforms (Swiggy / Zomato / Both), and receiver addresses.

2. **Zone-Wise Navigation**:
   - Filter restaurants by Kolkata zones.
   - Live badge counters showing `Ordered / Total` for each zone.

3. **Monthly Tracking & Reset**:
   - Filter orders by Month (e.g., July 2026, August 2026).
   - One-click toggle between **Pending** ⏳ and **Ordered** ✅.
   - Shows timestamp of order completion.

4. **Dual Database Architecture (Neon Cloud PostgreSQL + Local SQLite Fallback)**:
   - **Neon Cloud DB**: Set `DATABASE_URL` in `.env` for production database hosted on Neon.
   - **Local Auto-Fallback**: If `DATABASE_URL` is empty, it seamlessly uses local file database (`data.db`) without any setup required!

5. **Admin Management (CRUD)**:
   - Add new restaurants manually.
   - Edit existing restaurant info, platform links, distance, address.
   - Delete restaurants or create/delete Kolkata zones.

---

## ⚙️ How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Neon DB (Optional)
Open `.env` and set your Neon Cloud PostgreSQL URL:
```env
DATABASE_URL=postgresql://user:password@ep-example-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
PORT=3000
```
*(If left blank, it will automatically run using local `data.db` database).*

### 3. Start Application
```bash
npm start
```
Or for auto-reloading dev mode:
```bash
npm run dev
```

Open your browser at: **`http://localhost:3000`**

---

## 📁 Sample Awign Excel Import
You can generate a test Awign Excel spreadsheet anytime by running:
```bash
node generate_sample_excel.js
```
Then upload `Awign_Sample_Kolkata_Jadavpur_List.xlsx` using the **Import Excel** button on the web dashboard.
