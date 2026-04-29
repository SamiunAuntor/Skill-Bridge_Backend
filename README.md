# 🛠️ SkillBridge Backend

**A modular TypeScript backend for authentication, tutor discovery, availability, bookings, Stripe payments, Zoom sessions, notifications, uploads, and admin operations.**

SkillBridge Backend powers the full business logic behind the SkillBridge tutoring platform. It is built with **Express 5**, **TypeScript**, **Prisma**, **PostgreSQL**, **Better Auth**, **Stripe**, **Zoom**, **Cloudinary**, and **Zod**.

This repository is responsible for:

- account creation and login
- session management
- role-aware authorization
- public landing and discovery data
- tutor profile and availability management
- booking creation and session lifecycle
- Stripe payment orchestration
- Zoom meeting creation for confirmed sessions
- notifications
- file uploads
- admin moderation and academic data management

## 🌐 Live Links

- **Backend API:** https://skill-bridge-backend-vn0x.onrender.com/
- **Frontend App:** https://skill-bridge-frontend-sooty.vercel.app/

## ⚙️ Backend at a Glance

| Area | Highlights |
|---|---|
| Auth | Better Auth, cookie sessions, role-aware access |
| Public Data | landing data, subjects, tutor discovery support |
| Tutors | profiles, subjects, categories, education, stats |
| Availability | tutor-owned slot CRUD and public slot lookup |
| Bookings | session lists, join flow, cancel flow |
| Payments | Stripe payment intents, holds, webhook processing |
| Meetings | Zoom meeting creation and cleanup |
| Notifications | unread counts, feed, scheduled processing |
| Uploads | image and PDF uploads via Cloudinary |
| Admin | users, bookings, categories, subjects, degrees, platform reviews |

## 🧰 Main Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | backend runtime |
| **Express 5** | HTTP routing and middleware |
| **TypeScript** | type-safe server code |
| **Prisma 7** | ORM and schema layer |
| **PostgreSQL** | primary relational database |
| **Better Auth** | authentication/session engine |
| **Stripe** | payment intents and webhook verification |
| **Zoom** | session meeting link creation |
| **Cloudinary** | media storage |
| **Nodemailer / Resend** | outbound email delivery |
| **node-cron** | scheduled background tasks |
| **Zod** | request validation |

## 📚 Table of Contents

