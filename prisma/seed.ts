import { randomUUID } from "crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
    AccessRequestStatus,
    AccessType,
    ExamType,
    FeeRecordStatus,
    Prisma,
    PrismaClient,
    Role,
    TeacherClassRole,
} from "@prisma/client";

import { ROLL_NUMBER_PAD_WIDTH } from "../src/common/constants";
import { getTodayInSchoolTimezone } from "../src/common/utils/date.util";
import { generateTempPassword, hashPassword } from "../src/common/utils/password.util";

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

const ADMIN_MOBILE = "8762224006";
const ACADEMIC_YEAR = { name: "2026-27", startDate: "2026-06-01", endDate: "2027-04-30" };
const CLASS_LEVELS = [8, 9, 10];
const SECTION_LETTERS = ["A", "B"];
const STUDENTS_PER_SECTION = { min: 20, max: 30 };
const WEEKLY_OFF_DAYS = [0];
const ABSENCE_RATE = 0.05;
const FEE_BY_CLASS: Record<number, number> = { 8: 30000, 9: 35000, 10: 40000 };
const FEE_DUE_DATE = "2026-07-31";
const UNIT_TEST = { name: "Unit Test 1", start: "2026-07-13", totalMarks: 25 };
const MID_TERM = { name: "Mid-Term Exam", start: "2026-10-05", totalMarks: 80 };

const SUBJECTS = [
    { name: "English", code: "ENG" },
    { name: "Hindi", code: "HIN" },
    { name: "Marathi", code: "MAR" },
    { name: "Mathematics", code: "MATH" },
    { name: "Science", code: "SCI" },
    { name: "Social Science", code: "SST" },
];

const TEACHERS = [
    { firstName: "Sunita", lastName: "Kulkarni", joiningDate: "2014-06-12", subjects: ["English"] },
    {
        firstName: "Rajesh",
        lastName: "Deshmukh",
        joiningDate: "2016-06-15",
        subjects: ["Hindi", "Marathi"],
    },
    { firstName: "Anil", lastName: "Patil", joiningDate: "2012-06-11", subjects: ["Mathematics"] },
    { firstName: "Meera", lastName: "Joshi", joiningDate: "2018-06-14", subjects: ["Science"] },
    {
        firstName: "Prakash",
        lastName: "Jadhav",
        joiningDate: "2020-06-15",
        subjects: ["Social Science"],
    },
];

// Class teacher (TEACHERS index) per section in order 8-A, 8-B, 9-A, 9-B, 10-A, 10-B.
const CLASS_TEACHER_INDEX = [0, 1, 2, 3, 4, 0];

const HOLIDAYS: { name: string; date: string }[] = [
    { name: "Independence Day", date: "2026-08-15" },
    { name: "Ganesh Chaturthi", date: "2026-09-14" },
    { name: "Gandhi Jayanti", date: "2026-10-02" },
    { name: "Dussehra", date: "2026-10-20" },
    ...Array.from({ length: 13 }, (_, i) => ({
        name: "Diwali Vacation",
        date: `2026-11-${String(i + 2).padStart(2, "0")}`,
    })),
    { name: "Guru Nanak Jayanti", date: "2026-11-24" },
    { name: "Christmas", date: "2026-12-25" },
    { name: "Republic Day", date: "2027-01-26" },
    { name: "Chhatrapati Shivaji Maharaj Jayanti", date: "2027-02-19" },
    { name: "Mahashivratri", date: "2027-03-06" },
    { name: "Holi (Dhulivandan)", date: "2027-03-22" },
    { name: "Gudi Padwa", date: "2027-04-07" },
    { name: "Dr. Babasaheb Ambedkar Jayanti", date: "2027-04-14" },
];

