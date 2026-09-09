# Test Specifications

## Critical Test Cases

### Auth Module Tests

| Test Case | Input | Expected Outcome |
|-----------|-------|-----------------|
| Login with valid credentials | Valid mobile + password | Returns accessToken + refreshToken + user |
| Login first-login user | Valid creds, isFirstLogin=true | Returns firstLoginToken only |
| Login invalid password | Valid mobile, wrong password | 401 Unauthorized |
| Login deactivated user | Deactivated user creds | 401 Unauthorized |
| Login non-existent user | Unknown mobile | 401 Unauthorized |
| Refresh valid token | Valid refresh JWT | New token pair (old revoked) |
| Refresh revoked token (reuse) | Previously revoked token | 401, all family tokens revoked |
| Refresh expired token | Expired JWT | 401 Unauthorized |
| Change password (first login) | firstLoginToken + newPassword | isFirstLogin=false, new tokens |
| Change password (voluntary) | accessToken + currentPassword + newPassword | New tokens, all sessions revoked |
| Change password same as current | Same old and new password | 400 Bad Request |
| Admin reset password | Admin + targetUserId | Temp password, target isFirstLogin=true |
| Session limit enforcement | 4th login for same user | Oldest session revoked |

### Attendance Module Tests

| Test Case | Input | Expected Outcome |
|-----------|-------|-----------------|
| Mark attendance on school day | Today, valid section, enrolled students | Success with count |
| Mark attendance on weekly off | Weekend date | 400 "Not a school day" |
| Mark attendance on holiday | Holiday date | 400 "Not a school day" |
| Mark attendance for future date | Tomorrow's date | 400 error |
| Unassigned teacher marks | Teacher not assigned to section | 403 Forbidden |
| Unenrolled student in records | Non-enrolled studentId | 400 error |
| Monthly summary calculation | Section + month | Correct working days, percentages |

### Fee Module Tests

| Test Case | Input | Expected Outcome |
|-----------|-------|-----------------|
| Record payment (partial) | Amount < totalAmount | Status = PARTIAL |
| Record payment (full) | Amount = remaining | Status = PAID |
| Auto-fee on enrollment | Enroll student in section with fee structure | FeeRecord created (PENDING) |
| Auto-fee no structure | Enroll in section without fee structure | No FeeRecord (silent skip) |
| Backfill missing records | Academic year with gaps | Created count + skipped count |
| Student sees own fees only | Student requests all records | Only own records returned |

### Student Module Tests

| Test Case | Input | Expected Outcome |
|-----------|-------|-----------------|
| Enroll student | Valid studentId + sectionId | Enrollment created, fee record generated |
| Enroll duplicate | Same student + same academic year | 400/409 error |
| Auto roll number | No rollNumber provided | Generated as padded count+1 |
| Promote students | List of active students | Old=PROMOTED, new=ACTIVE, fees generated |
| Promote already-enrolled | Student already in target year | Skipped with reason |

### Exam/Grade Module Tests

| Test Case | Input | Expected Outcome |
|-----------|-------|-----------------|
| Create exam | Valid section + subjects | Exam with exam subjects created |
| Enter grades | Valid marks within range | Grades created |
| Enter grades exceeding total | marksObtained > totalMarks | 400 error |
| Finalize exam | Active exam | isFinalized=true |
| Modify finalized exam | Update finalized exam | 400 error |
| Grade summary | Exam with grades | Correct avg/highest/lowest |

## Integration Test Scenarios

| Scenario | Steps | Verification |
|----------|-------|-------------|
| Full student lifecycle | Create user → Login → Enroll → Mark attendance → Enter grades → Record fees | All data consistent |
| Token rotation | Login → Refresh → Refresh → Use old token | Reuse detection works |
| Academic year transition | Create year → Set current → Create sections → Enroll → Promote | Data carries over correctly |
| Permission enforcement | Create teacher → Assign preset → Login → Access protected route | Correct permissions applied |
