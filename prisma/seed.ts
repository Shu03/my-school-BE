import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";

import { hashPassword } from "../src/common/utils/password.util";

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

async function main(): Promise<void> {
    const password = await hashPassword("Admin@1234");

    const admin = await prisma.user.upsert({
        where: { mobileNumber: "9999999999" },
        update: {},
        create: {
            firstName: "Super",
            lastName: "Admin",
            mobileNumber: "9999999999",
            password,
            role: Role.ADMIN,
            isFirstLogin: false,
        },
    });

    console.log(`✅ Seed admin created: ${admin.id}`);
    console.log(`📱 Mobile: 9999999999`);
    console.log(`🔑 Password: Admin@1234`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