const BOY_NAMES = [
    "Aarav",
    "Aditya",
    "Arjun",
    "Atharva",
    "Omkar",
    "Pranav",
    "Rohan",
    "Sahil",
    "Siddharth",
    "Soham",
    "Tanmay",
    "Vedant",
    "Yash",
    "Aniket",
    "Harsh",
    "Kunal",
    "Mihir",
    "Nikhil",
    "Parth",
    "Rushikesh",
    "Shreyas",
    "Tejas",
    "Varun",
    "Vishal",
    "Aayush",
];
const GIRL_NAMES = [
    "Aditi",
    "Ananya",
    "Anushka",
    "Gauri",
    "Isha",
    "Janhavi",
    "Kavya",
    "Mansi",
    "Mrunal",
    "Neha",
    "Pooja",
    "Prachi",
    "Riya",
    "Sakshi",
    "Sanika",
    "Shravani",
    "Shruti",
    "Siddhi",
    "Snehal",
    "Tanvi",
    "Vaishnavi",
    "Rutuja",
    "Pallavi",
    "Ketaki",
    "Aarya",
];
const LAST_NAMES = [
    "Patil",
    "Deshmukh",
    "Kulkarni",
    "Joshi",
    "Pawar",
    "Jadhav",
    "Shinde",
    "More",
    "Gaikwad",
    "Chavan",
    "Kale",
    "Bhosale",
    "Sawant",
    "Naik",
    "Kadam",
    "Salunkhe",
    "Mane",
    "Desai",
    "Kamble",
    "Thakur",
    "Deshpande",
    "Gokhale",
    "Apte",
    "Wagh",
    "Shelke",
];

const HOMEWORK_TOPICS: Record<string, string[]> = {
    English: ["Essay: My Favourite Festival", "Grammar: Tenses Worksheet", "Formal Letter Writing"],
    Hindi: ["Nibandh: Mera Vidyalaya", "Vyakaran: Sandhi Abhyas", "Kavita Path aur Prashnottar"],
    Marathi: ["Nibandh: Maza Avadta Rutu", "Vyakaran: Samas", "Patra Lekhan"],
    Mathematics: ["Linear Equations Exercise", "Mensuration Problems", "Statistics Worksheet"],
    Science: ["Lab Journal: Acids and Bases", "Diagram: Human Heart", "Chapter Questions: Force"],
    "Social Science": [
        "Map Work: Rivers of India",
        "Notes: Indian Constitution",
        "Project: Local Government",
    ],
};

const BILL_CATEGORIES = [
    { category: "Stationery", vendors: ["Shree Stationers", "Navneet Book Depot"] },
    { category: "Electricity", vendors: ["MSEDCL"] },
    { category: "Water", vendors: ["Municipal Water Supply"] },
    { category: "Internet", vendors: ["Jio Fiber", "BSNL"] },
    { category: "Maintenance", vendors: ["Om Sai Repairs", "Ganesh Electricals"] },
    { category: "Cleaning Supplies", vendors: ["Swachh Suppliers", "D-Mart"] },
    { category: "Sports Equipment", vendors: ["Khel Sports", "Decathlon"] },
    { category: "Printing", vendors: ["Mayur Printers"] },
    { category: "Furniture", vendors: ["Royal Furniture"] },
    { category: "Lab Supplies", vendors: ["Scientific Traders"] },
    { category: "Events", vendors: ["Utsav Decorators", "Annapurna Caterers"] },
    { category: "Transport", vendors: ["Shivneri Travels"] },
];

const PAYMENT_MODES = ["Cash", "UPI", "Cheque", "Bank Transfer"];

const ACCESS_REQUEST_REASONS = [
    "Subject teacher is on leave this week.",
    "Covering pending classes before the exam.",
    "Need to upload remedial homework for weak students.",
    "Helping with mark entry for this section.",
];

const DAY_MS = 86_400_000;

const toDate = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const toIso = (date: Date): string => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);
const minDate = (a: Date, b: Date): Date => (a < b ? a : b);
const pad = (value: number, width: number): string => String(value).padStart(width, "0");
const randInt = (min: number, max: number): number =>
    min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const holidayDates = new Set(HOLIDAYS.map((holiday) => holiday.date));

const isWorkingDay = (date: Date): boolean =>
    !WEEKLY_OFF_DAYS.includes(date.getUTCDay()) && !holidayDates.has(toIso(date));

const workingDaysBetween = (from: Date, to: Date): Date[] => {
    const days: Date[] = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
        if (isWorkingDay(day)) {
            days.push(day);
        }
    }
    return days;
};

const workingDaysFrom = (from: Date, count: number): Date[] => {
    const days: Date[] = [];
    for (let day = from; days.length < count; day = addDays(day, 1)) {
        if (isWorkingDay(day)) {
            days.push(day);
        }
    }
    return days;
};

const randomWorkingDay = (from: Date, to: Date): Date => pick(workingDaysBetween(from, to));

interface SeedTeacher {
    userId: string;
    profileId: string;
    subjects: string[];
}

