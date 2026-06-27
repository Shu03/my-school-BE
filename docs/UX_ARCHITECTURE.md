# UX Architecture - My School Management System

## Overview
This document outlines the complete UX structure for the frontend application, organized by user roles, workflows, and data models.

---

## 1. User Roles & Permissions

### Role Hierarchy
```
ADMIN (Super Admin)
├── Full system access
├── User management (create/activate/deactivate)
├── Teachers & student management
├── Academic configuration
└── Permission presets

TEACHER
├── View/manage assigned classes
├── View/manage assigned subjects
├── View students in assigned classes
├── Self-profile management
└── Permission-based (preset + overrides)

STUDENT
├── View own profile
├── View enrolled class/subjects
├── View teachers
└── Limited to own data only
```

### Key Permissions
- `PERMISSION_CLASS_MANAGE` - Create, update, assign teachers to classes
- `PERMISSION_SUBJECT_MANAGE` - Create, update subjects
- `PERMISSION_ACADEMIC_YEAR_MANAGE` - Create/manage academic years and terms

---

## 2. Authentication & Authorization

### Auth Module
**Base: `/auth`**

| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| Login | `/auth/login` | POST | Public | - | Mobile + password login |
| Refresh Token | `/auth/refresh` | POST | Public | - | Token rotation |
| Logout | `/auth/logout` | POST | Bearer | All | Revoke all sessions |
| Change Password | `/auth/change-password` | POST | JWT (Change) | All | First login or voluntary |
| Admin Reset Password | `/auth/admin/reset-password` | POST | Bearer | ADMIN | Force password reset for user |
| Get Profile | `/auth/me` | GET | Bearer | All | Current user profile |

### Screens
- **Login Screen** - Email/mobile + password
- **Change Password Dialog** - First login flow
- **Profile View** - Current user info

---

## 3. User Management

### Users Module
**Base: `/users`**

| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| Create Admin | `/users/admin` | POST | Bearer | ADMIN | Create new admin account |
| Create Teacher | `/users/teacher` | POST | Bearer | ADMIN | Create new teacher account |
| Create Student | `/users/student` | POST | Bearer | ADMIN | Create new student account |
| List Users | `/users` | GET | Bearer | ADMIN | Paginated list with filters |
| Get User | `/users/:id` | GET | Bearer | ADMIN | Single user details |
| Update User | `/users/:id` | PATCH | Bearer | ADMIN | Update name/email |
| Deactivate User | `/users/:id/deactivate` | PATCH | Bearer | ADMIN | Deactivate account |
| Activate User | `/users/:id/activate` | PATCH | Bearer | ADMIN | Activate account |

### Screens
- **Users List** - Table with filters, search, pagination
  - Columns: Mobile, Name, Email, Role, Status, Actions
  - Filters: Role, Status, Created Date
  - Actions: View, Edit, Activate/Deactivate, Reset Password
  
- **Create User Dialog** - Three variants
  - Admin Form: Name, Mobile, Email, Initial Password
  - Teacher Form: Name, Mobile, Email, Qualifications, Subject
  - Student Form: Name, Mobile, Email, DOB, Guardian Info
  
- **Edit User Modal** - Update name, email
- **User Details Panel** - View full profile, action buttons

---

## 4. Academic Years & Terms

### Academic Years Module
**Base: `/academic-years`**

| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| Create Year | `/academic-years` | POST | Bearer | ADMIN/TEACHER | Create new academic year |
| List Years | `/academic-years` | GET | Bearer | ADMIN/TEACHER | All academic years |
| Get Current | `/academic-years/current` | GET | Bearer | All | Current active year |
| Get Year | `/academic-years/:id` | GET | Bearer | ADMIN/TEACHER | Single year with terms |
| Update Year | `/academic-years/:id` | PATCH | Bearer | ADMIN/TEACHER | Update year details |
| Set Current | `/academic-years/:id/set-current` | PATCH | Bearer | ADMIN | Make year active |
| Create Term | `/academic-years/:id/terms` | POST | Bearer | ADMIN/TEACHER | Add term to year |
| List Terms | `/academic-years/:id/terms` | GET | Bearer | All | Terms in year |
| Update Term | `/academic-years/:id/terms/:termId` | PATCH | Bearer | ADMIN/TEACHER | Update term |
| Delete Term | `/academic-years/:id/terms/:termId` | DELETE | Bearer | ADMIN | Remove term |

