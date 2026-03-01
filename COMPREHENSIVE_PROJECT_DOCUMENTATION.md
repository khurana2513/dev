# TalentHub Live - Complete Reverse-Engineered Documentation

**Last Updated:** February 18, 2026  
**Project Version:** 3.0.0

---

## 1. Project Overview

### 1.1 Project Purpose

**TalentHub Live** is an interactive educational platform for teaching and practicing math-based courses including:
- **Abacus** (mental math through abacus methodology)
- **Vedic Mathematics** (advanced calculation techniques)
- **Handwriting** (though primarily focused on math)
- **STEM** (science, technology, engineering concepts)

The platform enables students to:
- Practice mental math with timed quizzes
- Generate and attempt custom practice papers
- Track progress and earn rewards/badges
- Participate in leaderboards
- View attendance records
- Manage student profiles and fees

### 1.2 Core System Architecture

```
┌─────────────────────────────────────┐
│      React TypeScript Frontend      │
│  (Vite, Wouter, TanStack Query)     │
└────────────┬────────────────────────┘
             │ REST API (JSON)
┌────────────▼────────────────────────┐
│    FastAPI Python Backend          │
│  (SQLAlchemy ORM, PostgreSQL)      │
└────────────┬────────────────────────┘
             │ SQL
┌────────────▼────────────────────────┐
│  PostgreSQL Database               │
│  (26+ tables, relationships)        │
└─────────────────────────────────────┘
```

    ### 1.3 Tech Stack

    | Layer | Technology | Purpose |
    |-------|-----------|---------|
    | **Frontend** | React 18.3 + TypeScript | UI components, state management |
    | **Routing** | Wouter 3.3 | Client-side routing |
    | **State Management** | TanStack React Query | API caching, sync |
    | **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
    | **Form Handling** | React Hook Form + Zod | Form validation |
    | **Animation** | Framer Motion 11.18 | Page transitions |
    | **Backend Framework** | FastAPI 0.100+ | REST API server |
    | **Database ORM** | SQLAlchemy 2.0+ | Database abstraction |
    | **Database** | PostgreSQL 12+ | Persistent data store |
    | **Authentication** | Google OAuth 2.0 | User login/registration |
    | **Document Generation** | ReportLab 4.0 + Playwright | PDF generation |

### 1.4 High-Level Data Flow

```
User Login (Google OAuth)
    │
    ├─→ verify_google_token() [backend/auth.py]
    ├─→ Create/Update User [users table]
    ├─→ Create StudentProfile [student_profiles table]
    ├─→ Create Leaderboard entry [leaderboard table]
    └─→ Return access_token + user info

User Practice Session (Mental Math)
    │
    ├─→ Frontend: Generate questions (math_generator.py)
    ├─→ User answers questions (Mental.tsx)
    ├─→ POST /users/practice-session
    ├─→ Save PracticeSession + Attempts
    ├─→ Calculate points [gamification.py]
    ├─→ Log points transaction [points_logs table]
    ├─→ Update leaderboards (async background task)
    ├─→ Award badges (reward_system.py)
    └─→ Return session summary

User Paper Attempt (Practice Papers)
    │
    ├─→ POST /papers/attempt (create paper attempt)
    ├─→ GET /papers/attempt/<id> (fetch questions)
    ├─→ POST /papers/attempt/<id>/submit (submit answers)
    ├─→ Calculate score + points
    ├─→ Award badges and update leaderboards
    └─→ Allow re-attempt if available

Student Dashboard
    │
    ├─→ GET /users/stats (overall stats)
    ├─→ GET /users/leaderboard/overall (top 100 globally)
    ├─→ GET /users/leaderboard/weekly (top 50 weekly)
    ├─→ GET /papers/attempts (practice paper history)
    └─→ Render unified dashboard view
```

---

## 2. Feature Inventory

### Feature 1: User Authentication & Profile

| Aspect | Details |
|--------|---------|
| **Name** | Google OAuth User Authentication |
| **Description** | Users login via Google OAuth, creating user accounts with profile information, roles, and gamification stats |
| **Related Pages** | Login (component), Home, Dashboard |
| **Related APIs** | `POST /users/login`, `GET /users/me`, `PUT /users/me/display-name` |
| **Database Tables** | `users` (core), `student_profiles` (extended info), `leaderboard` (ranking) |
| **Dependencies** | `auth.py`, `google-auth` library, `user_schemas.py` |
| **Key Logic** | OAuth token verification, auto-promote/demote admins via ADMIN_EMAILS env var |

### Feature 2: Mental Math Practice

| Aspect | Details |
|--------|---------|
| **Name** | Interactive Mental Math Quiz |
| **Description** | Timed mental math exercises with 11 operation types, difficulty levels, instant feedback |
| **Related Pages** | Mental.tsx |
| **Related APIs** | `POST /users/practice-session` |
| **Database Tables** | `practice_sessions`, `attempts` |
| **Dependencies** | `math_generator.py`, `gamification.py`, `reward_system.py` |
| **Key Metrics** | Accuracy, time taken, questions attempted, points earned |
| **Operation Types** | multiplication, division, add_sub, decimal_multiplication, decimal_division, integer_add_sub, lcm, gcd, square_root, cube_root, percentage |

### Feature 3: Custom Paper Generation & Practice

| Aspect | Details |
|--------|---------|
| **Name** | Customizable Practice Paper Generator |
| **Description** | Create papers with custom question blocks, difficulty levels, multiple operation types. Generate PDFs for offline practice |
| **Related Pages** | PaperCreate.tsx, PaperAttempt.tsx, AbacusCourse.tsx, VedicMathsCourse.tsx, etc. |
| **Related APIs** | `POST /papers`, `GET /papers`, `POST /papers/preview`, `POST /papers/pdf`, `POST /papers/attempt`, `GET /papers/attempt/<id>`, `POST /papers/attempt/<id>/submit` |
| **Database Tables** | `papers`, `paper_attempts` |
| **Dependencies** | `math_generator.py`, `pdf_generator*.py` (3 versions), `gamification.py` |
| **Configuration** | Stored as JSON in `paper_config` column (blocks, timing, operation types) |

### Feature 4: Gamification System (Points & Badges)

| Aspect | Details |
|--------|---------|
| **Name** | Points & Reward System |
| **Description** | Earn points for activities, track streaks, unlock badges based on milestones |
| **Point System** | +1 per attempted question, +5 per correct answer |
| **Badge Categories** | Monthly (accuracy_ace, perfect_precision, comeback_kid), Lifetime (various milestones), Super (S/U/P/E/R), Attendance, Leaderboard |
| **Related Pages** | StudentDashboard.tsx, RewardsExplanation component |
| **Related APIs** | `GET /users/stats`, `GET /users/rewards`, `POST /users/grace-skip` |
| **Database Tables** | `rewards` (badges), `points_logs` (audit trail), `user` (points/streak fields) |
| **Dependencies** | `gamification.py`, `reward_system.py`, `monthly_badge_evaluation.py` |
| **Streak Logic** | Current streak resets on missed day; updated daily on practice |

