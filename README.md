
# Secure Notes API

A secure REST API for managing private notes with JWT authentication and role-based access control. Built using Node.js, Express.js, MongoDB and Mongoose.

## Features

### Authentication and Security
- User registration and login.
- JWT-based authentication.
- Password hashing using bcrypt.
- Role-based authorization with User and Admin roles.
- Protected API routes.

### User Features
- Create, view, update and delete personal notes.
- View public posts.
- Create public posts after authentication.

### Admin Features
- List, create, update and delete users.
- Change user roles.
- View all users' notes.
- View users grouped by their interests.

### Database Optimization
- Explicit indexes defined using `schema.index()`.
- Pagination for list operations.
- Index-supported sorting and retrieval.
- MongoDB aggregation pipelines for interest grouping and user posts.
- Execution-plan verification using `explain("executionStats")`.

## Technology Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JSON Web Tokens
- bcryptjs

## Project Structure

```text
backend/
├── src/
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Note.js
│   │   └── Post.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── noteRoutes.js
│   │   ├── adminRoutes.js
│   │   └── postRoutes.js
│   ├── scripts/
│   │   └── indexCheck.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── package-lock.json
```

## Requirements

- Node.js
- npm
- MongoDB Atlas account or a MongoDB instance

## Installation

Clone the repository:

```bash
git clone https://github.com/MasumBinHossain/secure-notes-backend.git
cd secure-notes-backend
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the backend root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
```

Replace the example values with your own configuration.

Never commit your actual `.env` file.

## Running Locally

Start the development server:

```bash
npm run dev
```

Start the production server:

```bash
npm start
```

The local API runs at:

```text
http://localhost:5000
```

## API Endpoints

### Authentication

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |

### Notes

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/notes` | Authenticated |
| GET | `/api/notes?page=1&limit=10` | Authenticated |
| GET | `/api/notes/:id` | Owner |
| PUT | `/api/notes/:id` | Owner |
| DELETE | `/api/notes/:id` | Owner |

### Admin

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/admin/users?page=1&limit=10` | Admin |
| POST | `/api/admin/users` | Admin |
| PUT | `/api/admin/users/:id` | Admin |
| DELETE | `/api/admin/users/:id` | Admin |
| GET | `/api/admin/notes?page=1&limit=10` | Admin |
| GET | `/api/admin/users/grouped-by-interests` | Admin |

### Public Posts

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/posts` | Authenticated |
| GET | `/api/posts?page=1&limit=10` | Public |
| GET | `/api/posts/user/:userId?page=1&limit=10` | Public |

## Aggregation Tasks

### Scenario 1: Group Users by Interests

Endpoint:

```text
GET /api/admin/users/grouped-by-interests
```

Uses a single `User.aggregate()` call to unwind interests and group users by normalized interest names.

### Scenario 2: Retrieve a User's Posts

Endpoint:

```text
GET /api/posts/user/:userId?page=1&limit=10
```

Uses a single aggregation pipeline with `$lookup` to retrieve posts belonging to a particular user. Pagination is performed within the lookup pipeline.

## Database Indexes

The application uses explicit schema indexes:

**User**
- `{ email: 1 }` — unique email lookup.
- `{ createdAt: -1 }` — admin user listing.

**Note**
- `{ user: 1, createdAt: -1 }` — user-specific notes.
- `{ createdAt: -1 }` — admin listing of all notes.

**Post**
- `{ user: 1, createdAt: -1 }` — user-specific posts and `$lookup`.
- `{ createdAt: -1 }` — public posts listing.

MongoDB automatically provides the `_id` index for each collection.

## Index Verification

Run the diagnostic script:

```bash
node src/scripts/indexCheck.js
```

The script uses MongoDB `explain("executionStats")` to inspect query plans and index usage.

## Live Deployment

Backend API:

https://secure-notes-backend-sk1i.onrender.com/

Frontend:

https://secure-notes-frontend-bay.vercel.app/
