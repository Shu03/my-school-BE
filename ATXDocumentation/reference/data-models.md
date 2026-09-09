# Data Models

## Entity Relationship Overview

```
User ──────────┬─── TeacherProfile ──── TeacherClassAssignment ──── Section
               │         │                                            │
               │         ├── PermissionPreset                         │
               │         ├── Attendance (markedBy)                    │
               │         ├── Exam (createdBy)                         │
               │         ├── Grade (gradedBy)                         │
               │         └── Homework (createdBy)                     │
               │                                                      │
               ├─── StudentProfile ──── StudentEnrollment ────────── Section
               │         │                                            │
               │         ├── Attendance                     AcademicYear
               │         ├── Grade                              │
               │         └── FeeRecord ── FeePayment            ├── Term
               │                                                ├── Section
               ├─── RefreshToken                                ├── Holiday
               ├─── Announcement (createdBy)                    ├── Exam
               └─── FeePayment (recordedBy)                     └── FeeStructure

Subject ──── ExamSubject ──── Grade
         └── TeacherClassAssignment
         └── Homework
```

## Models by Domain

### User Domain

#### User (`users`)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Auto-generated |
| mobileNumber | String | UNIQUE | Indian mobile number |
| password | String | — | bcrypt hash (12 rounds) |
| firstName | String | — | Max 50 chars |
| lastName | String | — | Max 50 chars |
| email | String? | UNIQUE | Optional email |
| role | Role | — | ADMIN, TEACHER, STUDENT |
| isActive | Boolean | DEFAULT true | Account status |
| isFirstLogin | Boolean | DEFAULT true | Forces password change |
| createdById | String? | FK→User | Who created this user |
| resetPasswordById | String? | FK→User | Last admin who reset password |
| resetPasswordAt | DateTime? | — | Last password reset time |

#### RefreshToken (`refresh_tokens`)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | — |
| userId | String | FK→User, INDEX | Token owner |
| tokenHash | String | UNIQUE | SHA-256 hash of JWT |
| family | String | INDEX | Token family for reuse detection |
| isRevoked | Boolean | DEFAULT false | Revocation status |
| expiresAt | DateTime | — | Token expiry |

### Academic Domain

#### AcademicYear (`academic_years`)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | — |
| name | String | UNIQUE | e.g., "2026-2027" |
| startDate | DateTime | — | Year start |
| endDate | DateTime | — | Year end |
| isCurrent | Boolean | DEFAULT false | Only one current at a time |

#### Term (`terms`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | String | UNIQUE[name, academicYearId] |
| startDate | DateTime | Within academic year bounds |
| endDate | DateTime | Within academic year bounds, no overlap |
| academicYearId | String | FK→AcademicYear (CASCADE), INDEX |

#### Section (`sections`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | String | UNIQUE[name, academicYearId] |
| classLevel | Int | INDEX[classLevel, academicYearId] |
| academicYearId | String | FK→AcademicYear, INDEX |

#### Subject (`subjects`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | String | UNIQUE[name, classLevel] |
| code | String | UNIQUE[code, classLevel], uppercase |
| classLevel | Int | INDEX |
| description | String? | — |

#### Holiday (`holidays`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | String | — |
| date | Date | UNIQUE[date, academicYearId] |
| academicYearId | String | FK→AcademicYear (CASCADE), INDEX |

### Student Domain

#### StudentProfile (`student_profiles`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | String | UNIQUE, FK→User (CASCADE) |
| admissionNumber | String | UNIQUE |
| dateOfBirth | DateTime? | — |

#### StudentEnrollment (`student_enrollments`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| studentId | String | FK→StudentProfile (CASCADE), UNIQUE[studentId, academicYearId], INDEX |
| sectionId | String | INDEX[sectionId, academicYearId] |
| academicYearId | String | FK→AcademicYear |
| rollNumber | String | Auto-generated or manual |
| status | EnrollmentStatus | DEFAULT ACTIVE |

### Teacher Domain