interface SeedSection {
    id: string;
    name: string;
    classLevel: number;
    classTeacher: SeedTeacher;
    studentIds: string[];
}

async function main(): Promise<void> {
    const admin = await prisma.user.findUnique({ where: { mobileNumber: ADMIN_MOBILE } });

    if (!admin || admin.role !== Role.ADMIN) {
        throw new Error(`Admin with mobile ${ADMIN_MOBILE} not found. Create it before seeding.`);
    }

    const existingYear = await prisma.academicYear.findUnique({
        where: { name: ACADEMIC_YEAR.name },
    });

    if (existingYear) {
        console.log(`Academic year ${ACADEMIC_YEAR.name} already exists, skipping seed.`);
        return;
    }

    const today = toDate(getTodayInSchoolTimezone());
    const yearStart = toDate(ACADEMIC_YEAR.startDate);
    const yearEnd = toDate(ACADEMIC_YEAR.endDate);
    const academicYearId = randomUUID();
    const termId = randomUUID();
    const adminName = `${admin.firstName} ${admin.lastName}`;

    // Subjects
    const subjects: Prisma.SubjectCreateManyInput[] = [];
    const subjectIdByKey = new Map<string, string>();
    for (const classLevel of CLASS_LEVELS) {
        for (const subject of SUBJECTS) {
            const id = randomUUID();
            subjectIdByKey.set(`${classLevel}:${subject.name}`, id);
            subjects.push({
                id,
                name: subject.name,
                code: subject.code,
                classLevel,
                description: `${subject.name} for class ${classLevel}`,
            });
        }
    }
    const subjectId = (classLevel: number, name: string): string =>
        subjectIdByKey.get(`${classLevel}:${name}`)!;

    // Users (teachers + students)
    const users: Omit<Prisma.UserCreateManyInput, "password">[] = [];

    const teachers: SeedTeacher[] = [];
    const teacherProfiles: Prisma.TeacherProfileCreateManyInput[] = [];
    TEACHERS.forEach((teacher, index) => {
        const userId = randomUUID();
        const profileId = randomUUID();
        users.push({
            id: userId,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            mobileNumber: `90000000${pad(index + 1, 2)}`,
            role: Role.TEACHER,
            createdById: admin.id,
        });
        teacherProfiles.push({
            id: profileId,
            userId,
            employeeCode: `TCH${pad(index + 1, 3)}`,
            joiningDate: toDate(teacher.joiningDate),
        });
        teachers.push({ userId, profileId, subjects: teacher.subjects });
    });

    const teacherBySubject = new Map<string, SeedTeacher>();
    for (const teacher of teachers) {
        for (const subject of teacher.subjects) {
            teacherBySubject.set(subject, teacher);
        }
    }

    const sections: SeedSection[] = [];
    const studentProfiles: Prisma.StudentProfileCreateManyInput[] = [];
    const enrollments: Prisma.StudentEnrollmentCreateManyInput[] = [];
    let studentCounter = 0;

    for (const classLevel of CLASS_LEVELS) {
        for (const letter of SECTION_LETTERS) {
            const section: SeedSection = {
                id: randomUUID(),
                name: `${classLevel}-${letter}`,
                classLevel,
                classTeacher: teachers[CLASS_TEACHER_INDEX[sections.length]],
                studentIds: [],
            };

            const names = Array.from(
                { length: randInt(STUDENTS_PER_SECTION.min, STUDENTS_PER_SECTION.max) },
                () => ({
                    firstName: Math.random() < 0.5 ? pick(BOY_NAMES) : pick(GIRL_NAMES),
                    lastName: pick(LAST_NAMES),
                }),
            ).sort((a, b) =>
                `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
            );

            names.forEach((name, index) => {
                studentCounter++;
                const userId = randomUUID();
                const profileId = randomUUID();
                const birthYear = 2026 - classLevel - 5;

                users.push({
                    id: userId,
                    firstName: name.firstName,
                    lastName: name.lastName,
                    mobileNumber: `9100000${pad(studentCounter, 3)}`,
                    role: Role.STUDENT,
                    createdById: admin.id,
                });
                studentProfiles.push({
                    id: profileId,
                    userId,
                    admissionNumber: `ADM-2026-${pad(studentCounter, 3)}`,
                    dateOfBirth: toDate(
                        `${birthYear}-${pad(randInt(1, 12), 2)}-${pad(randInt(1, 28), 2)}`,
                    ),
                });
                enrollments.push({
                    studentId: profileId,
                    sectionId: section.id,
                    academicYearId,
                    rollNumber: pad(index + 1, ROLL_NUMBER_PAD_WIDTH),
                });
                section.studentIds.push(profileId);
            });

            sections.push(section);
        }
    }

    console.log(`Hashing ${users.length} random passwords...`);
    const passwords = await Promise.all(users.map(() => hashPassword(generateTempPassword())));
    const usersWithPasswords: Prisma.UserCreateManyInput[] = users.map((user, index) => ({
        ...user,
        password: passwords[index],
    }));

    // Teacher assignments
    const assignments: Prisma.TeacherClassAssignmentCreateManyInput[] = [];
    for (const section of sections) {
        assignments.push({
            teacherId: section.classTeacher.profileId,
            sectionId: section.id,
            role: TeacherClassRole.CLASS_TEACHER,
        });
        for (const teacher of teachers) {
            for (const subject of teacher.subjects) {
                assignments.push({
                    teacherId: teacher.profileId,
                    sectionId: section.id,
                    subjectId: subjectId(section.classLevel, subject),
                    role: TeacherClassRole.SUBJECT_TEACHER,
                });
            }
        }
    }

    // Attendance
    const attendanceDays: Prisma.AttendanceDayCreateManyInput[] = [];
    const absences: Prisma.AttendanceCreateManyInput[] = [];
    for (const date of workingDaysBetween(yearStart, minDate(today, yearEnd))) {
        for (const section of sections) {
            attendanceDays.push({
                sectionId: section.id,
                academicYearId,
                date,
                markedById: section.classTeacher.userId,
            });
            for (const studentId of section.studentIds) {
                if (Math.random() < ABSENCE_RATE) {
                    absences.push({
                        studentId,
                        sectionId: section.id,
                        academicYearId,
                        date,
                        markedById: section.classTeacher.profileId,
                    });
                }
            }
        }
    }

    // Exams + grades
    const exams: Prisma.ExamCreateManyInput[] = [];
    const examSubjects: Prisma.ExamSubjectCreateManyInput[] = [];
    const grades: Prisma.GradeCreateManyInput[] = [];
    const unitTestDays = workingDaysFrom(toDate(UNIT_TEST.start), SUBJECTS.length);
    const midTermDays = workingDaysFrom(toDate(MID_TERM.start), SUBJECTS.length);
    const ability = new Map<string, number>();

    for (const section of sections) {
        const unitTestId = randomUUID();
        const midTermId = randomUUID();
        exams.push(
            {
                id: unitTestId,
                name: UNIT_TEST.name,
                type: ExamType.UNIT_TEST,
                sectionId: section.id,
                academicYearId,
                termId,
                isFinalized: true,
                createdById: section.classTeacher.profileId,
            },
            {
                id: midTermId,
                name: MID_TERM.name,
                type: ExamType.MID_TERM,
                sectionId: section.id,
                academicYearId,
                termId,
                createdById: section.classTeacher.profileId,
            },
        );

        SUBJECTS.forEach((subject, index) => {
            const unitTestSubjectId = randomUUID();
            const id = subjectId(section.classLevel, subject.name);
            examSubjects.push(
                {
                    id: unitTestSubjectId,
                    examId: unitTestId,
                    subjectId: id,
                    totalMarks: UNIT_TEST.totalMarks,
                    date: unitTestDays[index],
                },
                {
                    examId: midTermId,
                    subjectId: id,
                    totalMarks: MID_TERM.totalMarks,
                    date: midTermDays[index],
                },
            );

            for (const studentId of section.studentIds) {
                if (!ability.has(studentId)) {
                    ability.set(studentId, 0.35 + Math.random() * 0.6);
                }
                const score = ability.get(studentId)! + (Math.random() - 0.5) * 0.2;
                grades.push({
                    examSubjectId: unitTestSubjectId,
                    studentId,
                    marksObtained: Math.min(
                        UNIT_TEST.totalMarks,
                        Math.max(0, Math.round(UNIT_TEST.totalMarks * score)),
                    ),
                    gradedById: teacherBySubject.get(subject.name)!.profileId,
                });
            }
        });
    }

    // Homework: two past-due and one upcoming per section and subject
    const homework: Prisma.HomeworkCreateManyInput[] = [];
    for (const section of sections) {
        for (const subject of SUBJECTS) {
            const upcoming = workingDaysFrom(addDays(today, 1), randInt(2, 5));
            const dueDates = [
                randomWorkingDay(toDate("2026-06-15"), minDate(toDate("2026-07-31"), today)),
                randomWorkingDay(toDate("2026-08-01"), addDays(today, -1)),
                upcoming[upcoming.length - 1],
            ];
            HOMEWORK_TOPICS[subject.name].forEach((title, index) => {
                homework.push({
                    title,
                    description: `${title}. Complete in your ${subject.name} notebook and submit on the due date.`,
                    sectionId: section.id,
                    subjectId: subjectId(section.classLevel, subject.name),
                    academicYearId,
                    dueDate: dueDates[index],
                    createdById: teacherBySubject.get(subject.name)!.profileId,
                });
            });
        }
    }

    // Fees
    const feeStructures: Prisma.FeeStructureCreateManyInput[] = [];
    const feeStructureIdByClass = new Map<number, string>();
    for (const classLevel of CLASS_LEVELS) {
        const id = randomUUID();
        feeStructureIdByClass.set(classLevel, id);
        feeStructures.push({
            id,
            classLevel,
            academicYearId,
            totalAmount: FEE_BY_CLASS[classLevel],
            dueDate: toDate(FEE_DUE_DATE),
        });
    }

    const feeRecords: Prisma.FeeRecordCreateManyInput[] = [];
    const feePayments: Prisma.FeePaymentCreateManyInput[] = [];
    for (const section of sections) {
        const totalAmount = FEE_BY_CLASS[section.classLevel];
        for (const studentId of section.studentIds) {
            const feeRecordId = randomUUID();
            const payments: { amount: number; paidOn: Date }[] = [];
            const roll = Math.random();
            let status: FeeRecordStatus = FeeRecordStatus.PENDING;

            if (roll < 0.5) {
                status = FeeRecordStatus.PAID;
                if (Math.random() < 0.5) {
                    payments.push({
                        amount: totalAmount,
                        paidOn: randomWorkingDay(yearStart, minDate(toDate(FEE_DUE_DATE), today)),
                    });
                } else {
                    const firstInstallment = Math.round(totalAmount / 2000) * 1000;
                    payments.push(
                        {
                            amount: firstInstallment,
                            paidOn: randomWorkingDay(
                                yearStart,
                                minDate(toDate("2026-07-15"), today),
                            ),
                        },
                        {
                            amount: totalAmount - firstInstallment,
                            paidOn: randomWorkingDay(toDate("2026-08-01"), today),
                        },
                    );
                }
            } else if (roll < 0.8) {
                status = FeeRecordStatus.PARTIAL;
                payments.push({
                    amount: Math.round((totalAmount * (0.3 + Math.random() * 0.4)) / 1000) * 1000,
                    paidOn: randomWorkingDay(yearStart, today),
                });
            }

            feeRecords.push({
                id: feeRecordId,
                studentId,
                academicYearId,
                feeStructureId: feeStructureIdByClass.get(section.classLevel)!,
                totalAmount,
                status,
            });
            for (const payment of payments) {
                feePayments.push({
                    feeRecordId,
                    amount: payment.amount,
                    paidOn: payment.paidOn,
                    note: `Paid via ${pick(PAYMENT_MODES)}`,
                    recordedById: admin.id,
                });
            }
        }
    }

    // Accounts: deposit each month's fee collection on its last working day
    const collectionByMonth = new Map<string, number>();
    for (const payment of feePayments) {
        const month = toIso(payment.paidOn as Date).slice(0, 7);
        collectionByMonth.set(month, (collectionByMonth.get(month) ?? 0) + payment.amount);
    }

    const deposits: Prisma.AccountDepositCreateManyInput[] = [...collectionByMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => {
            const [year, monthNumber] = month.split("-").map(Number);
            let depositedOn = minDate(new Date(Date.UTC(year, monthNumber, 0)), today);
            while (!isWorkingDay(depositedOn)) {
                depositedOn = addDays(depositedOn, -1);
            }
            const label = depositedOn.toLocaleString("en-IN", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
            });
            return {
                amount,
                depositedOn,
                note: `Fee collection - ${label}`,
                recordedById: admin.id,
            };
        });

    const withdrawals: Prisma.AccountWithdrawalCreateManyInput[] = [];
    const bills: Prisma.AccountBillCreateManyInput[] = [];
    const withdrawalDates = shuffle(workingDaysBetween(toDate("2026-07-01"), today))
        .slice(0, 9)
        .sort((a, b) => a.getTime() - b.getTime());
    let totalWithdrawn = 0;

    withdrawalDates.forEach((withdrawnOn, index) => {
        const depositedSoFar = deposits
            .filter((deposit) => (deposit.depositedOn as Date) <= withdrawnOn)
            .reduce((sum, deposit) => sum + Number(deposit.amount), 0);
        const available = depositedSoFar - totalWithdrawn;
        const amount = Math.min(randInt(20, 150) * 1000, Math.floor(available / 500) * 500);

        if (amount < 5000) {
            return;
        }

        const withdrawalId = randomUUID();
        // Leave the latest withdrawals partly unspent so withdrawnBalance is non-zero.
        const spendRatio = index >= withdrawalDates.length - 2 ? 0.5 + Math.random() * 0.3 : 1;
        const toSpend = Math.floor(amount * spendRatio);
        const weights = Array.from({ length: randInt(2, 4) }, () => 0.5 + Math.random());
        const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
        const amounts = weights.map((weight) => Math.floor((toSpend * weight) / weightSum));
        amounts[amounts.length - 1] = toSpend - amounts.slice(0, -1).reduce((a, b) => a + b, 0);

        const categories = new Set<string>();
        for (const billAmount of amounts) {
            const { category, vendors } = pick(BILL_CATEGORIES);
            categories.add(category);
            bills.push({
                withdrawalId,
                amount: billAmount,
                billedOn: minDate(addDays(withdrawnOn, randInt(0, 5)), today),
                category,
                vendor: pick(vendors),
                billNumber: `INV-${randInt(1000, 9999)}`,
                recordedById: admin.id,
            });
        }

        withdrawals.push({
            id: withdrawalId,
            amount,
            withdrawnOn,
            withdrawnBy: adminName,
            note: `For ${[...categories].join(", ")}`,
            recordedById: admin.id,
        });
        totalWithdrawn += amount;
    });

    // Access requests: one per status, plus an admin grant and an extra pending
    const candidates = shuffle(
        teachers.flatMap((teacher) =>
            sections
                .filter((section) => section.classTeacher !== teacher)
                .flatMap((section) =>
                    SUBJECTS.filter((subject) => !teacher.subjects.includes(subject.name)).map(
                        (subject) => ({
                            teacher,
                            sectionId: section.id,
                            subjectId: subjectId(section.classLevel, subject.name),
                        }),
                    ),
                ),
        ),
    );
    const accessStatuses = [
        AccessRequestStatus.PENDING,
        AccessRequestStatus.PENDING,
        AccessRequestStatus.APPROVED,
        AccessRequestStatus.APPROVED,
        AccessRequestStatus.REJECTED,
        AccessRequestStatus.CANCELLED,
        AccessRequestStatus.REVOKED,
    ];
    const accessRequests: Prisma.AccessRequestCreateManyInput[] = accessStatuses.map(
        (status, index) => {
            const { teacher, sectionId, subjectId: requestSubjectId } = candidates[index];
            const createdAt = addDays(today, -randInt(4, 40));
            const reviewedAt = addDays(createdAt, 1);
            const isAdminGrant = index === 3;
            const reviewed =
                status !== AccessRequestStatus.PENDING && status !== AccessRequestStatus.CANCELLED;

            return {
                requesterId: teacher.userId,
                type: index % 2 === 0 ? AccessType.HOMEWORK : AccessType.MARKS,
                status,
                sectionId,
                subjectId: requestSubjectId,
                reason: isAdminGrant ? null : pick(ACCESS_REQUEST_REASONS),
                requestedById: isAdminGrant ? admin.id : teacher.userId,
                createdAt,
                ...(reviewed && {
                    reviewedById: admin.id,
                    reviewedAt: isAdminGrant ? createdAt : reviewedAt,
                    reviewRemarks:
                        status === AccessRequestStatus.REJECTED
                            ? "Subject teacher is available for this section."
                            : "Approved",
                }),
                ...(status === AccessRequestStatus.REVOKED && {
                    revokedById: admin.id,
                    revokedAt: addDays(reviewedAt, 2),
                    revokeRemarks: "Subject teacher is back from leave.",
                }),
            };
        },
    );

    const announcements: Prisma.AnnouncementCreateManyInput[] = [
        {
            title: "Welcome to Academic Year 2026-27",
            content:
                "School reopens on 1 June 2026. Students must report in full uniform by 7:30 AM.",
            startDate: toDate("2026-05-28"),
            endDate: toDate("2026-06-07"),
        },
        {
            title: "Unit Test 1 Schedule",
            content: "Unit Test 1 for classes 8 to 10 will be held from 13 to 18 July 2026.",
            startDate: toDate("2026-07-01"),
            endDate: toDate("2026-07-18"),
        },
        {
            title: "Fee Payment Reminder",
            content: "The last date for annual fee payment is 31 July 2026.",
            startDate: toDate("2026-07-15"),
            endDate: toDate("2026-07-31"),
        },
        {
            title: "Independence Day Celebration",
            content: "Flag hoisting at 7:30 AM on 15 August 2026. Attendance is compulsory.",
            startDate: toDate("2026-08-10"),
            endDate: toDate("2026-08-15"),
        },
        {
            title: "Mid-Term Exam Schedule",
            content:
                "Mid-term exams begin on 5 October 2026. Timetable is shared with class teachers.",
            startDate: toDate("2026-09-25"),
            endDate: toDate("2026-10-12"),
        },
        {
            title: "Diwali Vacation",
            content: "School will remain closed from 2 to 14 November 2026 for Diwali vacation.",
            startDate: toDate("2026-10-25"),
            endDate: toDate("2026-11-14"),
        },
    ].map((announcement) => ({ ...announcement, createdById: admin.id }));

    await prisma.$transaction(
        async (tx) => {
            await tx.academicYear.create({
                data: {
                    id: academicYearId,
                    name: ACADEMIC_YEAR.name,
                    startDate: yearStart,
                    endDate: yearEnd,
                    isCurrent: true,
                },
            });
            await tx.term.create({
                data: {
                    id: termId,
                    name: "Term 1",
                    startDate: yearStart,
                    endDate: yearEnd,
                    academicYearId,
                },
            });
            await tx.holiday.createMany({
                data: HOLIDAYS.map((holiday) => ({
                    name: holiday.name,
                    date: toDate(holiday.date),
                    academicYearId,
                })),
            });
            if ((await tx.schoolSettings.count()) === 0) {
                await tx.schoolSettings.create({ data: { weeklyOffDays: WEEKLY_OFF_DAYS } });
            }
            await tx.section.createMany({
                data: sections.map(({ id, name, classLevel }) => ({
                    id,
                    name,
                    classLevel,
                    academicYearId,
                })),
            });
            await tx.subject.createMany({ data: subjects });
            await tx.user.createMany({ data: usersWithPasswords });
            await tx.teacherProfile.createMany({ data: teacherProfiles });
            await tx.studentProfile.createMany({ data: studentProfiles });
            await tx.studentEnrollment.createMany({ data: enrollments });
            await tx.teacherClassAssignment.createMany({ data: assignments });
            await tx.attendanceDay.createMany({ data: attendanceDays });
            await tx.attendance.createMany({ data: absences });
            await tx.exam.createMany({ data: exams });
            await tx.examSubject.createMany({ data: examSubjects });
            await tx.grade.createMany({ data: grades });
            await tx.homework.createMany({ data: homework });
            await tx.feeStructure.createMany({ data: feeStructures });
            await tx.feeRecord.createMany({ data: feeRecords });
            await tx.feePayment.createMany({ data: feePayments });
            await tx.accountDeposit.createMany({ data: deposits });
            await tx.accountWithdrawal.createMany({ data: withdrawals });
            await tx.accountBill.createMany({ data: bills });
            await tx.accessRequest.createMany({ data: accessRequests });
            await tx.announcement.createMany({ data: announcements });
        },
        { timeout: 120_000 },
    );

    console.table({
        sections: sections.length,
        subjects: subjects.length,
        teachers: teachers.length,
        students: studentProfiles.length,
        assignments: assignments.length,
        holidays: HOLIDAYS.length,
        attendanceDays: attendanceDays.length,
        absences: absences.length,
        exams: exams.length,
        grades: grades.length,
        homework: homework.length,
        feePayments: feePayments.length,
        deposits: deposits.length,
        withdrawals: withdrawals.length,
        bills: bills.length,
        accessRequests: accessRequests.length,
        announcements: announcements.length,
    });
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
