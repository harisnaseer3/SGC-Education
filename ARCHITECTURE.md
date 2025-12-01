# SGC Education - System Architecture

## Overview
Large-scale, multi-tenant educational management system for managing multiple schools and colleges under SGC Group.

## User Roles Hierarchy

### 1. Super Admin (SGC Management)
- Manages all institutions
- Creates/manages school/college admins
- System-wide settings and configurations
- Access to all data across institutions
- Financial reports and analytics

### 2. School/College Admin
- Manages their specific institution
- Creates departments and classes
- Manages teachers, staff, and students
- Institution-specific settings
- Reports and analytics for their institution

### 3. Teachers/Faculty
- Manages assigned classes
- Records attendance
- Assigns and grades assignments
- Views student performance
- Communication with students

### 4. Students
- Views courses and schedules
- Submits assignments
- Views grades and attendance
- Communication with teachers
- Access to learning materials

### 5. Parents (Future)
- Views child's performance
- Communication with teachers
- Attendance tracking

## Core Modules

### 1. Institution Management
- Multiple schools/colleges
- Departments per institution
- Classes/Sections
- Academic years/Semesters

### 2. User Management
- Role-based access control (RBAC)
- User profiles
- Permissions system
- Authentication & Authorization

### 3. Academic Management
- Course catalog
- Curriculum management
- Class schedules/Timetables
- Subject assignments

### 4. Attendance System
- Student attendance
- Teacher attendance
- Leave management
- Attendance reports

### 5. Grading & Assessment
- Assignments
- Exams/Tests
- Grade management
- Report cards
- Progress tracking

### 6. Communication
- Announcements
- Notifications
- Messaging system
- Email integration

### 7. Fee Management (Future)
- Fee structure
- Payment tracking
- Invoice generation
- Financial reports

### 8. Library Management (Future)
- Book catalog
- Issue/Return tracking
- Fine management

## Technical Architecture

### Backend Structure
```
server/
├── config/              # Configuration files
│   ├── database.js
│   ├── jwt.js
│   └── constants.js
├── models/              # Database models
│   ├── User.js
│   ├── Institution.js
│   ├── Department.js
│   ├── Class.js
│   ├── Course.js
│   ├── Attendance.js
│   └── Grade.js
├── controllers/         # Business logic
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── institution.controller.js
│   └── ...
├── services/            # Service layer
│   ├── auth.service.js
│   ├── user.service.js
│   └── ...
├── middleware/          # Express middleware
│   ├── auth.middleware.js
│   ├── rbac.middleware.js
│   ├── validation.middleware.js
│   └── error.middleware.js
├── routes/              # API routes
│   ├── v1/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── institution.routes.js
│   └── index.js
├── utils/               # Utility functions
│   ├── validators.js
│   ├── helpers.js
│   └── constants.js
├── scripts/             # Maintenance scripts
│   └── resetSuperAdmin.js
└── server.js            # Entry point
```

### Frontend Structure
```
client/
├── src/
│   ├── components/          # Reusable components
│   │   ├── common/          # Common UI components
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   ├── Table.js
│   │   │   └── Modal.js
│   │   └── layout/          # Layout components
│   │       ├── Navbar.js
│   │       ├── Sidebar.js
│   │       └── Footer.js
│   ├── features/            # Feature-based modules
│   │   ├── auth/
│   │   │   ├── Login.js
│   │   │   └── authSlice.js
│   │   ├── institutions/
│   │   │   ├── InstitutionList.js
│   │   │   ├── InstitutionForm.js
│   │   │   └── institutionSlice.js
│   │   ├── users/
│   │   ├── courses/
│   │   └── attendance/
│   ├── pages/               # Page components
│   │   ├── Dashboard.js
│   │   ├── Profile.js
│   │   └── NotFound.js
│   ├── services/            # API services
│   │   ├── api.js
│   │   ├── authService.js
│   │   └── userService.js
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js
│   │   └── usePermissions.js
│   ├── utils/               # Utility functions
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── routes/              # Route configuration
│   │   ├── PrivateRoute.js
│   │   └── routes.js
│   └── App.js
```

## Database Schema

### Multi-Tenancy Approach
- **Shared Database, Shared Schema** with Institution ID
- Every record (except User and Institution) has `institutionId`
- Super Admin can access all data
- Institution-specific users only see their institution's data

### Key Relationships
```
Institution
  ├── Departments
  │     └── Classes
  │           ├── Students
  │           ├── Teachers (assigned)
  │           ├── Courses
  │           └── Attendance
  └── Users (Admins, Teachers, Students)
```

## Security Features

1. **JWT Authentication**
2. **Role-Based Access Control (RBAC)**
3. **Row-Level Security** (Institution-based filtering)
4. **Password Encryption** (bcrypt)
5. **Input Validation**
6. **Rate Limiting**
7. **CORS Configuration**

## API Versioning
- All APIs under `/api/v1/`
- Allows future versions without breaking changes

## Scalability Considerations

1. **Database Indexing** on frequently queried fields
2. **Pagination** for all list endpoints
3. **Caching** (Redis for future)
4. **File Storage** (AWS S3 or similar for documents)
5. **Background Jobs** (for reports, emails)
6. **Load Balancing** ready architecture