#### TeacherProfile (`teacher_profiles`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | String | UNIQUE, FK→User (CASCADE) |
| employeeCode | String | UNIQUE |
| joiningDate | DateTime? | — |
| presetId | String? | FK→PermissionPreset |
| permissionOverrides | String[] | Additive to preset permissions |

#### PermissionPreset (`permission_presets`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | String | UNIQUE |
| permissions | String[] | Array of Permission constants |

#### TeacherClassAssignment (`teacher_class_assignments`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| teacherId | String | FK→TeacherProfile (CASCADE), INDEX, UNIQUE[teacherId, sectionId, subjectId] |
| sectionId | String | FK→Section (CASCADE), INDEX |
| subjectId | String? | FK→Subject |
| role | TeacherClassRole | CLASS_TEACHER or SUBJECT_TEACHER |

### Exam Domain

#### Exam (`exams`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | String | — |
| type | ExamType | UNIT_TEST, MID_TERM, FINAL_EXAM, etc. |
| sectionId | String | INDEX[sectionId, academicYearId] |
| academicYearId | String | FK→AcademicYear |
| termId | String? | FK→Term |
| isFinalized | Boolean | DEFAULT false |
| status | ExamStatus | DEFAULT ACTIVE |
| createdById | String? | FK→TeacherProfile |

#### ExamSubject (`exam_subjects`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| examId | String | FK→Exam (CASCADE), UNIQUE[examId, subjectId] |
| subjectId | String | FK→Subject, INDEX |
| totalMarks | Float | 1-1000 |
| date | Date | — |

#### Grade (`grades`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| examSubjectId | String | FK→ExamSubject (CASCADE), UNIQUE[examSubjectId, studentId], INDEX |
| studentId | String | FK→StudentProfile (CASCADE), INDEX |
| marksObtained | Float | 0 to totalMarks |
| remarks | String? | Max 500 chars |
| gradedById | String? | FK→TeacherProfile |

### Fee Domain

#### FeeStructure (`fee_structures`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| classLevel | Int | UNIQUE[classLevel, academicYearId] |
| academicYearId | String | FK→AcademicYear, INDEX |
| totalAmount | Float | Min 1 |
| dueDate | Date | — |

#### FeeRecord (`fee_records`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| studentId | String | FK→StudentProfile (CASCADE), UNIQUE[studentId, academicYearId], INDEX |
| academicYearId | String | FK→AcademicYear, INDEX |
| feeStructureId | String | FK→FeeStructure |
| totalAmount | Float | Copied from structure at creation |
| status | FeeRecordStatus | DEFAULT PENDING |

#### FeePayment (`fee_payments`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| feeRecordId | String | FK→FeeRecord (CASCADE), INDEX |
| amount | Float | Min 0.01 |
| paidOn | Date | — |
| note | String? | Max 500 chars |
| recordedById | String? | FK→User |

### Other Models

#### SchoolSettings (`school_settings`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK (singleton) |
| weeklyOffDays | Int[] | Day numbers (0=Sun, 6=Sat) |

#### Attendance (`attendance`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| studentId | String | FK→StudentProfile (CASCADE), UNIQUE[studentId, date, periodId] |
| sectionId | String | INDEX[sectionId, date] |
| academicYearId | String | INDEX[studentId, academicYearId] |
| date | Date | — |
| status | AttendanceStatus | PRESENT or ABSENT |
| markedById | String? | FK→TeacherProfile |
| periodId | String? | Currently unused (reserved for period-wise attendance) |

#### Announcement (`announcements`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| title | String | Max 200 |
| content | String | Max 5000 |
| startDate | DateTime | Display start |
| endDate | DateTime | Display end |
| createdById | String? | FK→User |

#### Homework (`homework`)
| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| title | String | Max 200 |
| description | String | Max 2000 |
| sectionId | String | INDEX[sectionId, academicYearId] |
| subjectId | String | INDEX |
| academicYearId | String | FK→AcademicYear |
| dueDate | Date | INDEX |
| createdById | String? | FK→TeacherProfile |