### Feature 5: Leaderboard System

| Aspect | Details |
|--------|---------|
| **Name** | Global & Weekly Leaderboards |
| **Description** | Real-time ranking of users by total points (overall) or weekly points (this week) |
| **Related Pages** | StudentDashboard.tsx (leaderboard cards) |
| **Related APIs** | `GET /users/leaderboard/overall`, `GET /users/leaderboard/weekly` |
| **Database Tables** | `leaderboard` (ranks updated periodically) |
| **Dependencies** | `leaderboard_service.py` |
| **Update Frequency** | Background task after each practice session |

### Feature 6: Attendance System

| Aspect | Details |
|--------|---------|
| **Name** | Class Attendance Tracking |
| **Description** | Admin tracks student attendance; students view calendar; automated attendance-based rewards |
| **Related Pages** | AdminAttendance.tsx, StudentDashboard.tsx (attendance calendar) |
| **Related APIs** | Attendance routes (see section 4.3) |
| **Database Tables** | `attendance_records`, `class_sessions`, `class_schedules`, `attendance_audit_logs` |
| **Dependencies** | `attendance_routes.py`, `AttendanceCalendar` component |
| **Special Features** | Automated badge awards for attendance streaks, makeup session tracking |

### Feature 7: Fee Management

| Aspect | Details |
|--------|---------|
| **Name** | Student Fee Tracking & Payments |
| **Description** | Admin manages fee plans, assignments, and transactions; tracks student payment status |
| **Related Pages** | AdminFeeManagement.tsx, AdminUnifiedManagement.tsx |
| **Related APIs** | Fee routes (see section 4.3) |
| **Database Tables** | `fee_plans`, `fee_assignments`, `fee_transactions`, `fee_audit_logs` |
| **Dependencies** | `fee_routes.py`, `fee_schemas.py` |
| **Features** | Fee plans per branch/course, payment tracking, audit logs |

### Feature 8: Student ID Management

| Aspect | Details |
|--------|---------|
| **Name** | Public Student ID Assignment |
| **Description** | Admin assigns public IDs (TH-0001 format) to students for identification |
| **Related Pages** | AdminStudentIDManagement.tsx, StudentProfile.tsx |
| **Related APIs** | Student ID update endpoints |
| **Database Tables** | `student_profiles` (public_id field) |
| **Key Detail** | IDs are NOT auto-assigned on signup; admins manually issue them |

### Feature 9: Student Profile Management

| Aspect | Details |
|--------|---------|
| **Name** | Comprehensive Student Information |
| **Description** | Stores detailed student info: name, class, course, level, branch, status, contact |
| **Related Pages** | StudentProfile.tsx, AdminUnifiedManagement.tsx |
| **Related APIs** | Profile update endpoints in user_routes.py |
| **Database Tables** | `student_profiles`, `profile_audit_logs` |
| **Audit Trail** | All changes tracked with changed_by_user_id and reason |

### Feature 10: Admin Unified Management

| Aspect | Details |
|--------|---------|
| **Name** | Bulk Student Management |
| **Description** | Admin view to manage multiple students: edit profiles, assign IDs, track status |
| **Related Pages** | AdminUnifiedManagement.tsx |
| **Related APIs** | Multiple user_routes.py endpoints |
| **Database Tables** | All profile-related tables |
| **Key Features** | Batch operations (future potential), audit logging |

---

## 3. Page-by-Page Breakdown

### 3.1 Student Pages

#### Page: Home (/)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/` |
| **Component File** | [frontend/src/pages/Home.tsx](frontend/src/pages/Home.tsx) |
| **Authentication** | Public (no login required) |
| **Purpose** | Landing page with course showcases, navigation |
| **Components Used** | Header, Footer, CourseCards, CTAs |
| **APIs Called** | None (static content) |
| **State Management** | ThemeContext (dark mode) |
| **Key Elements** | Course descriptions, feature highlights, login prompt |

#### Page: Mental Math Practice (/mental)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/mental` |
| **Component File** | [frontend/src/pages/Mental.tsx](frontend/src/pages/Mental.tsx) |
| **Authentication** | ✅ Protected (login required) |
| **Purpose** | Interactive timed mental math practice |
| **Components Used** | TimeLimitSlider, CustomNumericInput, QuestionTimer, TroubleMeter |
| **APIs Called** | `POST /users/practice-session` |
| **State Management** | useState (questions, answers, timer), useRef (timer intervals) |
| **Related Files** | `math_generator.py` (backend), `userApi.ts` |
| **Key Features** | 11 operation types, difficulty levels, instant feedback, pause/resume, real-time scoring |
| **Data Flow** | Random questions → User answers → Submit → Backend calculates points → Update dashboard |

#### Page: Paper Creation (/create/[level] variants)

| Attribute | Value |
|-----------|-------|
| **Route Paths** | `/create`, `/create/junior`, `/create/basic`, `/create/advanced`, `/create/vedic-[1-4]` |
| **Component File** | [frontend/src/pages/PaperCreate.tsx](frontend/src/pages/PaperCreate.tsx) (4520 lines) |
| **Authentication** | Public (can preview without login) |
| **Purpose** | Design custom math practice papers with multiple question blocks |
| **Components Used** | BlockEditor (drag-drop blocks), PreviewModal, PDFGenerator |
| **APIs Called** | `POST /papers/preview`, `POST /papers/pdf`, `GET /presets/{level}` |
| **State Management** | useState (blocks, config, preview), useMutation (API calls) |
| **Paper Configuration** | JSON structure stored in `paper_config` table |
| **Block Types** | 40+ operation types (addition, multiplication, vedic formulas, etc.) |
| **Key Features** | Drag-to-reorder blocks, live preview, PDF download, preset templates |

#### Page: Paper Attempt (/paper/attempt)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/paper/attempt` |
| **Component File** | [frontend/src/pages/PaperAttempt.tsx](frontend/src/pages/PaperAttempt.tsx) |
| **Authentication** | ✅ Protected |
| **Purpose** | Solve practice paper questions in real-time |
| **APIs Called** | `POST /papers/attempt`, `GET /papers/attempt/<id>`, `POST /papers/attempt/<id>/submit` |
| **State Management** | useState (currentQuestion, userAnswers, startTime) |
| **Related Files** | `MathQuestion` component |
| **Key Features** | Timed paper, question navigation, answer validation, score calculation, re-attempt tracking |

