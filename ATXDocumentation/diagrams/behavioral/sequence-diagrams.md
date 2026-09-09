# Behavioral Diagrams

## Authentication Flow — Login

```
Client                    AuthController           AuthService              UsersService           PrismaService
  │                            │                        │                       │                       │
  │  POST /auth/login          │                        │                       │                       │
  │  {mobileNumber, password}  │                        │                       │                       │
  │───────────────────────────>│                        │                       │                       │
  │                            │  login(dto)            │                       │                       │
  │                            │───────────────────────>│                       │                       │
  │                            │                        │  findByMobile()       │                       │
  │                            │                        │──────────────────────>│                       │
  │                            │                        │                       │  user.findUnique()    │
  │                            │                        │                       │──────────────────────>│
  │                            │                        │                       │<──────────────────────│
  │                            │                        │<──────────────────────│                       │
  │                            │                        │                       │                       │
  │                            │                        │  comparePassword()    │                       │
  │                            │                        │  (bcrypt)             │                       │
  │                            │                        │                       │                       │
  │                            │                        │  [if isFirstLogin]    │                       │
  │                            │                        │  return firstLoginToken│                      │
  │                            │                        │                       │                       │
  │                            │                        │  [if !isFirstLogin]   │                       │
  │                            │                        │  checkSessionLimit()  │                       │
  │                            │                        │  issueAccessToken()   │                       │
  │                            │                        │  issueRefreshToken()  │                       │
  │                            │                        │  storeRefreshToken()  │                       │
  │                            │                        │──────────────────────────────────────────────>│
  │                            │<───────────────────────│                       │                       │
  │  { accessToken,            │                        │                       │                       │
  │    refreshToken, user }    │                        │                       │                       │
  │<───────────────────────────│                        │                       │                       │
```

## Token Refresh with Reuse Detection

```
Client                    AuthController           AuthService              PrismaService
  │                            │                        │                       │
  │  POST /auth/refresh        │                        │                       │
  │  { refreshToken }          │                        │                       │
  │───────────────────────────>│                        │                       │
  │                            │  refresh(dto)          │                       │
  │                            │───────────────────────>│                       │
  │                            │                        │  jwt.verify(token)    │
  │                            │                        │  hashToken(SHA-256)   │
  │                            │                        │                       │
  │                            │                        │  findByTokenHash()    │
  │                            │                        │──────────────────────>│
  │                            │                        │                       │
  │                            │                        │  [if revoked → REUSE DETECTED]
  │                            │                        │  revokeAllInFamily()  │
  │                            │                        │──────────────────────>│
  │                            │                        │  throw Unauthorized   │
  │                            │                        │                       │
  │                            │                        │  [if valid]           │
  │                            │                        │  $transaction:        │
  │                            │                        │    revokeOldToken     │
  │                            │                        │    createNewToken     │
  │                            │                        │──────────────────────>│
  │                            │                        │                       │
  │                            │                        │  issueNewTokenPair()  │
  │                            │<───────────────────────│                       │
  │  { accessToken,            │                        │                       │
  │    refreshToken }          │                        │                       │
  │<───────────────────────────│                        │                       │
```

## Attendance Marking Flow

```
Teacher                AttendanceController    AttendanceService      SchoolService     AcademicYearsService
  │                          │                       │                     │                    │
  │  POST /attendance/mark   │                       │                     │                    │
  │  {sectionId, date,       │                       │                     │                    │
  │   records[]}             │                       │                     │                    │
  │─────────────────────────>│                       │                     │                    │
  │                          │  mark(dto, user)      │                     │                    │
  │                          │──────────────────────>│                     │                    │
  │                          │                       │  findCurrent()      │                    │
  │                          │                       │────────────────────────────────────────>│
  │                          │                       │<────────────────────────────────────────│
  │                          │                       │                     │                    │
  │                          │                       │  isSchoolDay(date)  │                    │
  │                          │                       │────────────────────>│                    │
  │                          │                       │  check weeklyOff    │                    │
  │                          │                       │  check holidays     │                    │
  │                          │                       │<────────────────────│                    │
  │                          │                       │                     │                    │
  │                          │                       │  validateTeacher()  │                    │
  │                          │                       │  validateStudents() │                    │
  │                          │                       │                     │                    │
  │                          │                       │  $transaction:      │                    │
  │                          │                       │    deleteMany()     │                    │
  │                          │                       │    createMany()     │                    │
  │                          │<──────────────────────│                     │                    │
  │  { marked, date,         │                       │                     │                    │
  │    sectionId }           │                       │                     │                    │
  │<─────────────────────────│                       │                     │                    │
```

## Student Enrollment + Fee Generation

```
Admin                StudentsController     StudentsService         SectionsService      FeesService
  │                        │                      │                       │                    │
  │  POST /students/:id/   │                      │                       │                    │
  │  enroll                │                      │                       │                    │
  │  {sectionId}           │                      │                       │                    │
  │───────────────────────>│                      │                       │                    │
  │                        │  enroll(id, dto)     │                       │                    │
  │                        │─────────────────────>│                       │                    │
  │                        │                      │  findOne(sectionId)   │                    │
  │                        │                      │──────────────────────>│                    │
  │                        │                      │<──────────────────────│                    │
  │                        │                      │                       │                    │
  │                        │                      │  generateRollNumber() │                    │
  │                        │                      │  createEnrollment()   │                    │
  │                        │                      │                       │                    │
  │                        │                      │  generateFeeRecord()  │                    │
  │                        │                      │───────────────────────────────────────────>│
  │                        │                      │  find FeeStructure    │                    │
  │                        │                      │  for classLevel       │                    │
  │                        │                      │  create FeeRecord     │                    │
  │                        │                      │  (PENDING)            │                    │
  │                        │                      │<───────────────────────────────────────────│
  │                        │<─────────────────────│                       │                    │
  │  { enrollment }        │                      │                       │                    │
  │<───────────────────────│                      │                       │                    │
```
