# Dev-Collab Backend - MongoDB + Mongoose

Production-ready Node.js/Express backend with clean, organized folder structure.

## 📁 Project Structure

```
dev-collab-backend/
├── src/
│   ├── controllers/         # HTTP request handlers (4 files)
│   ├── services/            # Business logic (4 files)
│   ├── repositories/        # Database operations (4 files)
│   ├── routes/              # API routes (4 files)
│   ├── models/              # Mongoose schemas (6 files)
│   ├── middlewares/         # Express middlewares (3 files)
│   ├── config/              # Configuration (2 files)
│   ├── utils/               # Utilities (5 files)
│   ├── app.ts               # Express setup
│   └── server.ts            # Entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```

## 📡 API Endpoints (28 total)

- **Auth**: 7 endpoints
- **Users**: 5 endpoints  
- **Projects**: 10 endpoints
- **Connections**: 6 endpoints

See full API documentation below.

## 🔐 Features

✅ JWT Authentication
✅ User Management
✅ Projects with Collaboration
✅ Connection Requests
✅ Security (bcrypt, Helmet, CORS)
✅ MongoDB with Mongoose
✅ TypeScript
✅ Clean Architecture

---

For complete documentation, see sections below.
