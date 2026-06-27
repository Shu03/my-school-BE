# Frontend User Service Implementation Guide

## Overview

The User Service manages user accounts and profiles across three roles: **Admin**, **Teacher**, and **Student**. It provides endpoints for creating users, listing/searching users, updating user information, and managing account status (activation/deactivation).

---

## API Endpoints

### 1. **Create Admin**
**Endpoint:** `POST /users/admin`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "9876543210",
  "email": "john@example.com"
}
```

**Validation Rules:**
- `firstName`: 1-50 characters, required, trimmed
- `lastName`: 1-50 characters, required, trimmed
- `mobileNumber`: Valid Indian mobile number (10 digits), required, must be unique
- `email`: Valid email format (optional), max 255 characters, must be unique if provided

**Response - Success (201 Created):**
```json
{
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "mobileNumber": "9876543210",
    "email": "john@example.com",
    "role": "ADMIN",
    "isActive": true,
    "isFirstLogin": true,
    "createdAt": "2026-06-22T10:30:00Z",
    "updatedAt": "2026-06-22T10:30:00Z",
    "createdById": "admin-user-id"
  },
  "tempPassword": "aB3!xY9pQw2M"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed or mobile number already registered
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin

---

### 2. **Create Teacher**
**Endpoint:** `POST /users/teacher`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "mobileNumber": "9876543211",
  "email": "jane@example.com",
  "employeeCode": "TCH001",
  "joiningDate": "2024-01-15"
}
```

**Validation Rules:**
- `firstName`: 1-50 characters, required, trimmed
- `lastName`: 1-50 characters, required, trimmed
- `mobileNumber`: Valid Indian mobile number, required, unique
- `email`: Valid email (optional), max 255 characters, unique if provided
- `employeeCode`: 1-20 characters, required, unique across all teachers, trimmed
- `joiningDate`: ISO 8601 date format (optional), e.g., "2024-01-15"

**Response - Success (201 Created):**
```json
{
  "user": {
    "id": "teacher-user-uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "mobileNumber": "9876543211",
    "email": "jane@example.com",
    "role": "TEACHER",
    "isActive": true,
    "isFirstLogin": true,
    "createdAt": "2026-06-22T10:31:00Z",
    "updatedAt": "2026-06-22T10:31:00Z",
    "createdById": "admin-user-id",
    "teacherProfile": {
      "id": "teacher-profile-uuid",
      "userId": "teacher-user-uuid",
      "employeeCode": "TCH001",
      "joiningDate": "2024-01-15T00:00:00Z",
      "presetId": null,
      "permissionOverrides": [],
      "createdAt": "2026-06-22T10:31:00Z",
      "updatedAt": "2026-06-22T10:31:00Z"
    }
  },
  "tempPassword": "xY9pQw2MaB3!"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed, mobile/email already taken, or employee code already taken
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin

---

### 3. **Create Student**
**Endpoint:** `POST /users/student`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**Request Body:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "mobileNumber": "9876543212",
  "email": "alice@example.com",
  "admissionNumber": "ADM001",
  "dateOfBirth": "2010-05-15"
}
```

**Validation Rules:**
- `firstName`: 1-50 characters, required, trimmed
- `lastName`: 1-50 characters, required, trimmed
- `mobileNumber`: Valid Indian mobile number, required, unique
- `email`: Valid email (optional), max 255 characters, unique if provided
- `admissionNumber`: 1-20 characters, required, unique across all students, trimmed
- `dateOfBirth`: ISO 8601 date format (optional), e.g., "2010-05-15"

**Response - Success (201 Created):**
```json
{
  "user": {
    "id": "student-user-uuid",
    "firstName": "Alice",
    "lastName": "Johnson",
    "mobileNumber": "9876543212",
    "email": "alice@example.com",
    "role": "STUDENT",
    "isActive": true,
    "isFirstLogin": true,
    "createdAt": "2026-06-22T10:32:00Z",
    "updatedAt": "2026-06-22T10:32:00Z",
    "createdById": "admin-user-id",
    "studentProfile": {
      "id": "student-profile-uuid",
      "userId": "student-user-uuid",
      "admissionNumber": "ADM001",
      "dateOfBirth": "2010-05-15T00:00:00Z",
      "createdAt": "2026-06-22T10:32:00Z",
      "updatedAt": "2026-06-22T10:32:00Z"
    }
  },
  "tempPassword": "Qw2MaB3!xY9p"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed, mobile/email already taken, or admission number already taken
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin

---

### 4. **List Users**
**Endpoint:** `GET /users`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**Query Parameters:**
```
?role=ADMIN&isActive=true&search=john&page=1&limit=20
```

| Parameter | Type    | Default | Max    | Description                                     |
| --------- | ------- | ------- | ------ | ----------------------------------------------- |
| `role`    | Enum    | —       | —      | Filter by role: `ADMIN`, `TEACHER`, `STUDENT`   |
| `isActive` | Boolean | —       | —      | Filter by account status (true/false)           |
| `search`  | String  | —       | 100    | Search by firstName, lastName, or mobileNumber  |
| `page`    | Integer | 1       | —      | Page number (1-indexed)                         |
| `limit`   | Integer | 20      | 100    | Results per page                                |

**Response - Success (200 OK):**
```json
{
  "data": [
    {
      "id": "user-uuid-1",
      "firstName": "John",
      "lastName": "Doe",
      "mobileNumber": "9876543210",
      "email": "john@example.com",
      "role": "ADMIN",
      "isActive": true,
      "isFirstLogin": false,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-06-20T14:22:00Z",
      "createdById": "admin-user-id"
    },
    {
      "id": "teacher-user-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "mobileNumber": "9876543211",
      "email": "jane@example.com",
      "role": "TEACHER",
      "isActive": true,
      "isFirstLogin": false,
      "createdAt": "2026-02-10T11:45:00Z",
      "updatedAt": "2026-06-18T09:15:00Z",
      "createdById": "admin-user-id"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin

---

### 5. **Get Single User**
**Endpoint:** `GET /users/:id`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**URL Parameters:**
- `:id` (string, UUID) - User ID to retrieve

**Response - Success (200 OK):**

**Admin User:**
```json
{
  "id": "admin-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "9876543210",
  "email": "john@example.com",
  "role": "ADMIN",
  "isActive": true,
  "isFirstLogin": false,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-06-20T14:22:00Z",
  "createdById": "creator-admin-id",
  "teacherProfile": null,
  "studentProfile": null
}
```

**Teacher User:**
```json
{
  "id": "teacher-uuid",
  "firstName": "Jane",
  "lastName": "Smith",
  "mobileNumber": "9876543211",
  "email": "jane@example.com",
  "role": "TEACHER",
  "isActive": true,
  "isFirstLogin": false,
  "createdAt": "2026-02-10T11:45:00Z",
  "updatedAt": "2026-06-18T09:15:00Z",
  "createdById": "admin-uuid",
  "teacherProfile": {
    "id": "teacher-profile-uuid",
    "userId": "teacher-uuid",
    "employeeCode": "TCH001",
    "joiningDate": "2024-01-15T00:00:00Z",
    "presetId": "preset-uuid",
    "permissionOverrides": ["perm1", "perm2"],
    "createdAt": "2026-02-10T11:45:00Z",
    "updatedAt": "2026-06-18T09:15:00Z"
  },
  "studentProfile": null
}
```

**Student User:**
```json
{
  "id": "student-uuid",
  "firstName": "Alice",
  "lastName": "Johnson",
  "mobileNumber": "9876543212",
  "email": "alice@example.com",
  "role": "STUDENT",
  "isActive": true,
  "isFirstLogin": false,
  "createdAt": "2026-03-20T14:30:00Z",
  "updatedAt": "2026-06-19T16:45:00Z",
  "createdById": "admin-uuid",
  "teacherProfile": null,
  "studentProfile": {
    "id": "student-profile-uuid",
    "userId": "student-uuid",
    "admissionNumber": "ADM001",
    "dateOfBirth": "2010-05-15T00:00:00Z",
    "createdAt": "2026-03-20T14:30:00Z",
    "updatedAt": "2026-06-19T16:45:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User not found

---

### 6. **Update User**
**Endpoint:** `PATCH /users/:id`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**Request Body (all fields optional):**
```json
{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "email": "jonathan@example.com"
}
```

**Validation Rules:**
- `firstName`: 1-50 characters (optional), trimmed
- `lastName`: 1-50 characters (optional), trimmed
- `email`: Valid email format (optional), max 255 characters, unique if provided

**Response - Success (200 OK):**
```json
{
  "id": "user-uuid",
  "firstName": "Jonathan",
  "lastName": "Smith",
  "mobileNumber": "9876543210",
  "email": "jonathan@example.com",
  "role": "ADMIN",
  "isActive": true,
  "isFirstLogin": false,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-06-22T11:00:00Z",
  "createdById": "admin-user-id"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed or email already taken
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User not found

---

### 7. **Deactivate User**
**Endpoint:** `PATCH /users/:id/deactivate`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**Request Body:** (empty)

**Response - Success (200 OK):**
```json
{
  "id": "user-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "9876543210",
  "email": "john@example.com",
  "role": "ADMIN",
  "isActive": false,
  "isFirstLogin": false,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-06-22T11:30:00Z",
  "createdById": "admin-user-id"
}
```

**Side Effects:**
- Sets `isActive` to `false`
- User cannot log in (login check will return 403 Forbidden)
- All existing sessions remain until tokens expire naturally

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User not found

---

### 8. **Activate User**
**Endpoint:** `PATCH /users/:id/activate`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`  

**Request Body:** (empty)

**Response - Success (200 OK):**
```json
{
  "id": "user-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "9876543210",
  "email": "john@example.com",
  "role": "ADMIN",
  "isActive": true,
  "isFirstLogin": false,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-06-22T11:45:00Z",
  "createdById": "admin-user-id"
}
```

**Side Effects:**
- Sets `isActive` to `true`
- User can now log in

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Not an admin
- `404 Not Found`: User not found

---

## User Roles & Profiles

### Role Types

| Role    | Description | Has Profile | Profile Type |
|---------|-------------|-------------|--------------|
| ADMIN   | Administrator with full access | No | — |
| TEACHER | Teacher with class/subject assignments | Yes | TeacherProfile |
| STUDENT | Student enrolled in classes | Yes | StudentProfile |

### TeacherProfile

Extends User record for teachers with additional fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | — | Profile ID |
| `userId` | UUID | — | Link to User |
| `employeeCode` | String(20) | Yes | Unique HR employee code |
| `joiningDate` | DateTime | No | Date teacher joined |
| `presetId` | UUID | No | Reference to permission preset |
| `permissionOverrides` | String[] | — | Additional custom permissions |

**Permissions System:**
- Teachers can be assigned a **permission preset** (base permissions)
- Additional **permission overrides** can be added to the preset
- Effective permissions = preset permissions ∪ permission overrides
- Permissions are embedded in access token and used for authorization

### StudentProfile

Extends User record for students with additional fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | — | Profile ID |
| `userId` | UUID | — | Link to User |
| `admissionNumber` | String(20) | Yes | Unique school admission number |
| `dateOfBirth` | DateTime | No | Student's date of birth |

---

## User Data Model

```typescript
// Complete User with profiles
type UserWithProfiles = {
  id: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  isActive: boolean;
  isFirstLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
  resetPasswordById?: string;
  resetPasswordAt?: Date;
  teacherProfile?: {
    id: string;
    userId: string;
    employeeCode: string;
    joiningDate?: Date;
    presetId?: string;
    permissionOverrides: string[];
    createdAt: Date;
    updatedAt: Date;
  };
  studentProfile?: {
    id: string;
    userId: string;
    admissionNumber: string;
    dateOfBirth?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
};

// User without password (used in all responses)
type UserWithoutPassword = Omit<UserWithProfiles, "password">;
```

---

## Authentication & Authorization

### Access Control
- **All endpoints** require valid JWT access token in `Authorization` header
- **All endpoints** are restricted to `ADMIN` role only
- Non-admin users attempting to access User endpoints receive `403 Forbidden`

### Headers Required
```
Authorization: Bearer <accessToken>
```

### Error Handling
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User lacks required role (not ADMIN)
- `404 Not Found`: Resource not found
- `400 Bad Request`: Validation failed
- `409 Conflict`: Duplicate unique constraint (mobile, email, etc.)

---

## Temp Password Handling

When creating users, the backend generates a temporary password:

### Characteristics
- **Length:** 12 characters
- **Charset:** A-Za-z0-9!@#$%^&*
- **Example:** `aB3!xY9pQw2M`

### Frontend Responsibilities
1. Display the temp password to the admin
2. Admin shares it with the user (out-of-band, e.g., via email or SMS)
3. User logs in with temp password + mobile number
4. Backend detects `isFirstLogin: true` and returns `firstLoginToken`
5. User is prompted to change password via `/auth/change-password`

### Security Notes
- Temp password is **NOT stored** in frontend (temporary only)
- Only returned once during creation
- User must complete first-login flow to set permanent password

---

## Unique Constraints

The following fields must be unique across their respective models:

| Field | Model | Scope | Conflict Error |
|-------|-------|-------|----------------|
| `mobileNumber` | User | System-wide | "Mobile number is already registered" |
| `email` | User | System-wide (if provided) | "Email already in use" |
| `employeeCode` | TeacherProfile | Teachers only | "Employee code is already taken" |
| `admissionNumber` | StudentProfile | Students only | "Admission number is already taken" |
| `tokenHash` | RefreshToken | System-wide | (implicit) |

---

## Pagination & Filtering

### List Users Filters

**Query Example:**
```
GET /users?role=TEACHER&isActive=true&search=john&page=2&limit=50
```

**Filter Logic:**
- `role`: Exact match on user role enum
- `isActive`: Boolean flag (case-sensitive: "true" / "false" as strings)
- `search`: Case-insensitive substring match on firstName, lastName, or mobileNumber (OR logic)
- Multiple filters work with AND logic (role AND isActive AND search)

**Pagination:**
- Default page size: 20
- Max page size: 100
- Results ordered by `createdAt DESC` (newest first)

**Response Structure:**
```json
{
  "data": [...],
  "total": 245,
  "page": 2,
  "limit": 50
}
```

### Calculating Total Pages
```
totalPages = Math.ceil(total / limit)
```

---

## Frontend Implementation Checklist

### User Creation Flow
- [ ] Create form for Admin creation with: firstName, lastName, mobileNumber, email
- [ ] Create form for Teacher creation with: firstName, lastName, mobileNumber, email, employeeCode, joiningDate
- [ ] Create form for Student creation with: firstName, lastName, mobileNumber, email, admissionNumber, dateOfBirth
- [ ] Validate mobile number format (10 digits)
- [ ] Validate email format if provided
- [ ] Display temp password after successful creation
- [ ] Copy temp password to clipboard functionality
- [ ] Show UI to share password with new user
- [ ] Handle duplicate field errors gracefully

### User List & Search
- [ ] Implement paginated user list with default page size 20
- [ ] Add filter by role (ADMIN, TEACHER, STUDENT)
- [ ] Add filter by status (Active/Inactive)
- [ ] Add search box (queries firstName, lastName, mobileNumber)
- [ ] Implement pagination controls (prev/next, page jumps)
- [ ] Show total count and current page info
- [ ] Add sort by created date (newest first)

### User Profile Management
- [ ] Fetch single user with full profiles (`GET /users/:id`)
- [ ] Display teacher-specific profile info (employeeCode, joiningDate, permissions)
- [ ] Display student-specific profile info (admissionNumber, dateOfBirth)
- [ ] Show user creation metadata (createdAt, createdBy)
- [ ] Show password reset audit info (resetPasswordBy, resetPasswordAt)

### User Editing
- [ ] Edit firstName, lastName, email
- [ ] Validate input before submission
- [ ] Handle email uniqueness errors
- [ ] Show success/error messages
- [ ] Optionally refresh user list after update

### User Deactivation/Activation
- [ ] Show deactivate option in user menu
- [ ] Confirm before deactivation (prevent accidental disables)
- [ ] Update UI to show inactive users differently (greyed out, badge)
- [ ] Show activate option for inactive users
- [ ] Note: Inactive users cannot log in

### Error Handling
- `400 Bad Request`: Show validation error messages
- `409 Conflict`: "This mobile number/email/code is already in use"
- `404 Not Found`: "User not found"
- `403 Forbidden`: "You don't have permission to perform this action"

---

## Common Scenarios

### Scenario 1: Admin creates a new teacher
1. Admin fills teacher creation form
2. Frontend validates fields
3. Frontend calls `POST /users/teacher`
4. Backend returns user with temp password
5. Frontend displays temp password
6. Admin shares password with teacher (out-of-band)
7. Teacher logs in with mobile + temp password
8. Backend returns `firstLoginToken` (because `isFirstLogin: true`)
9. Teacher is forced to change password via `/auth/change-password`
10. Teacher can now access the app

### Scenario 2: Admin searches for teachers by name
1. Admin enters search term in user list filter
2. Frontend calls `GET /users?role=TEACHER&search=john&page=1`
3. Backend returns matching users (case-insensitive substring search)
4. Frontend displays paginated results

### Scenario 3: Admin temporarily disables a user
1. Admin clicks "Deactivate" on user row
2. Frontend shows confirmation dialog
3. Admin confirms
4. Frontend calls `PATCH /users/:id/deactivate`
5. User's `isActive` becomes `false`
6. User cannot log in (login endpoint returns 403 Forbidden)
7. Existing sessions continue until tokens expire
8. Frontend shows user as "Inactive" in list
9. Admin can reactivate user later via `PATCH /users/:id/activate`

### Scenario 4: View complete teacher profile with permissions
1. Admin clicks on teacher in list
2. Frontend calls `GET /users/:teacherId`
3. Response includes full `teacherProfile` with:
   - employeeCode
   - joiningDate
   - presetId (permission preset reference)
   - permissionOverrides (additional permissions)
4. Frontend displays all teacher details

---

## API Error Codes Reference

| Status | Code | Meaning | Action |
|--------|------|---------|--------|
| 200 | OK | Success | Proceed normally |
| 201 | Created | Resource created | Show success message |
| 400 | Bad Request | Validation failed | Show error details to user |
| 401 | Unauthorized | Missing/invalid token | Redirect to login |
| 403 | Forbidden | Insufficient permissions | Show "access denied" message |
| 404 | Not Found | Resource doesn't exist | Show "not found" error |
| 409 | Conflict | Duplicate unique field | Show "already exists" error |
| 500 | Server Error | Backend error | Show generic error, contact support |

---

## Validation Rules Summary

### Mobile Number
- Pattern: Valid Indian mobile number (10 digits starting with specific prefixes)
- Unique: Yes (system-wide)
- Required: Yes

### Email
- Pattern: Valid email format
- Unique: Yes (if provided)
- Required: No

### Names (firstName, lastName)
- Length: 1-50 characters
- Required: Yes
- Trimmed: Yes

### Employee Code
- Length: 1-20 characters
- Unique: Yes (among teachers only)
- Required: Yes (for teachers)
- Trimmed: Yes

### Admission Number
- Length: 1-20 characters
- Unique: Yes (among students only)
- Required: Yes (for students)
- Trimmed: Yes

### Dates
- Format: ISO 8601 (YYYY-MM-DD)
- Required: No (for both joining and birth dates)
- Timezone: UTC

---

## Example Frontend Code (TypeScript/React)

### Create Teacher
```typescript
const createTeacher = async (data: CreateTeacherDto) => {
  const response = await fetch(`${API_URL}/users/teacher`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const result = await response.json();
  // Display temp password to admin
  showTempPassword(result.tempPassword);
  return result.user;
};
```

### List Users with Pagination
```typescript
const fetchUsers = async (
  page: number = 1,
  limit: number = 20,
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT',
  search?: string
) => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (role) params.append('role', role);
  if (search) params.append('search', search);
  
  const response = await fetch(`${API_URL}/users?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const result = await response.json();
  return {
    users: result.data,
    total: result.total,
    currentPage: result.page,
    pageSize: result.limit
  };
};
```

### Deactivate User
```typescript
const deactivateUser = async (userId: string) => {
  const confirmed = await showConfirmDialog(
    'Deactivate User?',
    'This user will not be able to log in.'
  );
  
  if (!confirmed) return;
  
  const response = await fetch(`${API_URL}/users/${userId}/deactivate`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const result = await response.json();
  return result;
};
```

---

## Admin Dashboard Integration Tips

### User Management Table
- Display columns: Name, Mobile, Role, Status (Active/Inactive), Created At
- Sortable by Created At (default: newest first)
- Show action buttons: View, Edit, Deactivate/Activate
- Implement bulk actions (optional): Select multiple, deactivate all

### Quick Stats (Dashboard)
```typescript
// Fetch from list endpoint with different filters
const totalUsers = await fetchUsers(1, 1); // Just get count
const activeAdmins = await fetchUsers(1, 1, 'ADMIN', isActive=true);
const activeTeachers = await fetchUsers(1, 1, 'TEACHER', isActive=true);
const activeStudents = await fetchUsers(1, 1, 'STUDENT', isActive=true);
```

### Bulk User Import (Future Enhancement)
- Could batch create users via CSV
- Still uses same endpoint, just multiple POST requests
- Show progress bar
- Handle partial failures

---

## Performance Considerations

### Pagination
- Default page size 20 is reasonable
- Use pagination for large lists (don't fetch all users at once)
- Implement lazy loading or infinite scroll if needed

### Filtering
- Backend does filtering (not frontend filtering of all users)
- Filters are applied efficiently at database level
- Keep list query parameters in URL for deep linking

### Caching
- Optionally cache user list locally (with stale time)
- Invalidate cache after create/update/deactivate operations
- Consider using React Query or similar for automatic cache management

---

## Related Services

- **Auth Service** (`docs/FRONTEND_AUTH_GUIDE.md`): Login, token refresh, password change
- **Teacher Management** (`docs/` - if exists): Teacher-specific operations (permissions, assignments)
- **Student Management** (`docs/` - if exists): Student-specific operations (enrollments, grades)

---

## Support & Questions

For API documentation and endpoint details, refer to:
- Swagger/OpenAPI: `http://localhost:3000/docs`
- Backend Docs: `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`
