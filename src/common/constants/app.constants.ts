// Bcrypt
export const SALT_ROUNDS = 12;

// Password generation
export const TEMP_PASSWORD_LENGTH = 12;
export const TEMP_PASSWORD_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

// Pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Sessions
export const MAX_ACTIVE_SESSIONS = 3;

// JWT
export const JWT_ACCESS_EXPIRES_IN = "15m";
export const JWT_REFRESH_EXPIRES_IN = "7d";

// Token types
export const TOKEN_TYPE_ACCESS = "access";
export const TOKEN_TYPE_FIRST_LOGIN = "first_login";
export const TOKEN_TYPE_REFRESH = "refresh";

// First login token expiry — always fixed regardless of config
export const FIRST_LOGIN_TOKEN_EXPIRY = "15m";

// Guard metadata keys
export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";

// Passport strategy names
export const JWT_STRATEGY = "jwt";
export const JWT_FIRST_LOGIN_STRATEGY = "jwt-first-login";

// Students
export const ROLL_NUMBER_PAD_WIDTH = 2;

// School settings
export const WEEKLY_OFF_DAYS_DEFAULT = [0]; // 0 = Sunday

// Timezone used for date-only comparisons (e.g. attendance "today" check)
export const SCHOOL_TIMEZONE = "Asia/Kolkata";

// School / Holiday error messages
export const ERROR_HOLIDAY_ALREADY_EXISTS =
    "A holiday already exists on this date for this academic year";
export const ERROR_NO_FIELDS_TO_UPDATE = "No fields provided to update";

// Attendance error messages
export const ERROR_ATTENDANCE_NOT_SCHOOL_DAY = "The selected date is not a school day";
export const ERROR_ATTENDANCE_FUTURE_DATE = "Attendance cannot be recorded for a future date";
export const ERROR_ATTENDANCE_OUTSIDE_ACADEMIC_YEAR =
    "Date must fall within the current academic year (%s to %s)";
export const ERROR_ATTENDANCE_SECTION_NOT_FOUND = "Section not found";
export const ERROR_ATTENDANCE_SECTION_NOT_CURRENT_YEAR =
    "Attendance can only be managed for sections in the current academic year";
export const ERROR_ATTENDANCE_NOT_CLASS_TEACHER =
    "Only the class teacher of this section can manage its attendance";
export const ERROR_ATTENDANCE_DAY_NOT_TAKEN =
    "Attendance has not been taken for this section on %s";
export const ERROR_STUDENT_NOT_ENROLLED = "One or more students are not enrolled in this section";
export const ERROR_ATTENDANCE_FORBIDDEN_SCOPE = "You are not allowed to view this attendance";

// Exam error messages
export const ERROR_EXAM_NOT_FOUND = "Exam not found";
export const ERROR_EXAM_FINALIZED = "Exam is finalized and cannot be modified";
export const ERROR_EXAM_DISCARDED = "Exam has been discarded and cannot be modified";
export const ERROR_EXAM_FORBIDDEN_SCOPE = "You are not allowed to view this exam";
export const ERROR_EXAM_SUBJECT_GRADE_MISMATCH =
    "Subject grade level does not match class grade level";
export const ERROR_EXAM_TERM_NOT_FOUND = "Term not found";
export const ERROR_EXAM_TERM_YEAR_MISMATCH = "Term does not belong to the resolved academic year";
export const ERROR_EXAM_EMPTY_UPDATE = "At least one field must be provided: name, type, termId";
export const ERROR_EXAM_NO_SUBJECTS = "An exam must have at least one subject";
export const ERROR_EXAM_DUPLICATE_SUBJECT = "Duplicate subjects are not allowed in an exam";
export const ERROR_EXAM_SUBJECT_NOT_FOUND = "Subject is not part of this exam";
export const ERROR_EXAM_SUBJECT_ALREADY_EXISTS = "This subject is already part of the exam";
export const ERROR_EXAM_SUBJECT_EMPTY_UPDATE =
    "At least one field must be provided: totalMarks, date";

// Grade error messages
export const ERROR_GRADE_MARKS_OUT_OF_RANGE =
    "Marks obtained must be between 0 and the exam total marks";
export const ERROR_GRADE_STUDENTS_NOT_ENROLLED =
    "One or more students are not enrolled in the exam class";
export const ERROR_GRADE_ACCESS_DENIED =
    "You are not the class or subject teacher for this subject in this section. Request MARKS access to continue";
export const ERROR_GRADE_FORBIDDEN_SCOPE = "You are not allowed to view these grades";
export const ERROR_GRADE_TEACHER_PROFILE_NOT_FOUND = "Teacher profile not found for this account";
export const ERROR_GRADE_STUDENT_PROFILE_NOT_FOUND = "Student profile not found for this account";

// Homework error messages
export const ERROR_HOMEWORK_NOT_FOUND = "Homework not found";
export const ERROR_HOMEWORK_SUBJECT_GRADE_MISMATCH =
    "The subject does not belong to the class's grade level";
export const ERROR_HOMEWORK_ACCESS_DENIED =
    "You are not the class or subject teacher for this subject in this section. Request HOMEWORK access to continue";