#### Page: Student Dashboard (/dashboard)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/dashboard` |
| **Component File** | [frontend/src/pages/StudentDashboard.tsx](frontend/src/pages/StudentDashboard.tsx) (1453 lines) |
| **Authentication** | ✅ Protected |
| **Purpose** | Central hub for stats, recent activity, leaderboard, attendance, points log |
| **Components Used** | AttendanceCalendar, RewardsExplanation, SessionDetailModal |
| **APIs Called** | `GET /users/stats`, `GET /users/leaderboard/overall`, `GET /users/leaderboard/weekly`, `GET /papers/attempts`, `GET /attendance/records`, `GET /users/points-summary` |
| **State Management** | 20+ useState hooks (stats, leaderboard, sessions, filter) |
| **Related Files** | `userApi.ts`, `attendanceApi.ts` |
| **Key Sections** | Stats summary, session history, leaderboards, attendance calendar, points log, rewards |
| **Unification Feature** | Merges mental math sessions and paper attempts into single timeline |

#### Page: Student Profile (/profile)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/profile` |
| **Component File** | [frontend/src/pages/StudentProfile.tsx](frontend/src/pages/StudentProfile.tsx) |
| **Authentication** | ✅ Protected |
| **Purpose** | View and edit personal information |
| **APIs Called** | `GET /students/profile`, `PUT /students/profile` |
| **State Management** | useState (profile data, editing) |
| **Editable Fields** | display_name, class_name, course, level, branch |
| **Related Tables** | `student_profiles` |

#### Page: Course Landing Pages

| Course | Route | File |
|--------|-------|------|
| Abacus | `/courses/abacus` | [AbacusCourse.tsx](frontend/src/pages/AbacusCourse.tsx) |
| Vedic Maths | `/courses/vedic-maths` | [VedicMathsCourse.tsx](frontend/src/pages/VedicMathsCourse.tsx) |
| Handwriting | `/courses/handwriting` | [HandwritingCourse.tsx](frontend/src/pages/HandwritingCourse.tsx) |
| STEM | `/courses/stem` | [STEMCourse.tsx](frontend/src/pages/STEMCourse.tsx) |

All course pages are public, contain course descriptions, level progression info, and CTAs to practice.

### 3.2 Admin Pages

#### Page: Admin Dashboard (/admin)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/admin` |
| **Component File** | [frontend/src/pages/AdminDashboard.tsx](frontend/src/pages/AdminDashboard.tsx) |
| **Authentication** | ✅ Admin-only (role="admin") |
| **Purpose** | Overview of system stats, top users, activity |
| **APIs Called** | `GET /admin/stats` |
| **Key Metrics** | Total students, total sessions, recent activity, admin tools shortcuts |

#### Page: Attendance Management (/admin/attendance)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/admin/attendance` |
| **Component File** | [frontend/src/pages/AdminAttendance.tsx](frontend/src/pages/AdminAttendance.tsx) |
| **Authentication** | ✅ Admin-only |
| **Purpose** | Mark student attendance for classes |
| **APIs Called** | `POST /attendance/mark`, `GET /attendance/sessions`, `GET /class-schedules/{branch}` |
| **Key Features** | Date picker, search students, quick toggle, bulk operations |
| **Related Tables** | `attendance_records`, `class_sessions`, `class_schedules` |

#### Page: Fee Management (/admin/fees)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/admin/fees` |
| **Component File** | [frontend/src/pages/AdminFeeManagement.tsx](frontend/src/pages/AdminFeeManagement.tsx) |
| **Authentication** | ✅ Admin-only |
| **Purpose** | Create fee plans, assign to students, track transactions |
| **APIs Called** | `GET /fees/plans`, `POST /fees/plans`, `POST /fees/assign`, `GET /fees/transactions` |
| **Related Tables** | `fee_plans`, `fee_assignments`, `fee_transactions` |

#### Page: Unified Student Management (/admin/unified)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/admin/unified` |
| **Component File** | [frontend/src/pages/AdminUnifiedManagement.tsx](frontend/src/pages/AdminUnifiedManagement.tsx) |
| **Authentication** | ✅ Admin-only |
| **Purpose** | Edit multiple student profiles in one place |
| **APIs Called** | `GET /students`, `PUT /students/{id}/profile` |
| **Key Features** | Search, filter by status/branch/course, bulk edit, audit trail |

#### Page: Student ID Management (/admin/student-ids)

| Attribute | Value |
|-----------|-------|
| **Route Path** | `/admin/student-ids` |
| **Component File** | [frontend/src/pages/AdminStudentIDManagement.tsx](frontend/src/pages/AdminStudentIDManagement.tsx) |
| **Authentication** | ✅ Admin-only |
| **Purpose** | Assign public IDs (TH-0001, TH-0002...) to students |
| **APIs Called** | `GET /students/without-id`, `POST /students/{id}/assign-id`, `GET /students/id-allocation` |
| **Key Logic** | Generate sequential IDs, prevent duplicates, audit changes |

---

## 4. Backend Module Mapping

### 4.1 Core Application Files

#### File: main.py (1044 lines)

| Aspect | Details |
|--------|---------|
| **Purpose** | FastAPI application entry point, route registration, middleware |
| **Models Used** | Paper, PaperAttempt, User, PointsLog, FeeAssignment, FeePlan, VacantId |
| **Routes Defined** | Health check, root, paper CRUD, paper preview/PDF, paper attempt management |
| **Dependencies** | All route modules, OAuth, PDF generators, gamification |
| **Key Features** | CORS config, exception handlers, request timing, database cleanup |
| **Route Groups Included** | user_router, attendance_router, fee_router |
| **Startup Tasks** | Database initialization, cleanup stale attempts |

**Critical Routes:**
- `GET /health` - Health check
- `GET /papers` - List papers
- `POST /papers` - Create paper
- `GET /papers/{id}` - Get paper
- `POST /papers/preview` - Preview paper (frontend only)
- `POST /papers/pdf` - Generate PDF
- `POST /papers/attempt` - Start paper attempt
- `GET /papers/attempts` - Get user's attempt history
- Get paper attempts (detailed)

#### File: models.py (648 lines)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| **users** | id, google_id, email, name, total_points, current_streak, role (student/admin) | Core user accounts |
| **student_profiles** | user_id, public_id (TH-0001), course, level, branch, status, full_name | Extended student info |
| **practice_sessions** | user_id, operation_type, correct_answers, points_earned, started_at | Mental math sessions |
| **attempts** | session_id, question_data (JSON), user_answer, correct_answer, is_correct | Individual questions |
| **paper_attempts** | user_id, paper_config (JSON), generated_blocks (JSON), answers (JSON), seed | Paper practice |
| **rewards** | user_id, badge_type, badge_category (monthly/lifetime/super/attendance) | Badges/achievements |
| **leaderboard** | user_id, total_points, rank, weekly_points, weekly_rank | Rankings |
| **points_logs** | user_id, points, source_type (daily_login/mental_math/paper_attempt), source_id | Audit trail |
| **attendance_records** | student_profile_id, class_session_id, marked_on, marked_by_user_id | Attendance tracking |
| **class_schedules** | branch, course, schedule_days (JSON), time_slots (JSON) | Class timing |
| **fee_plans** | name, amount, branch, course, description | Fee templates |
| **fee_assignments** | student_profile_id, fee_plan_id, due_date, status (pending/paid) | Student assignments |
| **fee_transactions** | fee_assignment_id, amount_paid, payment_date, mode | Payment records |

