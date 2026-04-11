import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";

const connectionString = env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });

// IMPORTANT: type isolation fix
const createPrisma = () =>
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
    });

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrisma> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}