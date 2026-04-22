"# SkillBridge Backend

> **RESTful API for Connecting Learners with Expert Tutors** 🎓

A robust Node.js/Express backend API built with TypeScript and Prisma ORM. Powers the SkillBridge platform, managing users, tutor profiles, bookings, sessions, reviews, and notifications with comprehensive role-based access control.

**[Frontend Repository](https://github.com/SamiunAuntor/skill-bridge-frontend)** | **[Frontend Live Demo](https://skillbridge.vercel.app)** | **[API Base URL](#deployment)**

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Related Repositories](#related-repositories)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### 🔐 Authentication & Authorization
- Email/password authentication with email verification
- JWT-based token system with access and refresh tokens
- Secure cookie-based session management
- Role-based access control (Student, Tutor, Admin)
- Password reset via email verification

### 👥 User Management
- User registration with role selection
- User profile management
- Email verification workflow
- Account status management (ban/unban)
- Multi-role support (Student, Tutor, Admin)

### 👨‍🏫 Tutor Features
- Comprehensive tutor profile creation and management
- Expertise management (categories, subjects, degrees)
- Availability slot scheduling
- Session management and tracking
- Rating and review system
- Earnings and statistics tracking

### 📚 Educational Content
- Category management with descriptions
- Subject organization within categories
- Degree/qualification management
- Educational background tracking

### 📅 Booking & Session Management
- Session booking system with availability slots
- Real-time booking status tracking
- Session completion and tracking
- Booking cancellation with history
- Price and payment tracking

### ⭐ Review & Rating System
- Student reviews for tutors
- Rating system (1-5 stars)
- Review visibility management
- Average rating calculations
- Review history and analytics

### 🔔 Notification System
- In-app notifications
- Email notifications
- Notification channels (in-app, email)
- Notification status tracking
- Cron-based automated reminders

### 📤 File Management
- Cloudinary integration for image uploads
- Profile picture management
- Subject icon management
- Secure file handling

### 👨‍💼 Admin Dashboard
- User management and monitoring
- Booking oversight
- Category/Subject/Degree management
- Platform analytics and statistics
- User activity tracking
- Content moderation

---

## 🛠️ Tech Stack

### Backend Framework
- **Node.js 18+** - JavaScript runtime
- **Express.js 5.x** - Web application framework
- **TypeScript** - Static type checking

### Database
- **PostgreSQL** - Relational database
- **Prisma 7.x** - Database ORM and query builder
- **Prisma Adapter** - PostgreSQL connection adapter

### Authentication
- **Better Auth** - Authentication library
- **Better Auth Prisma Adapter** - Database integration
- **JWT** - Token-based authentication
- **Cookies** - Session management

### File Upload & Storage
- **Cloudinary** - Image hosting and CDN
- **Multer** - File upload middleware
- **Multer Storage Cloudinary** - Cloudinary integration

### Communication
- **Nodemailer** - Email sending
- **Node Cron** - Scheduled jobs and tasks

### Validation & Error Handling
- **Zod** - Schema validation
- **Custom Error Classes** - Structured error handling

### Development Tools
- **TypeScript** - Type safety
- **ts-node-dev** - Development server with auto-reload
- **ESLint** - Code quality (optional)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn installed
- PostgreSQL 12+ database running
- Cloudinary account (for image uploads)
- SMTP server (for email notifications)
- GitHub account (for version control)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SamiunAuntor/Skill-Bridge_Backend.git
   cd Skill-Bridge_Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/skillbridge

   # Better Auth
   BETTER_AUTH_SECRET=your-secret-key-here
   BETTER_AUTH_URL=http://localhost:5000
   
   # URLs
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:5000

   # Server
   PORT=5000
   NODE_ENV=development

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Email (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@skillbridge.com

   # Zoom (Optional)
   ZOOM_CLIENT_ID=your-zoom-client-id
   ZOOM_CLIENT_SECRET=your-zoom-secret
   ```

4. **Setup the database:**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Create database and run migrations
   npx prisma migrate dev --name init

   # (Optional) Seed the database
   npx prisma db seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **API is running at:**
   ```
   http://localhost:5000
   ```

---

## 📁 Project Structure

```
src/
├── app.ts                        # Express app configuration
├── server.ts                     # Server entry point
│
├── config/                       # Configuration files
│   ├── env.ts                    # Environment variables
│   └── prisma.config.ts          # Prisma client configuration
│
├── generated/                    # Generated Prisma types
│   └── prisma/                   # Prisma client and types
│
├── middlewares/                  # Express middlewares
│   ├── auth.middleware.ts        # Authentication & authorization
│   └── error.middleware.ts       # Error handling
│
├── modules/                      # Feature modules (MVC structure)
│   ├── admin/                    # Admin operations
│   │   ├── admin.controller.ts   # Request handlers
│   │   ├── admin.service.ts      # Business logic
│   │   ├── admin.router.ts       # Route definitions
│   │   ├── admin.query.ts        # Database queries
│   │   ├── admin.types.ts        # TypeScript types
│   │   └── admin.validation.ts   # Input validation
│   │
│   ├── auth/                     # Authentication module
│   │   ├── auth.controller.ts    # Auth endpoints
│   │   ├── auth.service.ts       # Auth logic
│   │   ├── auth.core.ts          # Better Auth setup
│   │   ├── auth.jwt.ts           # JWT utilities
│   │   ├── auth.cookies.ts       # Cookie management
│   │   ├── auth.router.ts        # Auth routes
│   │   ├── auth-email.ts         # Email templates
│   │   ├── auth.constants.ts     # Constants
│   │   ├── auth.types.ts         # Types
│   │   └── auth.validation.ts    # Validation schemas
│   │
│   ├── booking/                  # Booking management
│   │   ├── booking.controller.ts # Booking endpoints
│   │   ├── booking.services.ts   # Booking logic
│   │   ├── booking.router.ts     # Booking routes
│   │   ├── booking.query.ts      # Database queries
│   │   ├── booking.types.ts      # Types
│   │   └── booking.validation.ts # Validation
│   │
│   ├── tutor/                    # Tutor features
│   ├── student/                  # Student features
│   ├── review/                   # Review system
│   ├── notification/             # Notifications
│   ├── availability/             # Availability slots
│   ├── upload/                   # File uploads
│   ├── public/                   # Public endpoints
│   └── [other modules]/          # Other features
│
├── services/                     # External services
│   ├── email/                    # Email sending service
│   └── zoom/                     # Zoom integration
│
├── shared/                       # Shared utilities
│   ├── controller/               # Base controllers
│   ├── query-builder/            # Query utilities
│   ├── utils/                    # Helper functions
│   │   ├── text.ts               # Text utilities
│   │   ├── format.ts             # Formatting functions
│   │   └── [others]/
│   └── validation/               # Common validators
│
├── utils/                        # General utilities
│   └── http-error.ts             # HTTP error class
│
├── jobs/                         # Background jobs
│   └── notification.cron.ts      # Notification scheduler
│
├── lib/                          # Libraries and helpers
│   ├── cloudinary.ts             # Cloudinary setup
│   └── [others]/
│
└── prisma/
    ├── schema.prisma             # Database schema
    └── migrations/               # Database migrations
```

---

## 💾 Database Schema

### Core Models

**User** - Platform users
- Authentication credentials
- Role-based access (student, tutor, admin)
- Account status and verification

**TutorProfile** - Tutor information
- Professional details
- Statistics (ratings, earnings, hours)
- Relations to categories, subjects, degrees

**Category** - Subject categories
- STEM, Languages, Arts, etc.
- Subjects and degrees grouped by category

**Subject** - Teaching subjects
- Specific topics (JavaScript, Calculus, etc.)
- Belongs to a category
- Icon and description

**Degree** - Educational qualifications
- Bachelor's, Master's, PhD, etc.
- Belongs to a category
- Tutor education tracking

**AvailabilitySlot** - Tutor time slots
- Available time windows
- Booking status
- Recurring slot support

**Booking** - Session bookings
- Student to tutor matching
- Status tracking (confirmed, completed, cancelled)
- Payment information
- Cancellation history

**Session** - Tutoring sessions
- Video meeting details (Zoom integration)
- Duration and actual timing
- Session status

**Review** - Student reviews
- Rating (1-5 stars)
- Comments and feedback
- Visibility management

**Notification** - System notifications
- In-app and email channels
- User-specific messages
- Delivery tracking

### Relationships
```
User (1) ──→ (1) TutorProfile
User (1) ──→ (many) Booking
User (1) ──→ (many) Review
User (1) ──→ (many) Notification

TutorProfile (1) ──→ (many) AvailabilitySlot
TutorProfile (1) ──→ (many) Booking
TutorProfile (1) ──→ (many) TutorEducation
TutorProfile (1) ──→ (many) TutorCategory
TutorProfile (1) ──→ (many) TutorSubject

Category (1) ──→ (many) Subject
Category (1) ──→ (many) Degree
Subject (1) ──→ (many) TutorSubject
Degree (1) ──→ (many) TutorEducation

Booking (1) ──→ (1) Session
Booking (1) ──→ (1) Review
```

---

## 📡 API Endpoints

### Authentication Endpoints

**Register User**
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "student"
}
```

**Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Get Current User**
```
GET /api/auth/me
Headers: { "Authorization": "Bearer {token}" }
```

**Refresh Token**
```
POST /api/auth/refresh
```

**Logout**
```
POST /api/auth/logout
```

**Change Password**
```
POST /api/auth/change-password
Headers: { "Authorization": "Bearer {token}" }

{
  "oldPassword": "current-password",
  "newPassword": "new-password"
}
```

**Reset Password**
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "reset-token",
  "newPassword": "new-password"
}
```

### Public Endpoints

**Get All Tutors (with filters)**
```
GET /api/public/tutors?category=math&minRating=4&maxPrice=50&page=1&limit=10
```

**Get Tutor Details**
```
GET /api/public/tutors/:id
```

**Get Categories**
```
GET /api/public/categories
```

**Get Subjects**
```
GET /api/public/subjects?categoryId=:categoryId
```

### Student Endpoints

**Get My Bookings**
```
GET /api/bookings/me
Headers: { "Authorization": "Bearer {token}" }
```

**Create Booking**
```
POST /api/bookings
Headers: { "Authorization": "Bearer {token}" }

{
  "tutorId": "tutor-id",
  "slotId": "slot-id"
}
```

**Cancel Booking**
```
PATCH /api/bookings/:bookingId/cancel
Headers: { "Authorization": "Bearer {token}" }

{
  "reason": "Cancellation reason"
}
```

**Get Session Join URL**
```
POST /api/bookings/:bookingId/join
Headers: { "Authorization": "Bearer {token}" }
```

**Leave Review**
```
POST /api/reviews
Headers: { "Authorization": "Bearer {token}" }

{
  "bookingId": "booking-id",
  "rating": 5,
  "comment": "Great tutor!"
}
```

### Tutor Endpoints

**Get/Update Tutor Profile**
```
GET /api/tutor/profile
PUT /api/tutor/profile
Headers: { "Authorization": "Bearer {token}" }

{
  "bio": "Bio text",
  "hourlyRate": 50,
  "experienceYears": 5
}
```

**Manage Availability**
```
GET /api/availability
POST /api/availability
PUT /api/availability/:slotId
DELETE /api/availability/:slotId
Headers: { "Authorization": "Bearer {token}" }
```

**Get Dashboard Summary**
```
GET /api/bookings/me/tutor-dashboard
Headers: { "Authorization": "Bearer {token}" }
```

### Admin Endpoints

**Dashboard**
```
GET /api/admin/dashboard
Headers: { "Authorization": "Bearer {admin-token}" }
```

**User Management**
```
GET /api/admin/users?page=1&limit=10&sortBy=createdAt
PATCH /api/admin/users/:userId
{ "isBanned": true }
```

**Booking Management**
```
GET /api/admin/bookings?page=1&limit=10
```

**Category Management**
```
GET /api/admin/categories
POST /api/admin/categories
{ "name": "STEM", "description": "Science..." }
PATCH /api/admin/categories/:id
DELETE /api/admin/categories/:id
```

**Subject Management**
```
GET /api/admin/subjects
POST /api/admin/subjects
{ "categoryId": "...", "name": "JavaScript" }
PATCH /api/admin/subjects/:id
DELETE /api/admin/subjects/:id
```

**Degree Management**
```
GET /api/admin/degrees
POST /api/admin/degrees
{ "categoryId": "...", "name": "Bachelor's" }
PATCH /api/admin/degrees/:id
DELETE /api/admin/degrees/:id
```

---

## 🔐 Authentication

### How It Works

1. **Registration** - User creates account with email/password
2. **Email Verification** - Verification link sent to email
3. **Login** - User logs in with verified email
4. **Token Generation** - JWT access token and refresh token created
5. **Request Authorization** - Access token sent in Authorization header
6. **Token Refresh** - Automatic refresh when expired
7. **Session Management** - Cookies store session information

### Security Features

- **HTTPS Only** - Secure cookie transmission
- **HTTP-Only Cookies** - Protection against XSS
- **SameSite Policy** - Protection against CSRF
- **Token Expiration** - Access tokens expire in 1 hour
- **Refresh Token Rotation** - Security best practice
- **Password Hashing** - Bcrypt encryption
- **Email Verification** - Prevents fake accounts

### Role-Based Access

```typescript
// Student - Can book tutors, leave reviews, manage profile
// Tutor   - Can set availability, view sessions, manage profile
// Admin   - Can manage users, categories, bookings
```

---

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start development server with auto-reload

# Production
npm run build            # Compile TypeScript to JavaScript
npm start                # Start production server

# Database
npx prisma migrate dev   # Create and run migrations
npx prisma studio       # Open Prisma Studio GUI
npx prisma generate     # Generate Prisma client
npx prisma db seed      # Run database seed

# Testing
npm test                 # Run tests (when configured)
```

---

## 🌐 Deployment

### Deploy to Render

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Connect to Render:**
   - Visit [render.com](https://render.com)
   - Create new Web Service
   - Connect GitHub repository
   - Configure environment variables
   - Set build command: `npm install`
   - Set start command: `npm start`

3. **Setup Database:**
   - Create PostgreSQL database on Render
   - Update `DATABASE_URL` in environment

### Deploy to Railway

1. **Connect GitHub** to Railway
2. **Add PostgreSQL Plugin**
3. **Configure environment variables**
4. **Deploy automatically**

### Environment Variables (Production)
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret key (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - Production backend URL
- `FRONTEND_URL` - Production frontend URL
- `CLOUDINARY_*` - Cloudinary credentials
- `SMTP_*` - Email service credentials
- `NODE_ENV` - Set to "production"
- `PORT` - Port number (usually 5000 or provided by platform)

---

## 🔗 Related Repositories

### Frontend Repository
- **Repository:** [skill-bridge-frontend](https://github.com/SamiunAuntor/skill-bridge-frontend)
- **Live Demo:** [https://skillbridge.vercel.app](https://skillbridge.vercel.app)
- **Tech Stack:** Next.js, TypeScript, Tailwind CSS

**Frontend Setup:** Follow the frontend repository's README for installation and configuration.

---

## 🧪 Testing

### Manual API Testing
Use Postman, Insomnia, or Thunder Client:

1. Create collection with base URL: `http://localhost:5000/api`
2. Test endpoints with sample data
3. Verify error handling
4. Test role-based access

### Sample Test Data
```json
{
  "student_email": "student@example.com",
  "tutor_email": "tutor@example.com",
  "admin_email": "admin@example.com",
  "password": "password123"
}
```

---

## 📊 Email Configuration

### Using Gmail
1. Enable 2-factor authentication
2. Generate App Password
3. Use app password in `SMTP_PASS`

### Using Other SMTP Services
- SendGrid
- Mailgun
- AWS SES
- Brevo (Sendinblue)

Update `SMTP_HOST` and `SMTP_PORT` accordingly.

---

## 🚨 Error Handling

The API implements comprehensive error handling:

- **Validation Errors** - 400 Bad Request with field-level errors
- **Authentication Errors** - 401 Unauthorized
- **Authorization Errors** - 403 Forbidden
- **Not Found** - 404 errors with resource info
- **Server Errors** - 500 with error tracking
- **Custom Errors** - Specific error messages and codes

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { "field": "error details" }
}
```

---

## 🔒 Security Best Practices

- **HTTPS** - All production endpoints use HTTPS
- **CORS** - Properly configured for frontend
- **Input Validation** - All inputs validated with Zod
- **SQL Injection** - Protected by Prisma ORM
- **XSS Protection** - Output encoding
- **CSRF Protection** - Token-based validation
- **Rate Limiting** - Consider implementing for production
- **Logging** - Audit trails for sensitive operations

---

## 📱 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/new-feature`
3. **Commit changes:** `git commit -m 'Add new feature'`
4. **Push to branch:** `git push origin feature/new-feature`
5. **Open a Pull Request**

### Coding Standards
- Follow TypeScript best practices
- Use consistent naming conventions
- Write meaningful commit messages
- Update documentation as needed
- Add error handling for all operations

---

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Samiul Islam Auntor**
- GitHub: [@SamiunAuntor](https://github.com/SamiunAuntor)
- Email: samiul@skillbridge.com

---

## 📞 Support

For issues, questions, or suggestions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error logs and steps to reproduce

---

## 🙏 Acknowledgments

- **Express.js** - Web framework
- **Prisma** - Database ORM
- **Better Auth** - Authentication library
- **PostgreSQL** - Database system
- **TypeScript** - Type safety
- **All Contributors** - Who helped make this project better

---

**Built with ❤️ for learners and tutors worldwide** 🌍" 
