# API Reference

All endpoints are prefixed with `/api/v1`. Authentication is required unless marked `@Public`.

## Auth (`/api/v1/auth`)

| Method | Path | Auth | Rate Limit | Request Body | Success Response |
|--------|------|------|------------|-------------|-----------------|
| POST | `/login` | Public | 5/60s | `{ mobileNumber, password }` | `LoginResponse \| FirstLoginResponse` |
| POST | `/refresh` | Public | 10/60s | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/logout` | Bearer JWT | — | — | `{ message: "Logged out" }` |
| POST | `/change-password` | JwtChangePasswordGuard | — | `{ currentPassword?, newPassword }` | `{ accessToken, refreshToken }` |
| POST | `/admin/reset-password` | ADMIN | — | `{ userId }` | `{ tempPassword }` |
| GET | `/me` | Bearer JWT | — | — | `UserWithProfiles` |

## Users (`/api/v1/users`) — ADMIN only

| Method | Path | Request Body | Success Response |
|--------|------|-------------|-----------------|
| POST | `/admin` | `{ firstName, lastName, mobileNumber, email? }` | `{ user, tempPassword }` |
| POST | `/teacher` | `{ firstName, lastName, mobileNumber, email?, employeeCode, joiningDate? }` | `{ user, tempPassword }` |
| POST | `/student` | `{ firstName, lastName, mobileNumber, email?, admissionNumber, dateOfBirth? }` | `{ user, tempPassword }` |
| GET | `/` | Query: `{ role?, isActive?, search?, page?, limit? }` | `Paginated<UserWithoutPassword>` |
| GET | `/:id` | — | `UserWithProfiles` |
| PATCH | `/:id` | `{ firstName?, lastName?, email? }` | `UserWithoutPassword` |
| PATCH | `/:id/deactivate` | — | `UserWithoutPassword` |
| PATCH | `/:id/activate` | — | `UserWithoutPassword` |

## Academic Years (`/api/v1/academic-years`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/` | ADMIN, TEACHER | ACADEMIC_YEAR_MANAGE | `{ name, startDate, endDate, copyClassStructureFromCurrent? }` | `AcademicYearBasic` |
| GET | `/` | ADMIN, TEACHER | ACADEMIC_YEAR_MANAGE | — | `AcademicYearBasic[]` |
| GET | `/current` | Any auth | — | — | `AcademicYearWithTerms` |
| GET | `/:id` | ADMIN, TEACHER | ACADEMIC_YEAR_MANAGE | — | `AcademicYearWithTerms` |
| PATCH | `/:id` | ADMIN, TEACHER | ACADEMIC_YEAR_MANAGE | `{ name?, startDate?, endDate? }` | `AcademicYearBasic` |
| PATCH | `/:id/set-current` | ADMIN | — | — | `AcademicYearBasic` |
| POST | `/:id/terms` | ADMIN, TEACHER | ACADEMIC_YEAR_MANAGE | `{ name, startDate, endDate }` | `TermBasic` |
| GET | `/:id/terms` | Any auth | — | — | `TermBasic[]` |
| PATCH | `/:id/terms/:termId` | ADMIN, TEACHER | ACADEMIC_YEAR_MANAGE | `{ name?, startDate?, endDate? }` | `TermBasic` |
| DELETE | `/:id/terms/:termId` | ADMIN | — | — | `TermBasic` |

## Sections (`/api/v1/sections`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/` | ADMIN, TEACHER | SECTION_MANAGE | `{ name, classLevel, academicYearId? }` | `SectionBasic` |
| GET | `/` | Any auth | — | Query: `{ academicYearId?, classLevel? }` | `SectionBasic[]` |
| GET | `/:id` | Any auth | — | — | `SectionWithRelations` |
| PATCH | `/:id` | ADMIN, TEACHER | SECTION_MANAGE | `{ name?, classLevel? }` | `SectionBasic` |

## Subjects (`/api/v1/subjects`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/` | ADMIN, TEACHER | SUBJECT_MANAGE | `{ name, code, classLevel, description? }` | `SubjectBasic` |
| GET | `/` | Any auth | — | Query: `{ classLevel?, search? }` | `SubjectBasic[]` |
| GET | `/:id` | Any auth | — | — | `SubjectWithAssignments` |
| PATCH | `/:id` | ADMIN, TEACHER | SUBJECT_MANAGE | `{ name?, code?, description? }` | `SubjectBasic` |
| DELETE | `/:id` | ADMIN | — | — | `SubjectBasic` |

