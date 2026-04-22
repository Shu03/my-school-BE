import { AcademicYear } from "@prisma/client";

export type TermBasic = {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    academicYearId: string;
    createdAt: Date;
    updatedAt: Date;
};

export type AcademicYearBasic = AcademicYear;

export type AcademicYearWithTerms = AcademicYear & {
    terms: TermBasic[];
};
