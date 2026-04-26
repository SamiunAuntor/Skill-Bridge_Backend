import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { APIError } from "@better-auth/core/error";
import { prisma } from "../../config/prisma.config";
import { env } from "../../config/env";
import { sendAuthEmail } from "./auth-email";

function buildTrustedOrigins(): string[] {
    return [env.BETTER_AUTH_URL, env.FRONTEND_URL, env.BACKEND_URL].filter(
        (u): u is string => typeof u === "string" && u.length > 0
    );
}

async function ensureTutorProfileForTutorRole(
    user: {
        id: string;
        role?: unknown;
    }
): Promise<void> {
    if (user.role !== "tutor") {
        return;
    }

    await prisma.tutorProfile.upsert({
        where: {
            userId: user.id,
        },
        update: {},
        create: {
            userId: user.id,
            bio: "",
            hourlyRate: 0,
            experienceYears: 0,
        },
    });
}

async function ensureTutorProfileByUserId(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            role: true,
        },
    });

    if (!user) {
        return;
    }

    await ensureTutorProfileForTutorRole(user);
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),

    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: buildTrustedOrigins(),

    session: {
        modelName: "authSession",
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
    },

    user: {
        additionalFields: {
            role: {
                type: ["student", "tutor", "admin"],
                required: false,
                defaultValue: "student",
                input: true,
            },
        },
    },

    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            void sendAuthEmail("verification", user.email, url, user.name);
        },
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
    },

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            void sendAuthEmail("password_reset", user.email, url, user.name);
        },
    },

    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    const full = String(user.name ?? "").trim();
                    const parts = full.split(/\s+/).filter(Boolean);
                    const first = parts[0] ?? "";
                    const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
                    const data = { ...user };
                    data.emailVerified = true;
                    if (first && data.firstName == null) {
                        data.firstName = first;
                    }
                    if (last && data.lastName == null) {
                        data.lastName = last;
                    }
                    return { data };
                },
                after: async (user) => {
                    await ensureTutorProfileForTutorRole(user);
                },
            },
        },
        session: {
            create: {
                before: async (session) => {
                    const user = await prisma.user.findUnique({
                        where: {
                            id: session.userId,
                        },
                        select: {
                            isBanned: true,
                            deletedAt: true,
                        },
                    });

                    if (!user || user.deletedAt || user.isBanned) {
                        throw new APIError("FORBIDDEN", {
                            message: "This account has been restricted. Please contact the platform authority.",
                        });
                    }

                    return {
                        data: session,
                    };
                },
                after: async (session) => {
                    await ensureTutorProfileByUserId(session.userId);
                },
            },
        },
    },
});

export type SkillBridgeAuth = typeof auth;