### Data Model
```
Academic Year
├── id
├── name (e.g., "2024-2025")
├── startDate
├── endDate
├── isCurrent
├── createdAt
└── Terms[]
    ├── id
    ├── name (e.g., "Term 1")
    ├── startDate
    ├── endDate
    └── academicYearId
```

### Screens
- **Academic Years List** - Card/table view
  - Show: Name, Dates, Current badge, Status
  - Actions: View, Edit, Set as Current, View Terms
  
- **Academic Year Detail** - Full year management
  - Left Panel: Year info, dates, current status
  - Right Panel: Terms table
  - Actions: Add Term, Edit, Delete Term
  
- **Create/Edit Year Modal** - Name, start date, end date
- **Term Management** - Create, edit, delete terms with date validation

---

## 5. Classes

### Classes Module
**Base: `/classes`**

| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| Create Class | `/classes` | POST | Bearer | ADMIN/TEACHER | Create new class |
| List Classes | `/classes` | GET | Bearer | All | Classes by academic year |
| Get Class | `/classes/:id` | GET | Bearer | All | Class with relations |
| Update Class | `/classes/:id` | PATCH | Bearer | ADMIN/TEACHER | Update name/grade |
| Assign Teacher | `/classes/:id/assign-teacher` | PATCH | Bearer | ADMIN/TEACHER | Set class teacher |
| Remove Teacher | `/classes/:id/remove-teacher` | PATCH | Bearer | ADMIN/TEACHER | Unassign teacher |

### Data Model
```
Class
├── id
├── name (e.g., "10-A")
├── gradeLevel (1-12)
├── academicYearId
├── classTeacherId (optional)
├── classTeacher{}
├── students[]
├── subjects[]
└── createdAt
```

### Screens
- **Classes List** - Table/grid view
  - Filters: Academic Year, Grade Level
  - Columns: Name, Grade, Teacher, Student Count, Actions
  - Actions: View, Edit, Manage Students, Manage Subjects
  
- **Class Detail Dashboard**
  - Overview Section: Class info, teacher, current term
  - Students Tab: Enrolled students, roll numbers, status
  - Subjects Tab: Assigned subjects and teachers
  - Details Tab: Edit class info, assign teacher
  
- **Create/Edit Class Modal** - Name, grade level, academic year
- **Assign Teacher Modal** - Teacher selector from active teachers

---

## 6. Subjects

### Subjects Module
**Base: `/subjects`**

| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| Create Subject | `/subjects` | POST | Bearer | ADMIN/TEACHER | Create new subject |
| List Subjects | `/subjects` | GET | Bearer | All | All subjects with filters |
| Get Subject | `/subjects/:id` | GET | Bearer | All | Subject with teachers |
| Update Subject | `/subjects/:id` | PATCH | Bearer | ADMIN/TEACHER | Update details |
| Delete Subject | `/subjects/:id` | DELETE | Bearer | ADMIN | Remove subject |

### Data Model
```
Subject
├── id
├── name
├── code (unique)
├── description
├── gradeLevel (1-12)
├── teacherAssignments[]
└── createdAt
```

### Screens
- **Subjects List** - Table view
  - Columns: Name, Code, Grade Level, Teacher Count, Actions
  - Filters: Grade Level
  - Actions: View, Edit, Delete
  
- **Subject Detail Panel**
  - Subject info: Name, code, grade, description
  - Teachers Assigned: List of teachers teaching this subject
  
- **Create/Edit Subject Modal** - Name, code, grade level, description
- **Delete Confirmation** - Validation for active assignments

---

## 7. Teachers

### Teachers Module
**Base: `/teachers`**

#### Permission Presets (Admin Only)
| Screen/Feature | Endpoint | Method | Description |
|---|---|---|---|
| Create Preset | `/teachers/presets` | POST | New permission set |
| List Presets | `/teachers/presets` | GET | All presets |
| Get Preset | `/teachers/presets/:presetId` | GET | Single preset |
| Update Preset | `/teachers/presets/:presetId` | PATCH | Modify preset |
| Delete Preset | `/teachers/presets/:presetId` | DELETE | Remove preset |