All tables include created_at/updated_at timestamps and indexed for performance.

#### File: user_routes.py (1925 lines)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users/login` | POST | Google OAuth login |
| `/users/me` | GET | Get current user info |
| `/users/me/display-name` | PUT | Update display name |
| `/users/practice-session` | POST | Save mental math session |
| `/users/stats` | GET | Overall stats (sessions, accuracy, points) |
| `/users/leaderboard/overall` | GET | Top 100 global users |
| `/users/leaderboard/weekly` | GET | Top 50 weekly users |
| `/users/session/{id}` | GET | Detailed session info |
| `/users/rewards` | GET | User's badges |
| `/users/grace-skip` | POST | Use grace skip (skip streak loss) |
| `/students/profile` | GET/PUT | Student profile CRUD |
| Many more profile/student endpoints | Various | Profile management, ID assignment |

**Key Functions:**
- `login()` - OAuth flow, user creation, daily bonus
- `get_student_stats()` - Aggregate stats from sessions and paper attempts
- `save_practice_session()` - Persist session and trigger async processing
- `process_practice_session_async()` - Background task for leaderboards, badges

#### File: auth.py

| Component | Purpose |
|-----------|---------|
| `verify_google_token()` | Validate Google OAuth tokens |
| `get_current_user()` | Dependency for protecting routes |
| `get_current_admin()` | Dependency for admin routes |
| `create_access_token()` | JWT token generation |

#### File: gamification.py (230 lines)

| Function | Purpose |
|----------|---------|
| `calculate_points()` | Points = (attempted × 1) + (correct × 5) |
| `check_and_award_badges()` | Legacy streak badges (7-day, 30-day) |
| `check_and_award_super_rewards()` | Award SUPER badges (S, U, P, E, R) at point milestones |
| `update_streak()` | Update current_streak, longest_streak daily |

#### File: reward_system.py

| Function | Purpose |
|----------|---------|
| `update_user_question_count()` | Track lifetime questions for badges |
| `check_and_award_lifetime_badges()` | Award milestone badges (e.g., 100Q, 1000Q) |
| `check_monthly_accuracy_achievements()` | Monthly accuracy-based badges (eval script) |

#### File: leaderboard_service.py

| Function | Purpose |
|----------|---------|
| `update_leaderboard()` | Rank users by total_points |
| `update_weekly_leaderboard()` | Rank users by weekly_points (week in IST) |
| `get_overall_leaderboard()` | Return top N users |
| `get_weekly_leaderboard()` | Return top N weekly users |

#### File: attendance_routes.py

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/attendance/mark` | POST | Mark attendance for student + date |
| `/attendance/records` | GET | Get student's attendance history |
| `/attendance/stats` | GET | Attendance summary |
| `/class-schedules/{branch}` | GET | Get class schedule for branch |
| `/class-sessions` | GET | Get all class sessions |

#### File: fee_routes.py

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/fees/plans` | GET/POST | List/Create fee plans |
| `/fees/assign` | POST | Assign plan to student |
| `/fees/transactions` | GET | Fee transaction history |
| `/fees/{id}/status` | PUT | Update payment status |

#### File: math_generator.py

| Function | Purpose |
|----------|---------|
| `generate_block()` | Generate questions for a paper block (40+ operation types) |
| Question type functions | `generate_multiplication()`, `generate_division()`, `generate_lcm()`, etc. |
| Constraint validation | Ensure constraints (digits, rows, difficulty) are applied |

#### File: pdf_generator*.py (3 versions)

| File | Purpose |
|------|---------|
| `pdf_generator.py` | Original ReportLab-based PDF generation |
| `pdf_generator_v2.py` | Enhanced version with better layout |
| `pdf_generator_playwright.py` | Headless browser-based PDF (used in prod) |

**Key Function:** `generate_pdf()` - Takes paper config and generated_blocks, returns PDF file

#### File: points_logger.py

| Function | Purpose |
|----------|---------|
| `log_points()` | Create PointsLog entry for audit trail |

Used after every point-earning activity (login, practice, etc.)

### 4.2 Utility Files

#### File: timezone_utils.py

| Function | Purpose |
|----------|---------|
| `get_ist_now()` | Get current time in IST (UTC+5:30) |
| `IST_TIMEZONE` | pytz timezone object |

Note: All timestamps stored as naive datetimes in DB; treated as IST when retrieved.

#### File: student_profile_utils.py

| Function | Purpose |
|----------|---------|
| `validate_level()` | Validate course/level combinations |
| `validate_course()` | Allowed courses: Abacus, Vedic Maths, Handwriting, STEM |
| `validate_branch()` | Allowed branches: Rohini-16, Rohini-11, Gurgaon, Online |
| `generate_public_id()` | Create TH-XXXX IDs sequentially |

#### File: schemas.py & user_schemas.py

Pydantic models for request/response validation:
- `PaperCreate`, `PaperResponse` - Paper CRUD
- `LoginRequest`, `LoginResponse` - OAuth
- `PracticeSessionCreate`, `PracticeSessionResponse` - Session CRUD
- `StudentStats` - Dashboard stats
- Many more...

### 4.3 Database Migrations

| Location | Purpose |
|----------|---------|
| `backend/migrations/` | Alembic migration history (if using) |

Currently using `init_db()` in models.py for schema creation (SQLAlchemy creates tables).

---

## 5. File Responsibility Map

