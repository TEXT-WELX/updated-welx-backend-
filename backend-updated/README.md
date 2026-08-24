# WEL.X Backend (fixed)

## Setup
1. Copy `.env.example` to `.env` and set values.
2. Install deps:
   ```bash
   npm install
   npm run dev
   ```

## Endpoints
- `POST /api/auth/signup` { name, email, password, role? }
- `POST /api/auth/login` { email, password }
- `POST /api/onboarding` { formData }  (Authorization: Bearer <token>)
- `GET /api/employees` (auth)
- `POST /api/employees` (auth)
- `PUT /api/employees/:id` (auth)
- `DELETE /api/employees/:id` (auth)
- `GET /api/courses`