export const ERROR_HOMEWORK_TEACHER_PROFILE_NOT_FOUND =
    "Teacher profile not found for this account";
export const ERROR_HOMEWORK_STUDENT_PROFILE_NOT_FOUND =
    "Student profile not found for this account";
export const ERROR_HOMEWORK_GRANTED_NOT_CREATOR =
    "With granted access you can only modify homework you created";
export const ERROR_HOMEWORK_EMPTY_UPDATE =
    "At least one field must be provided: title, description, dueDate";
export const ERROR_HOMEWORK_FORBIDDEN_SCOPE = "You are not allowed to access this homework";

// Announcement error messages
export const ERROR_ANNOUNCEMENT_NOT_FOUND = "Announcement not found";
export const ERROR_ANNOUNCEMENT_NOT_CREATOR = "You can only modify announcements you created";
export const ERROR_ANNOUNCEMENT_EMPTY_UPDATE =
    "At least one field must be provided: title, content, startDate, endDate";
export const ERROR_ANNOUNCEMENT_EXPIRED =
    "This announcement has passed its end date and can no longer be modified or deleted";
export const ERROR_ANNOUNCEMENT_INVALID_DATE_RANGE = "endDate must be after startDate";

// Fee error messages
export const ERROR_FEE_STRUCTURE_NOT_FOUND = "Fee structure not found";
export const ERROR_FEE_RECORD_NOT_FOUND = "Fee record not found";
export const ERROR_FEE_STRUCTURE_ALREADY_EXISTS =
    "Fee structure already exists for grade %s in this academic year";
export const ERROR_FEE_STRUCTURE_EMPTY_UPDATE =
    "At least one field must be provided: totalAmount, dueDate";
export const ERROR_FEE_STUDENT_PROFILE_NOT_FOUND = "Student profile not found for this account";
export const ERROR_FEE_FORBIDDEN_SCOPE = "You are not allowed to access this fee record";

// Account error messages
export const ERROR_ACCOUNT_DEPOSIT_NOT_FOUND = "Deposit not found";
export const ERROR_ACCOUNT_WITHDRAWAL_NOT_FOUND = "Withdrawal not found";
export const ERROR_ACCOUNT_BILL_NOT_FOUND = "Bill not found";
export const ERROR_ACCOUNT_INSUFFICIENT_BALANCE =
    "Withdrawal amount exceeds the available balance of %s";
export const ERROR_ACCOUNT_DEPOSITS_BELOW_WITHDRAWN =
    "Total deposits cannot be less than the total withdrawn amount of %s";
export const ERROR_ACCOUNT_WITHDRAWAL_BELOW_SPENT =
    "Withdrawal amount cannot be less than its total bills of %s";
export const ERROR_ACCOUNT_BILL_EXCEEDS_WITHDRAWAL =
    "Bill amount exceeds the remaining withdrawal balance of %s";

// Access request error messages
export const ERROR_ACCESS_REQUEST_NOT_FOUND = "Access request not found";
export const ERROR_ACCESS_REQUEST_NOT_OWNER =
    "You can only view or cancel your own access requests";
export const ERROR_ACCESS_REQUEST_INVALID_STATUS =
    "Only %s access requests can be %s; this request is %s";
export const ERROR_ACCESS_REQUEST_SCOPE_REQUIRED =
    "sectionId and subjectId are required for %s access";
export const ERROR_ACCESS_REQUEST_SECTION_NOT_FOUND = "Section not found";
export const ERROR_ACCESS_REQUEST_SUBJECT_NOT_FOUND = "Subject not found";
export const ERROR_ACCESS_REQUEST_SUBJECT_LEVEL_MISMATCH =
    "Subject class level (%s) does not match section class level (%s)";
export const ERROR_ACCESS_REQUEST_SECTION_NOT_CURRENT_YEAR =
    "Access can only be requested for sections in the current academic year";
export const ERROR_ACCESS_REQUEST_REQUESTER_NOT_TEACHER =
    "Access can only be requested by or granted to an active teacher";
export const ERROR_ACCESS_REQUEST_ALREADY_HAS_ACCESS =
    "You already have %s access to this subject in this section (%s)";
export const ERROR_ACCESS_GRANT_ALREADY_HAS_ACCESS =
    "%s already has %s access to this subject in this section (%s)";
export const ERROR_ACCESS_REQUEST_DUPLICATE_PENDING =
    "A pending %s access request already exists for this subject in this section";

// Subject error messages
export const ERROR_SUBJECT_HAS_ACTIVE_ACCESS =
    "Cannot delete subject — it has %s approved access grant(s). Revoke them first.";

// Dashboard
export const DASHBOARD_UPCOMING_DAYS = 7;
export const DASHBOARD_LIST_LIMIT = 5;
export const ERROR_DASHBOARD_NO_CURRENT_YEAR =
    "No current academic year set. Please select an academic year.";
export const ERROR_DASHBOARD_TEACHER_PROFILE_NOT_FOUND =
    "Teacher profile not found for this account";
export const ERROR_DASHBOARD_STUDENT_PROFILE_NOT_FOUND =
    "Student profile not found for this account";
