/**
 * Standalone reset script — wipes ALL data except one specified Admin user.
 *
 * This is NOT part of the normal seed flow (pnpm prisma:seed).
 * Run manually and deliberately:
 *
 *   pnpm ts-node -r tsconfig-paths/register prisma/reset-keep-admin.ts
 *
 * Deletes children before parents to respect FK constraints.
 * Keeps exactly one User row: mobileNumber = KEEP_ADMIN_MOBILE.
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config();

const KEEP_ADMIN_MOBILE = "9999999999";

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

async function main(): Promise<void> {
    const admin = await prisma.user.findUnique({
        where: { mobileNumber: KEEP_ADMIN_MOBILE },
    });

    if (!admin) {
        throw new Error(
            `Admin with mobileNumber ${KEEP_ADMIN_MOBILE} not found. Aborting — refusing to wipe everything.`,
        );
    }

    if (admin.role !== "ADMIN") {
        throw new Error(`User with mobileNumber ${KEEP_ADMIN_MOBILE} is not an ADMIN. Aborting.`);
    }

    console.log(`✅ Found admin to keep: ${admin.id} (${admin.firstName} ${admin.lastName})`);
    console.log("🗑️  Starting full wipe (children before parents)...\n");

    // ── Fees ──────────────────────────────────────────────
    await prisma.feePayment.deleteMany({});
    console.log("  ✓ fee_payments");
    await prisma.feeRecord.deleteMany({});
    console.log("  ✓ fee_records");
    await prisma.feeStructure.deleteMany({});
    console.log("  ✓ fee_structures");

    // ── Grades / Exams ────────────────────────────────────
    await prisma.grade.deleteMany({});
    console.log("  ✓ grades");
    await prisma.exam.deleteMany({});
    console.log("  ✓ exams");

    // ── Homework / Announcements ──────────────────────────
    await prisma.homework.deleteMany({});
    console.log("  ✓ homework");
    await prisma.announcement.deleteMany({});
    console.log("  ✓ announcements");

    // ── Attendance ────────────────────────────────────────
    await prisma.attendance.deleteMany({});
    console.log("  ✓ attendance");

    // ── Holidays ──────────────────────────────────────────
    await prisma.holiday.deleteMany({});
    console.log("  ✓ holidays");

    // ── Students ──────────────────────────────────────────
    await prisma.studentEnrollment.deleteMany({});
    console.log("  ✓ student_enrollments");
    await prisma.studentProfile.deleteMany({});
    console.log("  ✓ student_profiles");

    // ── Teachers ──────────────────────────────────────────
    await prisma.teacherClassAssignment.deleteMany({});
    console.log("  ✓ teacher_class_assignments");
    await prisma.teacherProfile.deleteMany({});
    console.log("  ✓ teacher_profiles");

    // ── Academic structure ────────────────────────────────
    await prisma.class.deleteMany({});
    console.log("  ✓ classes");
    await prisma.subject.deleteMany({});
    console.log("  ✓ subjects");
    await prisma.term.deleteMany({});
    console.log("  ✓ terms");
    await prisma.academicYear.deleteMany({});
    console.log("  ✓ academic_years");

    // ── Permission presets ────────────────────────────────
    await prisma.permissionPreset.deleteMany({});
    console.log("  ✓ permission_presets");

    // ── School settings ───────────────────────────────────
    await prisma.schoolSettings.deleteMany({});
    console.log("  ✓ school_settings");

    // ── Refresh tokens (all except the kept admin's) ─────
    await prisma.refreshToken.deleteMany({
        where: { userId: { not: admin.id } },
    });
    console.log("  ✓ refresh_tokens (except kept admin)");

    // ── Users (all except the kept admin) ─────────────────
    await prisma.user.deleteMany({
        where: { id: { not: admin.id } },
    });
    console.log("  ✓ users (except kept admin)");

    // ── Verification ───────────────────────────────────────
    const userCount = await prisma.user.count();
    const remainingUser = await prisma.user.findFirst();

    console.log("\n✅ Reset complete.");
    console.log(`   Users remaining: ${userCount}`);
    console.log(
        `   Kept admin: ${remainingUser?.mobileNumber} (${remainingUser?.firstName} ${remainingUser?.lastName})`,
    );
}

main()
    .catch((error: unknown) => {
        console.error("❌ Reset failed:", error);
        process.exit(1);
    })
    .finally(() => {
        void prisma.$disconnect();
    });