#### Teacher Profiles
| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| List Teachers | `/teachers` | GET | Bearer | ADMIN | All teachers |
| Get Teacher | `/teachers/:id` | GET | Bearer | ADMIN/TEACHER | Profile (own/any) |
| Update Teacher | `/teachers/:id` | PATCH | Bearer | ADMIN | Update profile |
| Assign Preset | `/teachers/:id/assign-preset` | PATCH | Bearer | ADMIN | Apply permission set |
| Remove Preset | `/teachers/:id/remove-preset` | PATCH | Bearer | ADMIN | Unassign preset |
| Update Permissions | `/teachers/:id/permissions` | PATCH | Bearer | ADMIN | Override permissions |

#### Class Assignments
| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| Create Assignment | `/teachers/:id/assignments` | POST | Bearer | ADMIN | Assign to class/subject |
| List Assignments | `/teachers/:id/assignments` | GET | Bearer | ADMIN/TEACHER | Teacher's classes |
| Delete Assignment | `/teachers/:id/assignments/:assignmentId` | DELETE | Bearer | ADMIN | Remove from class |

### Data Model
```
Teacher
├── id
├── userId
├── user{}
├── presetId (optional)
├── preset{}
├── permissionOverrides{}
├── classAssignments[]
│   ├── id
│   ├── classId
│   ├── subjectId
│   ├── grade
│   └── createdAt
└── createdAt

PermissionPreset
├── id
├── name
├── permissions{}
└── assignedTeachers[]
```

### Screens
- **Teachers List** - Table view
  - Columns: Name, Mobile, Subjects, Classes, Preset, Actions
  - Filters: Preset, Subject, Class
  - Actions: View, Edit, Assign Classes, Manage Permissions
  
- **Teacher Profile Dashboard**
  - Profile Section: Photo, name, email, mobile, qualifications
  - Permissions Section: Show preset + overrides
  - Assignments Section: Classes and subjects taught
  - Actions: Edit, Assign Classes, Manage Permissions
  
- **Assign Classes Modal** - Multi-select
  - Select class
  - Select subject(s)
  - Grade level (auto-filled from class)
  
- **Permissions Management** - Permission presets
  - Preset selector
  - Override toggles (Class manage, Subject manage, etc.)
  
- **Create/Edit Permission Preset Dialog**
  - Preset name
  - Checkbox list: PERMISSION_CLASS_MANAGE, PERMISSION_SUBJECT_MANAGE, etc.

---

## 8. Students

### Students Module
**Base: `/students`**

#### Enrollment Management
| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| List Students | `/students` | GET | Bearer | ADMIN/TEACHER/STUDENT | Scoped by role |
| Get Student | `/students/:id` | GET | Bearer | ADMIN/TEACHER/STUDENT | Profile (scoped access) |
| Update Student | `/students/:id` | PATCH | Bearer | ADMIN | Update profile |
| Enroll Student | `/students/:id/enroll` | POST | Bearer | ADMIN | Add to class |
| Get Enrollments | `/students/:id/enrollments` | GET | Bearer | ADMIN/STUDENT | Enrollment history |
| Update Enrollment | `/students/:id/enrollments/:enrollmentId` | PATCH | Bearer | ADMIN | Status/roll number |

#### Batch Operations
| Screen/Feature | Endpoint | Method | Auth | Role | Description |
|---|---|---|---|---|---|
| Promote Students | `/students/promote` | POST | Bearer | ADMIN | Bulk promotion |

### Data Model
```
Student
├── id
├── userId
├── user{}
├── dateOfBirth
├── guardianName
├── guardianPhone
├── enrollments[]
│   ├── id
│   ├── classId
│   ├── academicYearId
│   ├── rollNumber
│   ├── status (ACTIVE/INACTIVE)
│   └── createdAt
└── createdAt
```

### Screens
- **Students List** - Table view with role-based scoping
  - For ADMIN: Show all students, classes, filters
  - For TEACHER: Show only students in their classes
  - For STUDENT: Show own profile only
  - Columns: Roll No, Name, Class, Enrollment Status, Actions
  - Filters: Class, Academic Year, Status
  
