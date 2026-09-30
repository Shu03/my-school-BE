export type AttendanceDayStatus = "PRESENT" | "ABSENT";

export type AttendanceDayStudent = {
    studentId: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    status: AttendanceDayStatus | null;
};

export type AttendanceDayView = {
    sectionId: string;
    date: string;
    isTaken: boolean;
    markedBy: { id: string; firstName: string; lastName: string } | null;
    markedAt: Date | null;
    students: AttendanceDayStudent[];
};

export type StudentAttendanceItem = {
    date: string;
    sectionId: string;
    status: AttendanceDayStatus;
};

export type AttendanceSummaryItem = {
    studentId: string;
    firstName: string;
    lastName: string;
    totalDays: number;
    present: number;
    absent: number;
    percentage: number;
};
