# Appointment AI

AI-powered appointment booking assistant built for the Senior Full Stack Developer assessment.

## 🔗 Links

- **Live Demo:** https://appointment-ai.awaiss.tech
- **GitHub:** https://github.com/emperorsEditx/appointment-ai
- **Database Schema:** https://dbdiagram.io/d/appointment-ai-6a7e2b96c6a866c9076495f6
- **Demo Video:** [Loom link]

## Quick Overview

Appointment AI is a full-stack SaaS-style appointment booking prototype that allows users to create and manage appointments through both natural-language AI conversations and traditional UI flows.

### Core Stack

- Next.js 16
- React 19
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Mistral AI
- JWT Authentication
- Tailwind CSS

## Overview

This project demonstrates an end-to-end SaaS-style workflow:

- User signup/login with JWT-based auth
- Protected dashboard routes
- AI chat session history and message management
- Appointment scheduling and availability checks
- AI intent extraction from natural-language booking requests
- Prisma-based persistence for users, tenants, sessions, appointments, and AI logs

## Architecture

### Frontend
- Framework: Next.js 16 + React 19 + TypeScript
- App location: `apps/web`
- Features:
  - Login and signup screens
  - Protected dashboard and settings flows
  - AI chat interface with session history
  - Appointment booking UI
  - Responsive layout and mobile-friendly navigation

### Backend
- Framework: NestJS + TypeScript
- App location: `apps/api`
- Features:
  - Auth endpoints
  - Chat endpoints and session handling
  - Appointment creation/retrieval
  - JWT guards and validation middleware
  - Mistral AI orchestration layer

### Database
- ORM: Prisma
- Database: PostgreSQL
- Schema location: `prisma/schema.prisma`
- Primary domains:
  - `Tenant`
  - `User`
  - `Appointment`
  - `ChatSession`
  - `ChatMessage`
  - `AiInteractionLog`

### AI Integration
- Provider: Mistral
- Purpose:
  - Understand free-form booking requests
  - Extract date, time, and service information
  - Return structured output to the appointment system
  - Log AI interactions for debugging and auditability

---

## Tech Stack

- Next.js
- React
- Tailwind CSS / shadcn-style UI primitives
- NestJS
- Prisma
- PostgreSQL
- Mistral AI
- JWT auth

---

## Project Structure

```text
appointment-ai/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   ├── test/
│   │   ├── utils/
│   │   └── package.json
│   └── web/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── public/
│       └── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── package.json
├── pnpm-workspace.yaml
├── prisma.config.ts
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- Mistral API key

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment variables

Create a `.env` file at the project root and add the required values. Example:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/appointment_ai"
NEXT_PUBLIC_API_URL="http://localhost:3001"
MISTRAL_API_KEY="your_mistral_key"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

The API reads the backend environment values and the web app reads `NEXT_PUBLIC_API_URL` for frontend requests.

### 3) Apply Prisma schema

```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev --name init
```

If you want to seed demo data:

```bash
pnpm run db:seed
```

### 4) Start the backend

```bash
cd apps/api
pnpm install
pnpm run start:dev
```

### 5) Start the frontend

```bash
cd apps/web
pnpm install
pnpm run dev
```

Then open:

- Frontend: http://localhost:3000
- API: http://localhost:3001

---

## Core Features

### Authentication
- Signup and login APIs
- JWT token authentication for protected routes
- User-specific session and booking ownership checks

### AI Booking Assistant
- User sends natural-language booking messages
- AI attempts to extract appointment data such as date, time, and service type
- Booking data flows into the app's scheduling logic
- Fallbacks exist for incomplete or ambiguous input through structured UI flows

### Chat Session System
- Users can start new conversations
- Session history is stored and loaded
- Messages and sessions are tied to a tenant and user

### Appointments
- Booking creation and retrieval
- Validation for timing and overlap logic
- Support for scheduling flows driven by chat or manual form input

---

## Design Decisions

### Why Next.js for the frontend
Next.js was chosen because it offers a simple path to a clean app shell, auth-protected routes, and a modern React-based UI with minimal setup overhead.

### Why NestJS for the API
NestJS provides a strong structure for building modular backend services, validation, auth guards, and business logic separation.

### Why Prisma
Prisma keeps the data model clear and maintainable for a relational application. It also helps enforce schema constraints and makes the app easier to evolve as new features are added.

### Why Mistral AI
Mistral is a practical choice for a prototype because it offers a straightforward API for extracting structured intent from free-form user messages without requiring major custom orchestration.

---

## Assumptions and Known Limitations

- This is a prototype and not production-scale infrastructure.
- AI extraction is designed for practical booking intents, not complex enterprise scheduling rules.
- Rate limiting and logging are intentionally lightweight for the assessment scope.
- The application is deployed and available through the public demo environment below.
- Multi-tenant support is included in the schema but is still a simplified SaaS-oriented model rather than a full enterprise isolation design.

---

**Application:** https://appointment-ai.awaiss.tech

The application is deployed as a full-stack environment with the Next.js frontend and NestJS API connected to PostgreSQL and Mistral AI.

### Demo Flow

The recommended demo flow is:

1. Create an account
2. Log in
3. Open the AI appointment assistant
4. Request an appointment using natural language
5. Confirm or modify the appointment
6. View the appointment in the dashboard
7. Test cancellation and appointment management

## Database Notes

The schema includes the core relational entities required by the assessment:

- `users` for authentication and profile data
- `tenants` for multi SaaS functionality
- `appointments` for scheduled bookings
- `chat_sessions` and `chat_messages` for conversation history
- `ai_interaction_logs` for AI observability and debugging

Indexes are included on key lookup paths such as tenant, user, session, appointment time, and created timestamps to keep common queries efficient.

---

## Assessment Fit

This project is structured to satisfy the assessment goals by demonstrating:

- clean frontend/backend separation
- practical API design
- database modeling skills
- JWT security awareness
- AI integration in a product workflow
- usable UI and thoughtful UX decisions

It is intended as a working prototype suitable for review and demonstration rather than a production-ready SaaS platform.

---

## License

This project is for assessment/demo purposes.