- **Student Profile Dashboard**
  - Personal Info: Photo, name, DOB, contact
  - Guardian Info: Name, phone
  - Current Class: Class name, academic year, roll number
  - Class Subjects: List of subjects
  - Enrollments Tab: History of class changes
  - Actions: Edit (ADMIN), Enroll, Update Status
  
- **Enroll Student Modal**
  - Select class (with academic year validation)
  - Auto-filled class details
  - Roll number input
  - Status selector (ACTIVE/INACTIVE)
  
- **Update Enrollment Modal** - Roll number, status
- **Promote Students Bulk Dialog**
  - Select current class
  - Select target class
  - Preview list of students to promote
  - Confirm action

---

## 9. Navigation Structure

### Sidebar Navigation (Role-Based)

#### Admin Dashboard
```
📊 Dashboard
├── 📚 Academic Management
│   ├── Academic Years
│   ├── Terms
│   └── Classes
├── 👥 User Management
│   ├── Admins
│   ├── Teachers
│   ├── Students
│   └── Inactive Users
├── 📖 Curriculum
│   ├── Subjects
│   └── Grade Mapping
├── 🎓 Teacher Management
│   ├── Teachers List
│   ├── Permission Presets
│   └── Class Assignments
├── 👨‍🎓 Student Management
│   ├── Students List
│   ├── Enrollments
│   └── Promotions
└── ⚙️ Settings
    ├── System Config
    └── Backup/Export
```

#### Teacher Dashboard
```
📊 Dashboard
├── 📚 My Classes
│   ├── List Classes
│   └── Class Details
├── 📖 My Subjects
│   └── Subject List
├── 👨‍🎓 My Students
│   ├── By Class
│   └── Full List
└── 👤 Profile
    └── My Details
```

#### Student Dashboard
```
📚 My Education
├── 📖 Current Class
├── 📚 My Subjects
├── 👨‍🏫 My Teachers
└── 👤 My Profile
```

---

## 10. Key Workflows

### Workflow 1: Setup New Academic Year
```
Admin Dashboard → Academic Years
  1. Create Academic Year (name, dates)
  2. Create Terms within year
  3. Create Classes for year
  4. Assign Subjects to Classes
  5. Assign Teachers to Subjects/Classes
  6. Create/Import Students
  7. Enroll Students to Classes
  8. Set Year as Current
```

### Workflow 2: Add New Teacher
```
Admin Dashboard → Users Management
  1. Create Teacher User (name, mobile, email)
  2. Go to Teachers → List
  3. View new teacher profile
  4. Assign Permission Preset (or custom)
  5. Create Class Assignments (class + subject)
```

### Workflow 3: Enroll Student to Class
```
Admin Dashboard → Students Management
  1. Find or Create Student
  2. View Student Profile
  3. Click "Enroll in Class"
  4. Select Class (validates academic year)
  5. Assign Roll Number
  6. Confirm Enrollment
```

### Workflow 4: Promote Class of Students
```
Admin Dashboard → Students Management
  1. Click "Bulk Promotion"
  2. Select Current Class (e.g., Grade 9-A)
  3. Select Target Class (e.g., Grade 10-A)
  4. Review students to be promoted
  5. Confirm Promotion
```

### Workflow 5: Teacher Views Their Class
```
Teacher Dashboard → My Classes
  1. Click Class from list
  2. View Class Details (students, subjects)
  3. See assigned subjects and co-teachers
  4. Access student list with filters
```

---

## 11. Data Flow & Integration Points

### API Base URL
```
http://localhost:3000/api/v1
```

### Authentication Flow
```
1. POST /auth/login → Get access_token + refresh_token
2. Store tokens in localStorage/secure storage
3. Add Bearer token to all requests
4. On token expiry → POST /auth/refresh
5. On logout → POST /auth/logout (invalidate all sessions)
```

### Error Handling
```
Responses:
- 200/201: Success
- 400: Validation errors (show field-level errors)
- 401: Unauthorized (redirect to login)
- 403: Forbidden (show permission error)
- 404: Not found (show not found message)
- 409: Conflict (duplicate data, show conflict message)
- 429: Rate limited (login endpoint has throttling)
- 500: Server error (show generic error)
```

---

## 12. State Management