## Teachers (`/api/v1/teachers`)

| Method | Path | Roles | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/` | ADMIN | — | `TeacherProfileBasic[]` |
| GET | `/:id` | ADMIN, TEACHER | — | `TeacherProfileWithAssignments` |
| PATCH | `/:id` | ADMIN | `{ employeeCode?, joiningDate? }` | `TeacherProfileBasic` |
| PATCH | `/:id/assign-preset` | ADMIN | `{ presetId }` | `TeacherProfileBasic` |
| PATCH | `/:id/remove-preset` | ADMIN | — | `TeacherProfileBasic` |
| PATCH | `/:id/permissions` | ADMIN | `{ permissionOverrides: Permission[] }` | `TeacherProfileBasic` |
| POST | `/:id/assignments` | ADMIN | `{ sectionId, role, subjectId? }` | `AssignmentBasic` |
| GET | `/:id/assignments` | ADMIN, TEACHER | — | `AssignmentBasic[]` |
| DELETE | `/:id/assignments/:assignmentId` | ADMIN | — | `AssignmentBasic` |
| POST | `/presets` | ADMIN | `{ name, permissions[] }` | `PresetBasic` |
| GET | `/presets` | ADMIN | — | `PresetBasic[]` |
| GET | `/presets/:presetId` | ADMIN | — | `PresetBasic` |
| PATCH | `/presets/:presetId` | ADMIN | `{ name?, permissions[]? }` | `PresetBasic` |
| DELETE | `/presets/:presetId` | ADMIN | — | `PresetBasic` |

## Students (`/api/v1/students`)

| Method | Path | Roles | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/` | ADMIN, TEACHER, STUDENT | Query: `{ sectionId?, academicYearId?, search?, page?, limit? }` | `Paginated<StudentBasic>` |
| GET | `/:id` | ADMIN, TEACHER, STUDENT | — | `StudentWithEnrollment` |
| PATCH | `/:id` | ADMIN | `{ dateOfBirth?, admissionNumber? }` | `StudentBasic` |
| POST | `/:id/enroll` | ADMIN | `{ sectionId, academicYearId?, rollNumber? }` | `EnrollmentBasic` |
| GET | `/:id/enrollments` | ADMIN, STUDENT | — | `EnrollmentBasic[]` |
| PATCH | `/:id/enrollments/:enrollmentId` | ADMIN | `{ status?, rollNumber? }` | `EnrollmentBasic` |
| POST | `/promote` | ADMIN | `{ studentIds[], targetSectionId, academicYearId? }` | `PromotionResult` |

## Attendance (`/api/v1/attendance`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/mark` | ADMIN, TEACHER | ATTENDANCE_WRITE | `{ sectionId, date, records: [{studentId, status}] }` | `BulkMarkResult` |
| GET | `/` | ADMIN | ATTENDANCE_READ | Query: `{ sectionId, date }` | `AttendanceRecord[]` |
| GET | `/student/:studentId` | ALL | — | Query: `{ academicYearId?, startDate?, endDate? }` | `AttendanceRecord[]` |
| GET | `/summary` | ADMIN | ATTENDANCE_READ | Query: `{ sectionId, month }` | `AttendanceSummaryItem[]` |

## Exams (`/api/v1/exams`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/` | ADMIN, TEACHER | GRADES_WRITE | `{ name, type, sectionId, subjects[], ... }` | `ExamBasic` |
| GET | `/` | ALL | — | Query: `{ sectionId?, type?, status?, page?, limit? }` | `Paginated<ExamBasic>` |
| GET | `/:id` | ALL | — | — | `ExamWithSummary` |
| PATCH | `/:id` | ADMIN, TEACHER | GRADES_WRITE | `{ name?, type?, termId? }` | `ExamBasic` |
| POST | `/:id/subjects` | ADMIN, TEACHER | GRADES_WRITE | `{ subjectId, totalMarks, date }` | `ExamSubjectBasic` |
| PATCH | `/:id/subjects/:subjectId` | ADMIN, TEACHER | GRADES_WRITE | `{ totalMarks?, date? }` | `ExamSubjectBasic` |
| DELETE | `/:id/subjects/:subjectId` | ADMIN, TEACHER | GRADES_WRITE | — | — |
| POST | `/:id/finalize` | ADMIN, TEACHER | GRADES_WRITE | — | `ExamBasic` |
| POST | `/:id/unlock` | ADMIN | — | — | `ExamBasic` |
| POST | `/:id/discard` | ADMIN | — | — | `ExamBasic` |

