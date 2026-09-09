# Database Schemas and Query Patterns

## PostgreSQL Schema

### Tables (20)

| Table | Domain | Rows (expected) | Key Indexes |
|-------|--------|-----------------|-------------|
| users | User | Low (admin+teachers+students) | mobileNumber (unique), email (unique) |
| refresh_tokens | Auth | Medium (per-session) | tokenHash (unique), userId, family |
| school_settings | School | 1 (singleton) | PK only |
| permission_presets | Teacher | Low (few presets) | name (unique) |
| teacher_profiles | Teacher | Low-Medium | userId (unique), employeeCode (unique) |
| teacher_class_assignments | Teacher | Medium | [teacherId,sectionId,subjectId] (unique), sectionId, teacherId |
| student_profiles | Student | Medium-High | userId (unique), admissionNumber (unique) |
| student_enrollments | Student | High (per-student-per-year) | [studentId,academicYearId] (unique), [sectionId,academicYearId], studentId |
| academic_years | Academic | Low (one per year) | name (unique) |
| terms | Academic | Low | [name,academicYearId] (unique), academicYearId |
| sections | Academic | Low-Medium | [name,academicYearId] (unique), academicYearId, [classLevel,academicYearId] |
| subjects | Academic | Medium | [name,classLevel] (unique), [code,classLevel] (unique), classLevel |
| holidays | Academic | Low-Medium | [date,academicYearId] (unique), academicYearId |
| attendance | Operations | Very High | [studentId,date,periodId] (unique), [sectionId,date], [studentId,academicYearId] |
| exams | Operations | Medium | [sectionId,academicYearId] |
| exam_subjects | Operations | Medium | [examId,subjectId] (unique), subjectId |
| grades | Operations | Very High | [examSubjectId,studentId] (unique), studentId, examSubjectId |
| fee_structures | Finance | Low | [classLevel,academicYearId] (unique), academicYearId |
| fee_records | Finance | High | [studentId,academicYearId] (unique), academicYearId, studentId |
| fee_payments | Finance | High | feeRecordId |
| announcements | Communication | Low-Medium | createdAt |
| homework | Operations | Medium | [sectionId,academicYearId], subjectId, dueDate |

## Common Query Patterns

### Attendance Summary (Most Complex Query)
```
1. Get SchoolSettings (weeklyOffDays)
2. Get holidays for academic year + month range
3. Calculate working days in month
4. Get all attendance records for section + month
5. Group by studentId, count PRESENT/ABSENT
6. Calculate percentage per student
```
**Performance note**: No aggregate query — calculates in application code. For large sections (50+ students × 30 days), this processes 1500+ rows.

### Role-Scoped Student List
```
ADMIN: SELECT * FROM student_profiles JOIN users
TEACHER: SELECT * WHERE sectionId IN (
    SELECT sectionId FROM teacher_class_assignments WHERE teacherId = ?
)
STUDENT: SELECT * WHERE userId = ?
```

### Fee Status Recalculation
```
1. SELECT SUM(amount) FROM fee_payments WHERE feeRecordId = ?
2. Compare sum vs totalAmount
3. UPDATE fee_records SET status = PENDING|PARTIAL|PAID
```

### Token Rotation (Transaction)
```sql
BEGIN;
  UPDATE refresh_tokens SET isRevoked = true WHERE tokenHash = ?;
  INSERT INTO refresh_tokens (userId, tokenHash, family, expiresAt) VALUES (...);
COMMIT;
```

## Index Effectiveness

### Well-Indexed Queries
- Attendance lookup by `[sectionId, date]` — direct index hit
- Student enrollment by `[studentId, academicYearId]` — unique index
- Grade lookup by `[examSubjectId, studentId]` — unique index
- Refresh token by `tokenHash` — unique index

### Potentially Under-Indexed
- `announcements` — only indexed on `createdAt`. Queries by `startDate`/`endDate` range for active announcements lack an index.
- `attendance` filtering by `academicYearId` alone — no single-column index (only compound `[studentId, academicYearId]`).
- **INFERENCE**: For the current school-scale (hundreds of students, not thousands), these missing indexes are unlikely to cause performance issues.

## Data Volume Estimates (per academic year)

| Entity | Estimated Records | Growth Rate |
|--------|-------------------|-------------|
| Users | 500-2000 | Low (per school) |
| Student Enrollments | 500-1500 | Per year |
| Attendance Records | 50,000-150,000 | Daily per student |
| Grades | 5,000-50,000 | Per exam per student |
| Fee Records | 500-1500 | Per student per year |
| Fee Payments | 1,000-5,000 | Multiple per record |

**INFERENCE**: PostgreSQL handles these volumes comfortably. No sharding or read replicas needed at this scale.