### Global State (Redux/Zustand)
```
auth/
├── user (current user profile)
├── tokens (access, refresh)
├── role
└── isAuthenticated

academicYear/
├── current (active academic year)
├── list
└── selectedYear

ui/
├── loading
├── error
├── notification/toast
└── modals (open/close state)

cache/
├── teachers
├── students
├── classes
├── subjects
└── cacheTimestamp
```

### Pagination & Filtering
```
All LIST endpoints support:
- Query Params: ?page=1&limit=20&sort=name&order=asc
- Filters: Applied per module (role, status, class, etc.)
- Search: Via query parameters where applicable
```

---

## 13. UI Components Library

### Essential Components
```
Navigation
├── Sidebar (collapsible)
├── Topbar (user, notifications, logout)
└── Breadcrumbs

Data Display
├── Table (sortable, filterable, paginated)
├── Card (module overview)
├── List (vertical list view)
└── Grid (grid view)

Forms
├── Input (text, email, phone, date)
├── Select (single, multi-select)
├── Textarea
├── Checkbox/Radio
├── Date Picker
└── File Upload

Dialogs
├── Modal (create, edit, confirm)
├── Alert (error, success, warning)
├── Toast (notification)
└── Drawer (side panel)

Tables
├── Data Table (with actions, inline edit)
├── Expandable rows
└── Bulk actions

Status Badges
├── Role (ADMIN, TEACHER, STUDENT)
├── User Status (ACTIVE, INACTIVE)
├── Enrollment (ACTIVE, INACTIVE, TRANSFERRED)
└── Academic (Current, Past, Upcoming)
```

---

## 14. Responsive Design

### Breakpoints
```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

### Layout Considerations
```
Mobile:
- Stack vertical
- Hide non-essential columns in tables
- Full-width modals
- Bottom sheet instead of modals
- Hamburger menu

Tablet:
- 2-column layout for some views
- Adjusted spacing

Desktop:
- Multi-column layouts
- Side panels
- Detailed dashboards
```

---

## 15. Performance Optimizations

### Caching Strategy
```
- Cache user profile for 24 hours
- Cache academic years list for session
- Cache teachers/subjects list for 1 hour
- Invalidate cache on mutations
```

### Lazy Loading
```
- Load classes/students on demand
- Paginate large lists (default 20 items)
- Virtual scrolling for long lists
- Code splitting by role/module
```

### API Optimization
```
- Use pagination for all list endpoints
- Request only needed fields
- Batch requests where possible
- Debounce search/filter inputs
```

---

## 16. Security Considerations

```
✓ JWT authentication with access + refresh tokens
✓ Role-based access control (RBAC)
✓ Permission-based authorization (fine-grained)
✓ Tokens stored securely (httpOnly cookies or encrypted storage)
✓ Rate limiting on auth endpoints
✓ Input validation on all forms
✓ HTTPS enforced in production
✓ CORS configured appropriately
```

---

## 17. Google Stitch Integration Guide

### How to Use This Document with Google Stitch

1. **Define Data Models** → Use Section 8 (Student), 5 (Classes), 6 (Subjects), 7 (Teachers)
2. **Map API Endpoints** → Use table columns in each module section
3. **Create Screens** → Use screen definitions provided in each module
4. **Set Role-Based Visibility** → Use Section 1 (Roles & Permissions)
5. **Configure Navigation** → Use Section 9 (Navigation Structure)
6. **Build Workflows** → Reference Section 10 (Key Workflows)

### Example: Creating "Students List" Screen in Stitch

```
API Source: GET /students
Filters:
  - Class (from Classes list)
  - Academic Year (from Academic Years list)
  - Status (ACTIVE, INACTIVE)

Display Columns:
  - Roll Number
  - Student Name
  - Class
  - Current Academic Year
  - Enrollment Status
  - Action Buttons (View, Edit, Enroll)

Row Actions:
  - View Student Detail
  - Edit Student
  - View Enrollments
  - (ADMIN only) Promote

Permissions:
  - ADMIN: View all
  - TEACHER: View only students in their classes
  - STUDENT: View own profile only
```

---

## 18. Future Enhancements

```
Phase 2:
- Attendance tracking
- Marks/Grades management
- Report cards
- Notifications/Messaging
- File uploads (documents, photos)
- Analytics dashboards

Phase 3:
- Fee management
- Online exam system
- Learning resources
- Parent portal
- Mobile app
```
