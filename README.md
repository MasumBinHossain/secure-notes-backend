
# Secure Notes API

A secure REST API for managing private notes and public posts with JWT authentication and role-based access control. Built using Node.js, Express.js, MongoDB and Mongoose.

## Features

### Authentication and Security
- User registration and login.
- JWT-based authentication using Bearer tokens.
- Password hashing using bcryptjs (12 salt rounds).
- Role-based authorization with User and Admin roles.
- Fetch the currently authenticated user's profile.
- Protected API routes.

### User Features
- Create, view, update and delete personal notes.
- Retrieve individual notes with ownership verification.
- View personal profile and interests.
- Browse public posts with pagination.
- View posts published by a particular user.
- Create public posts after authentication.

### Admin Features
- Inherits standard user capabilities.
- List users with pagination.
- Retrieve individual user profiles.
- Create, update and delete users.
- Change user roles (User / Admin).
- Delete a user's notes and posts when deleting that user.
- View all users' notes with pagination.
- View any individual user's note.
- Group users by normalized interests with pagination.

### Database Optimization
- Explicit indexes defined using Mongoose schema.index().
- Pagination for list operations and aggregation results.
- Compound indexes for user-specific notes and posts.
- Multikey index for interest-grouping aggregation.
- MongoDB aggregation pipelines for both required scenarios.
- Index-supported sorting and document retrieval.
- Execution-plan verification using explain("executionStats").

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
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
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
| GET | `/api/auth/me` | Authenticated |

### Notes

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/notes` | Authenticated |
| GET | `/api/notes?page=1&limit=10` | Authenticated (Own Notes) |
| GET | `/api/notes/:id` | Owner / Admin |
| PUT | `/api/notes/:id` | Owner |
| DELETE | `/api/notes/:id` | Owner |

### Admin

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/admin/users?page=1&limit=10` | Admin |
| GET | `/api/admin/users/:id` | Admin |
| POST | `/api/admin/users` | Admin |
| PUT | `/api/admin/users/:id` | Admin |
| DELETE | `/api/admin/users/:id` | Admin |
| GET | `/api/admin/notes?page=1&limit=10` | Admin |
| GET | `/api/admin/users/grouped-by-interests?page=1&limit=10` | Admin |

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
GET /api/admin/users/grouped-by-interests?page=1&limit=10
```
Uses exactly one `User.aggregate()` call.

Pipeline stages:

1. `$match` filters users with non-empty interests using `{ interests: { $gt: "" } }`, allowing MongoDB to use the `{ interests: 1 }` multikey index.
2. `$unwind` converts each user's interests array into individual entries.
3. `$set` normalizes interest values using `$trim` and `$toLower`.
4. `$match` removes empty or whitespace-only normalized interests.
5. `$group` groups users by normalized interest names and uses `$addToSet` to prevent duplicate users.
6. `$set` calculates the number of unique users in each group.
7. `$sort` orders groups alphabetically.
8. `$facet` handles pagination and calculates the total number of interest groups.

### Scenario 2: Retrieve a User's Posts

Endpoint:

```text
GET /api/posts/user/:userId?page=1&limit=10
```
Uses a single `User.aggregate()` pipeline with `$lookup`.

Pipeline operations:

1. `$match` finds the requested user using MongoDB's built-in `_id` index.
2. `$lookup` retrieves the user's posts using `localField: "_id"` and `foreignField: "user"`.
3. The lookup pipeline sorts posts by `createdAt` in descending order.
4. `$facet` applies pagination and calculates the total post count within the lookup pipeline.

The lookup is supported by the compound index `{ user: 1, createdAt: -1 }`.

## Database Indexes

All custom indexes are explicitly defined in the Mongoose models using `schema.index()`.

### User (src/models/User.js)

- `{ email: 1 }` (Unique) — Supports login lookup and duplicate email validation.
- `{ createdAt: -1 }` — Supports paginated admin user listing sorted newest-first.
- `{ interests: 1 }` (Multikey) — Supports the Scenario 1 interest-grouping aggregation pipeline.

### Note (src/models/Note.js)

- `{ user: 1, createdAt: -1 }` — Supports paginated retrieval of a user's notes and user-based cascading deletion.
- `{ createdAt: -1 }` — Supports paginated admin listing of all notes.

### Post (src/models/Post.js)

- `{ user: 1, createdAt: -1 }` — Supports the Scenario 2 `$lookup`, newest-first sorting, and user-based cascading deletion.
- `{ createdAt: -1 }` — Supports paginated public posts listing.

### Default `_id` Index

MongoDB automatically creates a unique `_id` index for each collection. It supports individual document retrieval, updates, and deletion, including:

- `GET /api/auth/me`
- `GET /api/admin/users/:id`
- `GET /api/notes/:id`
- Note and user update/delete operations.
- The initial user lookup in Scenario 2.

No additional `_id` indexes are required.

## Index Verification

Run the diagnostic script:

```bash
node src/scripts/indexCheck.js
```

The script ensures declared schema indexes exist and uses MongoDB `explain("executionStats")` to verify index usage across list queries and aggregation pipelines.

## Live Deployment

Backend API:

https://secure-notes-backend-sk1i.onrender.com/

Frontend:

https://secure-notes-frontend-bay.vercel.app/