## Grades (`/api/v1/exams/:examId/subjects/:subjectId/grades` + `/api/v1/grades/...`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/exams/:examId/subjects/:subjectId/grades` | ADMIN, TEACHER | GRADES_WRITE | `{ records: [{studentId, marksObtained, remarks?}] }` | `BulkGradeResult` |
| GET | `/exams/:examId/subjects/:subjectId/grades` | ALL | — | — | `GradeBasic[]` |
| GET | `/exams/:examId/subjects/:subjectId/grades/summary` | ADMIN, TEACHER | GRADES_READ | — | `ExamGradesSummary` |
| GET | `/grades/student/:studentId` | ALL | — | Query: `{ academicYearId?, subjectId? }` | `StudentGradeHistory` |

## Fees (`/api/v1/fees`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/structures` | ADMIN, TEACHER | FEES_MANAGE | `{ classLevel, totalAmount, dueDate, ... }` | `FeeStructureBasic` |
| GET | `/structures` | ADMIN, TEACHER | FEES_MANAGE | Query: `{ academicYearId? }` | `FeeStructureBasic[]` |
| PATCH | `/structures/:id` | ADMIN, TEACHER | FEES_MANAGE | `{ totalAmount?, dueDate? }` | `FeeStructureBasic` |
| POST | `/backfill` | ADMIN, TEACHER | FEES_MANAGE | `{ academicYearId? }` | `BackfillResult` |
| GET | `/records` | ALL | — | Query: `{ sectionId?, academicYearId?, status? }` | `FeeRecordBasic[]` |
| GET | `/records/:id` | ALL | — | — | `FeeRecordWithPayments` |
| POST | `/records/:id/payments` | ADMIN, TEACHER | FEES_MANAGE | `{ amount, paidOn, note? }` | `FeePaymentBasic` |
| GET | `/records/:id/payments` | ALL | — | — | `FeePaymentBasic[]` |
| GET | `/student/:studentId` | ALL | — | — | `FeeRecordBasic[]` |

## Homework (`/api/v1/homework`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/` | ADMIN, TEACHER | HOMEWORK_MANAGE | `{ title, description, sectionId, subjectId, dueDate, ... }` | `HomeworkBasic` |
| GET | `/` | ALL | — | Query: `{ sectionId?, subjectId?, academicYearId? }` | `HomeworkBasic[]` |
| GET | `/:id` | ALL | — | — | `HomeworkBasic` |
| PATCH | `/:id` | ADMIN, TEACHER | HOMEWORK_MANAGE | `{ title?, description?, dueDate? }` | `HomeworkBasic` |
| DELETE | `/:id` | ADMIN, TEACHER | HOMEWORK_MANAGE | — | — |

## Announcements (`/api/v1/announcements`)

| Method | Path | Roles | Permissions | Request | Response |
|--------|------|-------|-------------|---------|----------|
| POST | `/` | ADMIN, TEACHER | ANNOUNCEMENTS_MANAGE | `{ title, content, startDate, endDate }` | `AnnouncementBasic` |
| GET | `/` | ALL | — | Query: `{ page?, limit? }` | `Paginated<AnnouncementBasic>` |
| GET | `/:id` | ALL | — | — | `AnnouncementBasic` |
| PATCH | `/:id` | ADMIN, TEACHER | ANNOUNCEMENTS_MANAGE | `{ title?, content?, startDate?, endDate? }` | `AnnouncementBasic` |
| DELETE | `/:id` | ADMIN, TEACHER | ANNOUNCEMENTS_MANAGE | — | — |

## School (`/api/v1/school`)

| Method | Path | Roles | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/settings` | ADMIN | — | `SchoolSettingsBasic` |
| PATCH | `/settings` | ADMIN | `{ weeklyOffDays: int[] }` | `SchoolSettingsBasic` |
| POST | `/holidays` | ADMIN | `{ name, date, academicYearId }` | `HolidayBasic` |
| GET | `/holidays` | Any auth | Query: `{ academicYearId? }` | `HolidayBasic[]` |
| DELETE | `/holidays/:id` | ADMIN | — | — |

## Health (`/api/v1/health`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/` | Public | `{ status: "ok", info: { prisma: { status: "up" } } }` |