- [1. Backend Overview](#1-backend-overview)
- [2. Core Feature Areas](#2-core-feature-areas)
- [3. Detailed Module Breakdown](#3-detailed-module-breakdown)
- [4. Request Lifecycle and Architecture](#4-request-lifecycle-and-architecture)
- [5. Authentication System](#5-authentication-system)
- [6. Stripe Payment Flow](#6-stripe-payment-flow)
- [7. Zoom Integration](#7-zoom-integration)
- [8. Notification System](#8-notification-system)
- [9. Upload System](#9-upload-system)
- [10. Validation and Error Handling](#10-validation-and-error-handling)
- [11. Tech Stack Table](#11-tech-stack-table)
- [12. External Services](#12-external-services)
- [13. Project Structure](#13-project-structure)
- [14. API Endpoint Table](#14-api-endpoint-table)
- [15. Database Schema Overview](#15-database-schema-overview)
- [16. Environment Variables](#16-environment-variables)
- [17. Local Installation Guide](#17-local-installation-guide)
- [18. Scripts](#18-scripts)
- [19. Cron Jobs and Runtime Notes](#19-cron-jobs-and-runtime-notes)
- [20. Current Demo Limitations](#20-current-demo-limitations)
- [21. Deployment Notes](#21-deployment-notes)

## 1. Backend Overview

SkillBridge Backend is the system of record for the platform. It stores and enforces:

- users and roles
- tutor profile content
- subjects, categories, and degrees
- tutor availability
- bookings and sessions
- payments and payment statuses
- in-app notifications
- platform reviews
- uploaded assets

It also coordinates third-party services:

- **Better Auth** for auth/session infrastructure
- **Stripe** for payments
- **Zoom** for meeting creation
- **Cloudinary** for media storage
- **SMTP/Resend** for email delivery

## 2. Core Feature Areas

### Authentication

- register
- login
- session lookup
- logout
- logout-all
- change password
- reset password
- Better Auth core handler

### Public Data

- landing page aggregation
- public subject listing
- subject detail view data

### Tutor Domain

- editable tutor profile
- categories and subjects option lists
- public tutor discovery
- tutor details
- tutor dashboard support data

### Student Domain

- student profile update

### Availability

- tutor-owned availability slot CRUD
- public availability lookup for tutor booking

### Booking

- list user sessions
- tutor dashboard session summary
- join a session
- cancel a session

### Payment

- create Stripe payment intent
- create booking holds
- confirm bookings after payment
- query payment status
- process Stripe webhooks
- maintain expired or invalid payment state

### Reviews

- create tutor review
- edit tutor review
- list tutor review data

### Platform Reviews

- public visible review list
- authenticated review submission
- admin moderation

### Notifications

- fetch notifications
- unread count
- mark one read
- mark all read
- scheduled notification processing

### Uploads

- upload images
- upload PDFs
- delete stored assets

### Admin

- dashboard summary
- user moderation
- booking visibility
- categories CRUD
- subjects CRUD
- degrees CRUD
- platform review moderation

## 3. Detailed Module Breakdown

### `src/modules/auth`

Main files:

- `auth.core.ts`
- `auth.router.ts`
- `auth.controller.ts`
- `auth.service.ts`
- `auth.validation.ts`
- `auth.cookies.ts`
- `auth.jwt.ts`
- `auth-email.ts`
- `auth-email-templates.ts`

Responsibilities:

- Better Auth configuration
- session model configuration
- auth route handling
- signup/login behavior
- verification/reset email hooks
- user creation hooks
- role-aware session constraints

### `src/modules/public`

Responsibilities:

- landing page data aggregation
- public subject list
- public subject detail

### `src/modules/tutor`

Responsibilities:

- tutor list and detail queries
- tutor editable profile read/update
- tutor option lists for categories and subjects
- tutor stats synchronization support

### `src/modules/student`

Responsibilities:

- authenticated student profile update

### `src/modules/availability`

Responsibilities:

- tutor availability CRUD
- public tutor slot lookup
- slot validation and ownership checks

### `src/modules/booking`

Responsibilities:

- user session listing
- tutor dashboard booking summary
- booking join flow
- booking cancellation flow
- secure-checkout-first enforcement on old direct booking entry

### `src/modules/payment`

Main files:

- `payment.router.ts`
- `payment.controller.ts`
- `payment.service.ts`
- `payment.validation.ts`
- `payment-maintenance.service.ts`
- `payment-notification.service.ts`
- `payment.constants.ts`

Responsibilities:

- create payment intents
- create pending booking holds
- verify session timing and pricing
- map Stripe statuses to internal states
- process webhook events
- finalize booking confirmation
- trigger Zoom meeting creation
- maintain stale or invalid payment state

### `src/modules/notification`

Responsibilities:

- notification feed retrieval
- unread count
- mark one read
- mark all read
- scheduled notification processing

### `src/modules/review`

Responsibilities:

- create student review
- update review
- list review data for tutors

### `src/modules/platform-review`

Responsibilities:

- visible public platform reviews
- authenticated review submission
- moderation-ready status handling

### `src/modules/upload`

Responsibilities:

- file upload middleware
- Cloudinary-backed uploads
- asset deletion

### `src/modules/admin`

Responsibilities:

- admin dashboard summary
- user moderation
- booking visibility
- academic data CRUD
- platform review moderation

## 4. Request Lifecycle and Architecture

The backend follows a feature-module architecture with a controller-service-validation pattern.

### Typical request flow

1. **Route** receives the request.
2. **Middleware** applies auth/role constraints when needed.
3. **Controller** validates and normalizes request data.
4. **Service** performs the business logic.
5. **Prisma** reads or writes data.
6. **External service integration** runs if the flow needs Stripe, Zoom, email, or Cloudinary.
7. **Error middleware** handles structured failures.

### App bootstrap

The root app file:

- enables CORS for the frontend origin
- mounts Better Auth core routes separately
- mounts Stripe webhook raw-body handling before `express.json()`
- mounts all business routers under `/api/*`
- uses centralized error handling

## 5. Authentication System

Authentication is powered by **Better Auth** with Prisma as the storage adapter.

### Important auth characteristics

- cookie-based sessions
- session expiry and rotation rules
- role field stored as an additional user field
- verification email hooks
- reset password hooks
- session restriction for banned/deleted users

### Current runtime configuration highlights

- Better Auth session model name is `authSession`
- session expiry is set to 7 days
- update age is set to 24 hours
- trusted origins are built from backend/frontend URLs

### Tutor auto-provisioning

When a user signs up as a tutor, the backend ensures a `TutorProfile` record exists.

### Current demo auth behavior

The current deployment cannot reliably deliver outbound verification email on the free tier. To keep the app self-serve for demos:

- verification and reset email logic are still preserved
- signup currently sets `emailVerified = true` at runtime during user creation
- this is done in auth hook logic, **not as a database default**

This is intentionally a temporary showcase behavior.

## 6. Stripe Payment Flow

Stripe is deeply integrated into the backend booking lifecycle.

### Why payments are central here

The platform does not simply accept money and stop there. A successful payment is tied to:

- slot validity
- booking hold creation
- booking confirmation
- payment record updates
- session creation
- Zoom meeting creation
- notification creation

### End-to-end payment lifecycle

1. Student selects a tutor, subject, and availability slot.
2. Frontend calls `POST /api/payments/create-intent`.
3. Backend validates:
   - current student session
   - tutor and subject relationship
   - slot ownership and availability
   - price calculation rules
4. Backend creates a **pending booking hold** with `BookingStatus.pending_payment`.
5. Backend creates a Stripe Payment Intent.
6. Frontend completes checkout through Stripe Elements.
7. Backend receives Stripe webhook events.
8. Backend maps Stripe result to internal payment/booking state.
9. If payment succeeds:
   - booking becomes confirmed
   - payment becomes paid/finalized
   - session record is created
   - Zoom meeting may be created
   - notifications may be triggered

### Important internal payment concepts

| Concept | Meaning |
|---|---|
| `BookingStatus.pending_payment` | temporary hold before payment is confirmed |
| `holdExpiresAt` | payment window for a held booking |
| `PaymentIntentStatus` | mirrors the Stripe payment intent state |
| `PaymentStatus` | simplified business-level status |
| Stripe webhook route | validates final payment state |

### Payment-related backend files

| File | Purpose |
|---|---|
| `payment.router.ts` | route definitions |
| `payment.controller.ts` | request handlers |
| `payment.service.ts` | main payment business logic |
| `payment-maintenance.service.ts` | cleanup/expiry maintenance |
| `payment-notification.service.ts` | payment-related notifications |

## 7. Zoom Integration

Zoom integration lives in:

- `src/services/zoom/zoom.service.ts`

### What it does

- checks whether Zoom credentials are configured
- requests an account-level Zoom access token
- creates a Zoom meeting for a confirmed tutoring session
- deletes meetings on cleanup paths when possible

### Important design behavior

- if Zoom is not configured, `createZoomMeeting()` returns `null`
- if Zoom is configured but the request fails, the backend surfaces a user-facing service error
- meeting creation uses:
  - topic
  - start time
  - duration
  - timezone `Asia/Dhaka`

### Meeting data persisted in the database

The `Session` model stores:

- meeting provider
- meeting ID
- join URL
- host URL
- password
- actual timing and duration

## 8. Notification System

Notifications support both in-app feed behavior and scheduled processing.

### Notification capabilities

- fetch current user notifications
- fetch unread count
- mark one as read
- mark all as read
- process pending scheduled notifications

### Notification domain types

Current schema includes:

- `NotificationType`
- `NotificationChannel`
- `NotificationStatus`

Examples include:

- booking confirmed
- payment confirmed
- session reminder
- booking cancelled

## 9. Upload System

Uploads are handled through the upload module with Cloudinary-backed storage.

### Supported operations

- upload image assets
- upload PDF assets
- delete assets by identifier

### Upload-related files

| File | Responsibility |
|---|---|
| `upload.middleware.ts` | Multer + request parsing |
| `upload.controller.ts` | HTTP handlers |
| `upload.services.ts` | upload/delete logic |
| `upload.validation.ts` | input validation |

### Practical use cases

- tutor profile images
- subject-related or admin-managed media
- education/supporting file attachments where applicable

## 10. Validation and Error Handling

### Validation approach

The backend uses **Zod** to validate requests where needed. Validation files live per feature module, which keeps business rules close to the domain they belong to.

### Error handling approach

- structured service failures use `HttpError`
- centralized `errorHandler` middleware produces consistent API errors
- external integration failures are wrapped into meaningful user-facing messages when possible

### Why this matters

This keeps controller logic cleaner and prevents invalid request shapes from reaching core business logic.

## 11. Tech Stack Table

| Category | Technology | Role in Project |
|---|---|---|
| Runtime | Node.js | execute backend server |
| API Framework | Express 5 | routes and middleware |
| Language | TypeScript | typed backend implementation |
| ORM | Prisma 7 | data access and schema client |
| Database | PostgreSQL | relational persistence |
| Authentication | Better Auth | auth and sessions |
| Payments | Stripe | payment intents and webhooks |
| Meetings | Zoom | live session link generation |
| File Storage | Cloudinary | media hosting |
| Email | Nodemailer / Resend | outbound email support |
| Jobs | node-cron | scheduled tasks |
| Validation | Zod | request validation |

## 12. External Services

| Service | Purpose in Backend |
|---|---|
| PostgreSQL | primary database |
| Better Auth | auth engine and session infrastructure |
| Stripe | checkout/payment processing |
| Zoom | live meeting generation |
| Cloudinary | uploaded media storage |
| SMTP / Nodemailer | email sending |
| Resend | alternate mail provider |

## 13. Project Structure

```text
Skill-Bridge_Backend/
|- prisma/
|  |- schema.prisma
|- src/
|  |- app.ts
|  |- server.ts
|  |- config/
|  |  |- env.ts
|  |  |- prisma.config.ts
|  |- generated/
|  |- jobs/
|  |  |- notification.cron.ts
|  |  |- payment.cron.ts
|  |- lib/
|  |  |- cloudinary.ts
|  |  |- stripe.ts
|  |- middlewares/
|  |  |- auth.middleware.ts
|  |  |- error.middleware.ts
|  |- modules/
|  |  |- admin/
|  |  |  |- admin.router.ts
|  |  |  |- admin.controller.ts
|  |  |  |- admin.service.ts
|  |  |  |- admin.validation.ts
|  |  |- auth/
|  |  |  |- auth.core.ts
|  |  |  |- auth.router.ts
|  |  |  |- auth.controller.ts
|  |  |  |- auth.service.ts
|  |  |  |- auth.validation.ts
|  |  |- availability/
|  |  |- booking/
|  |  |- notification/
|  |  |- payment/
|  |  |- platform-review/
|  |  |- public/
|  |  |- review/
|  |  |- student/
|  |  |- tutor/
|  |  |- upload/
|  |- services/
|  |  |- email/
|  |  |- zoom/
|  |- shared/
|  |  |- controller/
|  |  |- query-builder/
|  |  |- utils/
|  |  |- validation/
|  |- utils/
|  |  |- http-error.ts
|- .env.example
|- package.json
|- README.md
```

## 14. API Endpoint Table

### Auth Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | create account |
| `POST` | `/api/auth/login` | sign in |
| `GET` | `/api/auth/me` | current session/profile |
| `POST` | `/api/auth/refresh` | refresh auth state |
| `POST` | `/api/auth/logout` | logout current session |
| `POST` | `/api/auth/logout-all` | logout all sessions |
| `POST` | `/api/auth/change-password` | change password |
| `POST` | `/api/auth/reset-password` | reset password |
| `ALL` | `/api/auth/core/*` | Better Auth core handler |

### Public Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/public/landing` | landing page payload |
| `GET` | `/api/public/subjects` | subjects list |
| `GET` | `/api/public/subjects/:slug` | subject detail |

### Tutor Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/tutors/profile` | tutor editable profile |
| `PUT` | `/api/tutors/profile` | update tutor profile |
| `GET` | `/api/tutors/categories` | category options |
| `GET` | `/api/tutors/subjects` | subject options |
| `GET` | `/api/tutors` | public tutor list |
| `GET` | `/api/tutors/:id` | public tutor detail |

### Availability Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/availability/me` | tutor-owned slots |
| `POST` | `/api/availability/me` | create slot |
| `PUT` | `/api/availability/me/:slotId` | update slot |
| `DELETE` | `/api/availability/me/:slotId` | delete slot |
| `GET` | `/api/availability/tutor/:tutorId` | public tutor slots |

### Booking Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/bookings/me/sessions` | student/tutor session listing |
| `GET` | `/api/bookings/me/tutor-dashboard` | tutor dashboard summary |
| `POST` | `/api/bookings/` | old direct booking route, now secure-checkout gated |
| `POST` | `/api/bookings/:bookingId/join` | join session |
| `PATCH` | `/api/bookings/:bookingId/cancel` | cancel booking |

### Payment Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/payments/create-intent` | create payment intent |
| `GET` | `/api/payments/:paymentIntentId/status` | payment status lookup |
| `POST` | `/api/payments/webhooks/stripe` | Stripe webhook |

### Review Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/reviews` | create tutor review |
| `GET` | `/api/reviews/me/tutor` | tutor-facing review list |
| `GET` | `/api/reviews/:id` | review detail |
| `PATCH` | `/api/reviews/:id` | update review |

### Platform Review Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/platform-reviews` | visible public reviews |
| `POST` | `/api/platform-reviews` | submit public review |

### Notification Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/notifications/me` | list notifications |
| `GET` | `/api/notifications/me/unread-count` | unread count |
| `PATCH` | `/api/notifications/me/read-all` | mark all read |
| `PATCH` | `/api/notifications/:id/read` | mark one read |

### Student Routes

| Method | Route | Purpose |
|---|---|---|
| `PATCH` | `/api/students/me/profile` | update student profile |

### Upload Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/uploads/images` | upload image |
| `POST` | `/api/uploads/pdfs` | upload PDF |
| `DELETE` | `/api/uploads/assets` | delete uploaded asset |

### Admin Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/dashboard` | admin summary |
| `GET` | `/api/admin/users` | users list |
| `PATCH` | `/api/admin/users/:id` | user moderation |
| `GET` | `/api/admin/bookings` | bookings list |
| `GET` | `/api/admin/categories` | categories list |
| `POST` | `/api/admin/categories` | create category |
| `PATCH` | `/api/admin/categories/:id` | update category |
| `DELETE` | `/api/admin/categories/:id` | delete category |
| `GET` | `/api/admin/subjects` | subjects list |
| `POST` | `/api/admin/subjects` | create subject |
| `PATCH` | `/api/admin/subjects/:id` | update subject |
| `DELETE` | `/api/admin/subjects/:id` | delete subject |
| `GET` | `/api/admin/degrees` | degrees list |
| `POST` | `/api/admin/degrees` | create degree |
| `PATCH` | `/api/admin/degrees/:id` | update degree |
| `DELETE` | `/api/admin/degrees/:id` | delete degree |
| `GET` | `/api/admin/platform-reviews` | review moderation list |
| `PATCH` | `/api/admin/platform-reviews/:id/status` | update review status |
| `DELETE` | `/api/admin/platform-reviews/:id` | delete platform review |

## 15. Database Schema Overview

The database schema is defined in:

- `prisma/schema.prisma`

### Main enums

| Enum | Purpose |
|---|---|
| `Role` | student, tutor, admin |
| `BookingStatus` | booking lifecycle |
| `PaymentStatus` | simplified payment state |
| `PaymentIntentStatus` | Stripe-aligned state |
| `SessionStatus` | session lifecycle |
| `VisibilityStatus` | public/private content state |
| `NotificationType` | notification event types |
| `NotificationChannel` | in-app/email channel |
| `NotificationStatus` | pending/sent/failed |
| `PlatformReviewStatus` | visible/hidden |

### Main models

| Model | Purpose |
|---|---|
| `User` | root user identity and role |
| `TutorProfile` | tutor-specific data and stats |
| `Category` | academic/subject categories |
| `Subject` | subjects available on platform |
| `Degree` | degree options for tutor education |
| `TutorCategory` | tutor-to-category pivot |
| `TutorSubject` | tutor-to-subject pivot |
| `TutorEducation` | tutor education history |
| `AvailabilitySlot` | bookable time slots |
| `Booking` | booking record and lifecycle |
| `Payment` | Stripe payment tracking |
| `Session` | confirmed tutoring session and meeting data |
| `Review` | student review of tutor |
| `PlatformReview` | public platform testimonial |
| `Notification` | in-app notification |
| `Account` | Better Auth account records |
| `AuthSession` | Better Auth session records |
| `Verification` | Better Auth verification records |

### Relationship summary

- one `User` may own one `TutorProfile`
- a tutor may have many:
  - categories
  - subjects
  - education entries
  - availability slots
  - bookings
  - reviews
- one `Booking` may produce one:
  - `Payment`
  - `Session`
  - `Review`
- notifications may optionally reference a booking

## 16. Environment Variables

This project already includes a backend `.env.example`. Keep that file as the source of truth when bootstrapping locally.

### Current example format

```env
PORT=5000
DATABASE_URL="database.url.pgsql://postgres:password@localhost:5432/skillbridge"
BETTER_AUTH_SECRET=better_auth_secret_key
BETTER_AUTH_URL=http://localhost:5000

BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# mail service
MAIL_SERVICE=smtp
# MAIL_SERVICE=resend

# nodemailer + smtp
SMTP_PASS=smtp_password
SMTP_USER=smtp_user
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=SkillBridge <skillbridge@example.com>

# Resend
RESEND_API_KEY=resend_api_key
RESEND_FROM=onboarding@resend.dev
RESEND_REPLY_TO=example@mail.com


# cloudinaey credentials
CLOUDINARY_CLOUD_NAME=cloudinary_cloud_name
CLOUDINARY_API_KEY=cloudinary_api_key
CLOUDINARY_API_SECRET=cloudinary_api_secret

# zoom credentials
ZOOM_ACCOUNT_ID=zoom_account_id
ZOOM_CLIENT_ID=zoom_client_id
ZOOM_CLIENT_SECRET=zoom_client_secret


# JWT secret key
JWT_SECRET=your_jwt_secret

# Better Auth Secret (for generating auth tokens)
BETTER_AUTH_SECRET=your_better_auth_secret

# Payment Gateway
STRIPE_SECRET_KEY=your_stripe_secret_key
PAYMENT_CURRENCY=usd
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Important env groups

| Group | Examples |
|---|---|
| Core | `PORT`, `BACKEND_URL`, `FRONTEND_URL` |
| Database | `DATABASE_URL` |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `JWT_SECRET` |
| Mail | `MAIL_SERVICE`, `SMTP_*`, `RESEND_*`, `EMAIL_FROM` |
| Media | `CLOUDINARY_*` |
| Meetings | `ZOOM_*` |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_CURRENCY` |
| Runtime toggles | `ENABLE_PAYMENT_CRON`, `ENABLE_NOTIFICATION_CRON` |

## 17. Local Installation Guide

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL

Optional but required for full feature support:

- Stripe account and keys
- Zoom credentials
- Cloudinary credentials
- SMTP or Resend credentials

### Install dependencies

```bash
npm install
```

### Create `.env`

Copy values from `.env.example` into a local `.env` file and fill in your own credentials.

### Generate Prisma client

```bash
npx prisma generate
```

### Push schema to database

```bash
npx prisma db push
```

### Run development server

```bash
npm run dev
```

The API should then be available at:

```text
http://localhost:5000
```

### Production build locally

```bash
npm run build
npm run start
```

## 18. Scripts

| Script | What It Does |
|---|---|
| `npm run dev` | starts dev server with `ts-node-dev` |
| `npm run build` | compiles TypeScript into `dist/` |
| `npm run start` | runs compiled production build |

## 19. Cron Jobs and Runtime Notes

The backend can start scheduled jobs for:

- payment maintenance
- notifications

### Current env controls

| Variable | Purpose |
|---|---|
| `ENABLE_PAYMENT_CRON` | enable payment maintenance worker |
| `ENABLE_NOTIFICATION_CRON` | enable notification scheduler |

### Important runtime note

These jobs are safest on an **always-on backend runtime**. If the host sleeps or heavily throttles background execution, scheduled cleanup/reminder behavior can become inconsistent.

## 20. Current Demo Limitations

The deployed backend is showcase-capable, but there are important demo-specific realities:

- free-tier deployment does not reliably support outbound email delivery
- verification and reset email code still exists
- signup is currently demo-bypassed by runtime `emailVerified = true`
- some behavior depends on cron runtime availability
- payment correctness still depends on Stripe webhooks and backend uptime

This setup is intentionally good for demos and review, but it should be tightened before a fully production-hardened launch.

## 21. Deployment Notes

### Current deployment targets

| Service | Link |
|---|---|
| Backend API | https://skill-bridge-backend-vn0x.onrender.com/ |
| Frontend App | https://skill-bridge-frontend-sooty.vercel.app/ |

### Deployment summary

- backend is currently hosted on **Render**
- frontend is hosted on **Vercel**
- frontend relies on backend origin rewrites for `/api/*`
- Stripe, Zoom, email, and Cloudinary all require correct server env setup to be fully functional

---

If you want to understand how SkillBridge actually works behind the UI - especially payments, bookings, notifications, and live-session preparation - this backend repository is the operational core of the platform.
