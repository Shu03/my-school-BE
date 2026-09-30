import {
    AccessRequestStatus,
    ExamType,
    FeeRecordStatus,
    Role,
    TeacherClassRole,
} from "@prisma/client";

import { AccountSummary } from "@modules/accounts";

export type DashboardContext = {
    userId: string;
    academicYearId: string;
    // YYYY-MM-DD in the school's timezone
    today: string;
    // UTC midnight of `today`, for comparisons against @db.Date columns
    todayDate: Date;
    upcomingUntil: Date;
    isSchoolDay: boolean;
};

export type AnnouncementItem = {
    id: string;
    title: string;
    content: string;
    startDate: Date;
    endDate: Date;
};

export type HolidayItem = {
    id: string;
    name: string;
    date: Date;
};

export type ExamSubjectItem = {
    examSubjectId: string;
    examId: string;
    examName: string;
    examType: ExamType;
    sectionId: string;
    sectionName: string;
    classLevel: number;
    subjectId: string;
    subjectName: string;
    date: Date;
    totalMarks: number;
};

export type PendingGradingItem = ExamSubjectItem & {
    graded: number;
    totalStudents: number;
};

export type ExamResultItem = {
    examId: string;
    examName: string;
    examType: ExamType;
    marksObtained: number;
    totalMarks: number;
    percentage: number;
};

export type AttendanceCounts = {
    totalDays: number;
    present: number;
    absent: number;
    percentage: number;
};

type NoSchoolToday = { isSchoolDay: false };

type DashboardCommon = {
    academicYear: { id: string; name: string };
    today: string;
    announcements: AnnouncementItem[];
    upcomingHolidays: HolidayItem[];
};

export type AdminDashboardStats = {
    counts: { students: number; teachers: number; sections: number };
    enrollmentByClassLevel: { classLevel: number; students: number }[];
    attendanceToday:
        | NoSchoolToday
        | {
              isSchoolDay: true;
              sectionsMarked: number;
              sectionsPending: number;
              absentees: number;
              presentPercentage: number;
          };
    fees: {
        expected: number;
        collected: number;
        outstanding: number;
        byStatus: Record<FeeRecordStatus, number>;
    };
    accounts: AccountSummary;
    pendingAccessRequests: number;
    exams: { upcoming: ExamSubjectItem[]; notFinalizedCount: number };
};

export type TeacherDashboardStats = {
    assignments: {
        sectionId: string;
        sectionName: string;
        classLevel: number;
        subjectId: string | null;
        subjectName: string | null;
        role: TeacherClassRole;
        studentCount: number;
    }[];
    attendanceToday:
        | NoSchoolToday
        | {
              isSchoolDay: true;
              sections: { sectionId: string; sectionName: string; marked: boolean }[];
          };
    exams: {
        upcoming: ExamSubjectItem[];
        pendingGrading: { count: number; items: PendingGradingItem[] };
    };
    activeHomeworkCount: number;
    accessRequests: Record<AccessRequestStatus, number>;
};

export type StudentDashboardStats = {
    enrollment: {
        sectionId: string;
        sectionName: string;
        classLevel: number;
        rollNumber: string;
        classTeacher: { firstName: string; lastName: string } | null;
    } | null;
    attendance: { year: AttendanceCounts; month: AttendanceCounts } | null;
    fees: {
        total: number;
        paid: number;
        due: number;
        status: FeeRecordStatus;
        dueDate: Date;
    } | null;
    homeworkDueSoon: { id: string; title: string; subjectName: string; dueDate: Date }[] | null;
    exams: { upcoming: ExamSubjectItem[]; recentResults: ExamResultItem[] } | null;
};

export type AdminDashboard = DashboardCommon & { role: typeof Role.ADMIN } & AdminDashboardStats;
export type TeacherDashboard = DashboardCommon & {
    role: typeof Role.TEACHER;
} & TeacherDashboardStats;
export type StudentDashboard = DashboardCommon & {
    role: typeof Role.STUDENT;
} & StudentDashboardStats;

export type DashboardResponse = AdminDashboard | TeacherDashboard | StudentDashboard;