| File Path | What It Controls | Features Depending On It |
|-----------|-----------------|--------------------------|
| **backend/main.py** | API entry point, routing, middleware | All API calls, health checks |
| **backend/auth.py** | User authentication, JWT | All protected endpoints |
| **backend/models.py** | Database schema, relationships | All data persistence |
| **backend/user_routes.py** | User API endpoints | Dashboard, login, stats, leaderboards |
| **backend/attendance_routes.py** | Attendance API | Attendance calendar, admin dashboard |
| **backend/fee_routes.py** | Fee management API | Fee management page, billing |
| **backend/gamification.py** | Points calculation, streak logic | Rewards display, leaderboards |
| **backend/reward_system.py** | Badge awarding logic | Badge display, achievements |
| **backend/math_generator.py** | Question generation | Paper creation, mental math |
| **backend/pdf_generator_playwright.py** | PDF file generation | Paper PDF downloads |
| **backend/leaderboard_service.py** | Ranking algorithms | Leaderboards, rankings |
| **backend/points_logger.py** | Points audit trail | Points history, debugging |
| **backend/timezone_utils.py** | Time conversion | All time-based features |
| **backend/student_profile_utils.py** | Student ID, validation | Profile management, student IDs |
| **frontend/src/App.tsx** | Routing, layout | All page navigation |
| **frontend/src/contexts/AuthContext.tsx** | Auth state, user info | All protected pages, user data |
| **frontend/src/pages/Mental.tsx** | Mental math UI | Practice feature |
| **frontend/src/pages/PaperCreate.tsx** | Paper design UI | Paper creation feature |
| **frontend/src/pages/StudentDashboard.tsx** | Stats & activity display | Dashboard feature |
| **frontend/src/lib/api.ts** | API client for papers | Paper CRUD, PDF generation |
| **frontend/src/lib/userApi.ts** | API client for users | Auth, stats, sessions |
| **frontend/src/components/MathQuestion.tsx** | Question rendering | All practice pages |
| **frontend/src/components/AttendanceCalendar.tsx** | Calendar UI | Dashboard, Admin attendance |

---

## 6. Dependency Graph

### 6.1 Frontend Component Dependencies

```
App.tsx (Routes)
├── AuthContext (auth state)
├── ThemeContext (dark mode)
├── Protected Routes
│   ├── Mental.tsx
│   │   └── MathQuestion component
│   │   └── userApi (savePracticeSession)
│   ├── PaperAttempt.tsx
│   │   └── api (getPaperAttempt, submitAttempt)
│   │   └── MathQuestion component
│   ├── StudentDashboard.tsx
│   │   ├── userApi (getStudentStats)
│   │   ├── api (getPaperAttempts)
│   │   ├── AttendanceCalendar
│   │   ├── RewardsExplanation
│   │   └── attendanceApi
│   ├── StudentProfile.tsx
│   │   └── studentApi
│   └── AdminRoutes
│       ├── AdminDashboard.tsx
│       ├── AdminAttendance.tsx (AttendanceCalendar)
│       ├── AdminFeeManagement.tsx
│       ├── AdminUnifiedManagement.tsx
│       └── AdminStudentIDManagement.tsx
└── Public Routes
    ├── Home.tsx
    ├── PaperCreate.tsx
    │   ├── api (previewPaper, generatePdf)
    │   ├── MathQuestion
    │   └── BlockEditor
    ├── CoursePages (Abacus, Vedic, etc.)
    └── NotFound.tsx
```

### 6.2 Backend API Dependencies

```
main.py (FastAPI app)
├── auth.py (OAuth verification)
├── models.py (SQLAlchemy ORM)
│   ├── User
│   ├── PracticeSession / Attempt
│   ├── PaperAttempt / Paper
│   ├── Reward / Leaderboard
│   ├── StudentProfile / fees tables
│   └── PointsLog
├── user_routes.py
│   ├── auth (get_current_user)
│   ├── models (all models)
│   ├── gamification
│   ├── reward_system
│   ├── leaderboard_service
│   ├── points_logger
│   └── student_profile_utils
├── attendance_routes.py
│   ├── auth
│   ├── models (attendance tables)
│   └── timezone_utils
├── fee_routes.py
│   ├── auth
│   ├── models (fee tables)
│   └── fee_schemas
├── math_generator.py
│   └── (question generation logic, no DB deps)
└── pdf_generator_playwright.py
    └── (PDF generation, no DB deps)
```

### 6.3 Database Entity Relationships

```
User (1)
├──(1:N)──→ PracticeSession
│           ├──(1:N)──→ Attempt
│           └──(FK)──→ User
├──(1:N)──→ PaperAttempt
├──(1:1)──→ StudentProfile
│           ├──(1:N)──→ AttendanceRecord
│           ├──(1:N)──→ FeeAssignment → FeePlan
│           │           └──(1:N)──→ FeeTransaction
│           └──(1:N)──→ Certificate
├──(1:N)──→ Reward (badges)
├──(1:N)──→ PointsLog
└──(1:1)──→ Leaderboard
```

### 6.4 Data Flow: Practice Session to Rewards

```
User submits mental math session (Mental.tsx)
    │
    ├→ POST /users/practice-session (user_routes.py)
    ├→ Save PracticeSession + Attempts (models.py)
    ├→ calculate_points(gamification.py) → points earned
    ├→ log_points(points_logger.py) → PointsLog entry
    ├→ update_user_question_count(reward_system.py) → total_questions_attempted
    ├→ Commit transaction, return response
    │
    └→ Background task: process_practice_session_async()
        ├→ update_streak(gamification.py)
        ├→ check_and_award_lifetime_badges(reward_system.py)
        ├→ check_and_award_super_rewards(gamification.py)
        ├→ update_leaderboard(leaderboard_service.py)
        ├→ update_weekly_leaderboard(leaderboard_service.py)
        └→ Commit all changes
```

---

## 7. Troubleshooting Guide

### Issue: Rewards Not Updating

**Problem:** User doesn't see new badges despite practicing.

**Root Cause Checklist:**

