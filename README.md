# RJM Transport — Full Stack Courier Booking Website

## Features
- Customer registration/login with mobile number and password
- Customer profile/address
- Courier pre-booking with pickup, drop, date and time
- Package details and notes
- Booking status: Pending → Accepted/Rejected → Completed
- Separate admin login/dashboard
- Admin can view customer mobile, address, pickup/drop, date/time and service
- Admin approval/rejection
- Dashboard statistics
- SQLite database for easy local development

## Tech stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite (better-sqlite3)
- Authentication: JWT + bcrypt

## Run locally
1. Install Node.js 18+.
2. In this folder run:
   `npm run install:all`
3. Start:
   `npm run dev`
4. Open:
   `http://localhost:5173`

## Demo admin login
- Mobile: `9999999999`
- Password: `admin123`

Change these credentials and `JWT_SECRET` before production.

## Production notes
For a real deployment, use HTTPS, environment variables, stronger validation/rate limiting, a production database such as PostgreSQL, secure cookies or short-lived access tokens, audit logs, backups, and a real SMS/email/WhatsApp notification provider.