| Check | File | What to Verify |
|-------|------|-----------------|
| 1. Session saved? | [user_routes.py](backend/user_routes.py#L319) | Check DB: `SELECT COUNT(*) FROM practice_sessions WHERE user_id = X` |
| 2. Points calculated? | [gamification.py](backend/gamification.py#L10) | Ensure `calculate_points()` returns > 0; check points_logs table |
| 3. Background task ran? | [user_routes.py](backend/user_routes.py#L103) | Check logs for "BG_TASK" messages; may be async timeout |
| 4. Badges awarded? | [reward_system.py](backend/reward_system.py) | Query: `SELECT * FROM rewards WHERE user_id = X ORDER BY earned_at DESC` |
| 5. Caching issue? | [frontend/src/lib/userApi.ts](frontend/src/lib/userApi.ts) | Clear React Query cache or hard refresh browser |

**Solution Steps:**
1. Check backend logs for errors in `process_practice_session_async()`
2. Manually trigger: `db.query(User).filter(User.id==X).update({User.total_points: ...}); db.commit()`
3. Clear browser cache and refresh
4. Verify `ADMIN_EMAILS` env var doesn't mistakenly include user email (prevents role updates)

### Issue: Leaderboard Not Updating

**Problem:** User's rank doesn't change even after earning points.

| Location | What to Check |
|----------|---------------|
| [leaderboard_service.py](backend/leaderboard_service.py) | `update_leaderboard()` function logic |
| [user_points](backend/models.py#L31) | User.total_points field increasing? |
| [leaderboard table](backend/models.py#L166) | Rankings stale? Last_updated old? |

**Solution:**
- Manually trigger: `from leaderboard_service import update_leaderboard; db = next(get_db()); update_leaderboard(db)`
- Check if `weekly_points` reset function runs (Sunday at 12:01 AM IST)

### Issue: Attendance Not Tracking

**Problem:** Calendar shows no sessions or marks don't persist.

| File | Check |
|------|-------|
| [attendance_routes.py](backend/attendance_routes.py) | POST /attendance/mark endpoint logic |
| [AttendanceCalendar.tsx](frontend/src/components/AttendanceCalendar.tsx) | Frontend state management |
| [class_schedules](backend/models.py#L253) | Branch schedule defined? |
| [attendance_records](backend/models.py#L217) | Records saved to DB? |

**Solution:**
1. Verify class schedule exists: `SELECT * FROM class_schedules WHERE branch = 'Rohini-16'`
2. Check attendance_records: `SELECT * FROM attendance_records WHERE student_profile_id = X`
3. Verify marked_by_user_id is admin: `SELECT * FROM users WHERE role='admin' AND id=X`

### Issue: Paper Generation Fails or Thousands Take Too Long

**Problem:** PDF generation timeout or wrong questions.

| File | Check |
|------|-------|
| [math_generator.py](backend/math_generator.py) | Operation type implemented? All constraints satisfied? |
| [pdf_generator_playwright.py](backend/pdf_generator_playwright.py) | Playwright server running? Chrome/Chromium available? |
| [PaperCreate.tsx](frontend/src/pages/PaperCreate.tsx) | Configuration sent correctly to backend? |

**Solution:**
1. Test question generation: 
   ```python
   from math_generator import generate_block
   result = generate_block(type="multiplication", constraints={...}, count=1)
   print(result)
   ```
2. Test PDF generation:
   ```python
   result = generate_pdf_playwright(paper_title="Test", generated_blocks=[...])
   ```
3. If Playwright timeout: increase timeout in `pdf_generator_playwright.py`

### Issue: Fee Structure Not Showing for Student

**Problem:** Admin assigned fee but student doesn't see it.

| Check | Location |
|-------|----------|
| Fee plan exists? | `SELECT * FROM fee_plans WHERE id = X` |
| Assignment created? | `SELECT * FROM fee_assignments WHERE student_profile_id = Y` |
| FK linkage correct? | Ensure fee_plan_id references valid plan |
| Permission issue? | Admin must have `role='admin'` |

**Solution:**
1. Admin re-create assignment via [AdminFeeManagement.tsx](frontend/src/pages/AdminFeeManagement.tsx)
2. Verify student profile exists and has user_id link
3. Refresh dashboard after changes (2-3 second delay)

### Issue: Login Fails (OAuth Token Error)

**Problem:** "Token verification failed" error.

| Check | File |
|-------|------|
| Google credentials valid? | [frontend Login component](frontend/src/components/Login.tsx) |
| Backend CORS allows origin? | [main.py line 85](backend/main.py#L85) - add origin to allowed_origins |
| Token format correct? | [user_routes.py #login](backend/user_routes.py#L109) - check token source (credential vs token field) |
| GOOGLE_OAUTH_CLIENT_ID set? | [auth.py](backend/auth.py) - verify env var |

**Solution:**
1. Check browser console for OAuth error
2. Add frontend URL to Google OAuth app allowed origins
3. Ensure `.env` has: `GOOGLE_OAUTH_CLIENT_ID=...` and `GOOGLE_OAUTH_CLIENT_SECRET=...`
4. See logs: `❌ [LOGIN] Token verification failed: ...`

### Issue: Student ID Not Assigned

**Problem:** Public ID (TH-0001) shows null.

| Check | Location |
|-------|----------|
| Profile created? | `SELECT * FROM student_profiles WHERE user_id = X` |
| ID generator working? | [student_profile_utils.py](backend/student_profile_utils.py) - test `generate_public_id()` |
| Admin assigned it? | [AdminStudentIDManagement.tsx](frontend/src/pages/AdminStudentIDManagement.tsx) UI |
| Query result? | `SELECT public_id FROM student_profiles WHERE user_id = X` |

**Note:** Public IDs are **NOT** auto-assigned at signup; admins must manually assign them.

**Solution:**
1. Admin navigates to [/admin/student-ids](frontend/src/pages/AdminStudentIDManagement.tsx)
2. Search for student without ID
3. Click "Assign ID" button
4. ID generated sequentially from `VacantId` table

---

## 8. Developer Navigation Guide

### 8.1 "Where to Look When..." Cheat Sheet

| Task | Files to Check |
|------|-----------------|
| **Add new math operation type** | 1. [math_generator.py](backend/math_generator.py) - add function<br>2. [PaperCreate.tsx](frontend/src/pages/PaperCreate.tsx) - add UI config<br>3. [MathQuestion.tsx](frontend/src/components/MathQuestion.tsx) - add rendering |
| **Modify point calculation** | [gamification.py](backend/gamification.py#L10) - `calculate_points()` function |
| **Change badge thresholds** | [reward_system.py](backend/reward_system.py) - badge definitions |
| **Add new course** | 1. [student_profile_utils.py](backend/student_profile_utils.py) - add course name<br>2. Create new page in [frontend/src/pages/](frontend/src/pages/)<br>3. Add route in [App.tsx](frontend/src/App.tsx) |
| **Fix leaderboard** | [leaderboard_service.py](backend/leaderboard_service.py) |
| **Troubleshoot API** | 1. Check logs in terminal<br>2. 🔴 error logs = critical<br>3. ⚠️ warning logs = info |
| **Add admin feature** | 1. Create page in [frontend/src/pages/Admin*.tsx](frontend/src/pages/)<br>2. Add AdminRoute wrapper in [App.tsx](frontend/src/App.tsx)<br>3. Create API route in appropriate `backend/*_routes.py` file |
| **Modify dashboard** | [StudentDashboard.tsx](frontend/src/pages/StudentDashboard.tsx) (1453 lines - big file!) |
| **Change authentication** | [auth.py](backend/auth.py) - OAuth logic<br>[Login component](frontend/src/components/Login.tsx) |
| **Database schema change** | 1. Add model in [models.py](backend/models.py)<br>2. Run `init_db()` to create table<br>3. Create migration (optional) |
| **Attendance features** | [attendance_routes.py](backend/attendance_routes.py) + [AdminAttendance.tsx](frontend/src/pages/AdminAttendance.tsx) |
| **Fee management** | [fee_routes.py](backend/fee_routes.py) + [AdminFeeManagement.tsx](frontend/src/pages/AdminFeeManagement.tsx) |
| **Time conversion issues** | [timezone_utils.py](backend/timezone_utils.py) - always use `get_ist_now()` |
| **React state management** | [AuthContext.tsx](frontend/src/contexts/AuthContext.tsx) for auth<br>[ThemeContext.tsx](frontend/src/contexts/ThemeContext.tsx) for theme<br>useState for page-level state |
| **API communication** | [frontend/src/lib/api.ts](frontend/src/lib/api.ts) - paper API<br>[frontend/src/lib/userApi.ts](frontend/src/lib/userApi.ts) - user API<br>[frontend/src/lib/attendanceApi.ts](frontend/src/lib/attendanceApi.ts) - attendance |

### 8.2 Feature Development Workflow

#### To Add a New Mental Math Operation:

1. **Backend (math_generator.py):**
   ```python
   def generate_my_operation(constraints, count):
       # Generate questions of MY_OP_TYPE
       return [{"type": "my_op_type", "a": 5, "b": 3, ...}]
   ```

2. **Frontend (Mental.tsx):**
   - Add operation type to `OperationType` union
   - Update difficulty generator logic
   - Add question rendering case

3. **Test:**
   - Go to /mental
   - Select operation
   - Verify questions display correctly
   - Check points awarded in dashboard

#### To Add a New Badge:

1. **Backend (reward_system.py or monthly_badge_evaluation.py):**
   ```python
   if condition_met(user):
       reward = Reward(
           user_id=user.id,
           badge_type="new_badge_id",
           badge_name="New Badge Name",
           badge_category="lifetime"  # or "monthly"
       )
       db.add(reward)
   ```

2. **Frontend (RewardsExplanation component):**
   - Add badge icon/description
   - Display in rewards list

3. **Test:**
   - Perform action that triggers badge
   - Refresh dashboard
   - Verify badge appears

#### To Add Admin Feature:

1. **Create page:** [frontend/src/pages/Admin*.tsx](frontend/src/pages/)
2. **Add route in App.tsx:** Wrap with `<AdminRoute>`
3. **Button in AdminDashboard.tsx:** Link to new feature
4. **Create API:** Add endpoint in `backend/*_routes.py` with `@get_current_admin` check
5. **Add to nav:** Update header/menu

---

## 9. API Reference

### 9.1 Authentication Endpoints

```
POST /users/login
Description: Login with Google OAuth token
Request: { credential: "google_jwt_token" } OR { token: "google_jwt_token" }
Response: { access_token: "jwt", user: UserResponse }
```

### 9.2 User Endpoints

```
GET /users/me
Description: Get current user info
Auth: ✅ Required
Response: UserResponse { id, email, name, total_points, current_streak, ... }

GET /users/stats
Description: Get comprehensive stats (sessions, badges, accurate)
Auth: ✅ Required
Response: StudentStats { total_sessions, total_questions, overall_accuracy, badges, recent_sessions, ... }

GET /users/leaderboard/overall
Description: Get top 100 users by total points
Auth: ✅ Required (optional?)
Response: Array<LeaderboardEntry>

GET /users/leaderboard/weekly
Description: Get top 50 users by weekly points (current week IST)
Auth: ✅ Required
Response: Array<LeaderboardEntry>

POST /users/practice-session
Description: Save a completed mental math session
Auth: ✅ Required
Request: PracticeSessionCreate { operation_type, difficulty_mode, correct_answers, wrong_answers, ... }
Response: PracticeSessionResponse { id, user_id, points_earned, ... }
```

### 9.3 Paper Endpoints

```
GET /papers
Description: List all paper templates
Response: Array<PaperResponse>

POST /papers
Description: Create new paper
Request: PaperCreate { title, level, config: PaperConfig }
Response: PaperResponse

GET /papers/{paper_id}
Description: Get specific paper
Response: PaperResponse

POST /papers/preview
Description: Generate questions without saving
Request: { config: PaperConfig, level: string }
Response: { blocks: Array<GeneratedBlock> }

POST /papers/pdf
Description: Generate PDF file
Request: { generated_blocks, paper_title, level }
Response: File (PDF)

POST /papers/attempt
Description: Start new paper attempt
Request: { paper_title, paper_level, paper_config, seed }
Response: PaperAttemptResponse

GET /papers/attempts
Description: Get user's paper attempt history (last 10)
Response: Array<PaperAttemptResponse>

POST /papers/attempt/{attempt_id}/submit
Description: Submit answers for paper
Request: { answers: { question_id: answer, ... } }
Response: { score, accuracy, points_earned, ... }
```

### 9.4 Attendance Endpoints

```
POST /attendance/mark
Description: Mark attendance for student
Auth: ✅ Admin
Request: { student_profile_id, marked_on, status }

GET /attendance/records
Description: Get student's attendance history
Auth: ✅ Required
Response: Array<AttendanceRecord>

GET /class-schedules/{branch}
Description: Get class schedule for branch
Response: Array<ClassSchedule>
```

### 9.5 Fee Endpoints

```
POST /fees/plans
Description: Create fee plan
Auth: ✅ Admin
Request: { name, amount, branch, course }

GET /fees/plans
Description: List fee plans
Auth: ✅ Admin

POST /fees/assign
Description: Assign fee plan to student
Auth: ✅ Admin
Request: { student_profile_id, fee_plan_id }

GET /fees/transactions
Description: Get fee transaction history
Auth: ✅ Admin/Student (own records)
```

### 9.6 Health & System

```
GET /health
Description: Health check
Auth: ❌ None
Response: { status: "ok", database: "connected" }

GET /
Description: Root info
Response: { message: "Abacus Paper Generator API", version: "3.0.0" }
```

---

## 10. Environment Configuration

### Backend (.env required)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/talenthub
SQLALCHEMY_ECHO=False

# OAuth
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-secret

# Admin emails (comma-separated, auto-promotes admins)
ADMIN_EMAILS=admin1@email.com,admin2@email.com

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256

# CORS
FRONTEND_URL=http://localhost:5173

# Timezone (default: IST)
TIMEZONE=Asia/Kolkata
```

### Frontend (.env not typically needed, uses API_URL)

```typescript
// Configured in api.ts
const API_URL = "http://localhost:8000"; // or prod URL
const OAUTH_CLIENT_ID = "...from Google Console...";
```

---

## 11. Common Issues & Solutions

### Issue: "ERR_EMPTY_RESPONSE" on API calls

**Root Cause:** Server exception not caught, socket drops

**Solution:** Check [main.py global_exception_handler](backend/main.py#L200) - ensure all errors return JSON

### Issue: Timezone mismatch (times show wrong)

**Root Cause:** Using Python datetime without IST conversion

**Solution:** Always use `get_ist_now()` from [timezone_utils.py](backend/timezone_utils.py)

### Issue: Paper questions don't generate for certain levels

**Root Cause:** Preset blocks not defined or operation type not implemented

**Solution:** Check [presets.py](backend/presets.py) - add missing operation

### Issue: Slow dashboard load (>3 seconds)

**Root Cause:** Too many sequential API calls in [StudentDashboard.tsx](frontend/src/pages/StudentDashboard.tsx)

**Solution:** 
- Parallelize API calls (Promise.all)
- Implement pagination for large datasets
- Cache frequently accessed data

### Issue: Database connection errors on startup

**Root Cause:** DATABASE_URL not set or PostgreSQL not running

**Solution:**
```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/talenthub"

# Ensure PostgreSQL running
psql -U user -d talenthub -c "SELECT 1"

# Run migrations
python backend/run_migration.py
```

---

## 12. Testing Guide

### Backend Testing

```python
# Test points calculation
from backend.gamification import calculate_points

points = calculate_points(
    correct_answers=5,
    total_questions=10,
    time_taken=60,
    difficulty_mode="hard",
    accuracy=50,
    attempted_questions=9
)
print(f"Points: {points}")  # Should be: (9 * 1) + (5 * 5) = 34

# Test token verification
from backend.auth import verify_google_token

user_info = verify_google_token(token="google_jwt_token")
print(user_info)  # Should return: {google_id, email, name, avatar_url}
```

### Frontend Testing

```typescript
// Test API calls
import { savePracticeSession } from "@/lib/userApi";

const data = await savePracticeSession({
  operation_type: "multiplication",
  difficulty_mode: "easy",
  total_questions: 10,
  correct_answers: 8,
  wrong_answers: 2,
  attempts: []
});
```

---

## 13. Deployment Guide

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 12+
- Docker (optional)

### Frontend Deployment

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel, Netlify, or static host
```

### Backend Deployment

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 14. Key Code Patterns

### Pattern 1: Protected API Endpoint

```python
from fastapi import APIRouter, Depends
from auth import get_current_user

router = APIRouter()

@router.get("/protected-endpoint")
async def protected_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # user is automatically authenticated
    return {"user_id": current_user.id}
```

### Pattern 2: Background Task

```python
from fastapi import BackgroundTasks

@router.post("/submit-form")
async def submit(
    data: RequestModel,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Do sync work
    save_to_db(data, db)
    
    # Schedule async work
    background_tasks.add_task(
        heavy_computation,
        user_id=data.user_id,
        param=value
    )
    
    return {"status": "processing"}

def heavy_computation(user_id: int, param: str):
    db = next(get_db())
    # Long-running task
    db.close()
```

### Pattern 3: API Call with Error Handling

```typescript
import { useQuery } from "@tanstack/react-query";

export function useStudentStats() {
  return useQuery({
    queryKey: ["student-stats"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    staleTime: 60000, // 1 minute
    retry: 2
  });
}
```

### Pattern 4: Timezone-Safe Queries

```python
from timezone_utils import get_ist_now

# Save time as naive UTC equivalent of IST
ist_now = get_ist_now()
saved_time = ist_now.replace(tzinfo=None)  # Remove tz info
user.created_at = saved_time
db.add(user)

# Retrieve and convert back
user = db.query(User).filter(User.id == 1).first()
saved_naive = user.created_at  # No tz info
actual_time = saved_naive.replace(tzinfo=IST_TIMEZONE)  # Add tz info back
```

---

## 15. Glossary & Definitions

| Term | Definition |
|------|-----------|
| **Practice Session** | A timed mental math quiz (e.g., 10 multiplication problems in 2 minutes) |
| **Paper Attempt** | A practice paper created with custom blocks, attempted by a student |
| **Block** | A section of a paper containing one operation type |
| **Operation Type** | A specific math operation (multiplication, division, LCM, etc.) |
| **Seed** | Random number used to deterministically generate questions (reproducible papers) |
| **Accuracy** | Percentage of correct answers out of total questions |
| **Streak** | Consecutive days of practice (resets on missed day) |
| **Badge** | Achievement given for milestones (monthly, lifetime, super) |
| **Leaderboard** | Ranking of users by points (overall or weekly) |
| **Grace Skip** | One weekly use to skip a day without losing streak |
| **Public ID** | Student identifier in format TH-0001 (manually assigned by admin) |
| **Internal UUID** | System UUID for StudentProfile (auto-generated) |
| **IST** | Indian Standard Time (UTC+5:30) |
| **OAuth** | Google's authentication protocol |
| **JWT** | JSON Web Token for session management |

---

## 16. File Reference Guide

### Core Backend Files (must-know order)

1. [backend/main.py](backend/main.py) - Start here for API structure
2. [backend/models.py](backend/models.py) - Database schema
3. [backend/auth.py](backend/auth.py) - Authentication logic
4. [backend/user_routes.py](backend/user_routes.py) - User/dashboard APIs
5. [backend/gamification.py](backend/gamification.py) - Points & badges
6. [backend/math_generator.py](backend/math_generator.py) - Question generation

### Core Frontend Files (must-know order)

1. [frontend/src/App.tsx](frontend/src/App.tsx) - Routes & layout
2. [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx) - Auth state
3. [frontend/src/pages/Mental.tsx](frontend/src/pages/Mental.tsx) - Practice feature
4. [frontend/src/pages/StudentDashboard.tsx](frontend/src/pages/StudentDashboard.tsx) - Dashboard
5. [frontend/src/pages/PaperCreate.tsx](frontend/src/pages/PaperCreate.tsx) - Paper builder
6. [frontend/src/lib/api.ts](frontend/src/lib/api.ts) - API client

---

## 17. Quick Stats

| Metric | Value |
|--------|-------|
| **Frontend Lines of Code** | ~40,000+ (React/TypeScript) |
| **Backend Lines of Code** | ~15,000+ (Python) |
| **Database Tables** | 26+ |
| **API Endpoints** | 50+ |
| **Operation Types** | 40+ math operations |
| **Frontend Pages** | 17 pages (public + protected + admin) |
| **React Components** | 30+ reusable components |
| **Python Modules** | 20+ modules |

---

## 18. Future Enhancement Ideas

1. **Real-time collaboration** - Multiple students attempting same paper
2. **Video tutorials** - Embedded learning videos per operation
3. **Mobile app** - React Native version
4. **Offline mode** - Progressive Web App (PWA)
5. **Social features** - Challenge friends, team competitions
6. **AI analysis** - Identify weak areas and recommend practice
7. **Advanced analytics** - Parent portal with detailed progress
8. **Payment integration** - Online fee collection
9. **Batch operations** - Bulk student import, export
10. **Custom reporting** - Admin-generated performance reports

---

**Document Created:** February 18, 2026  
**Version:** 1.0 - Complete Analysis  
**Status:** ✅ Ready for Development Reference

