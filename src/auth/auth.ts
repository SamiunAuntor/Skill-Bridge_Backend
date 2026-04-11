import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "../config/prisma.config";
import { env } from "../config/env";

function buildTrustedOrigins(): string[] {
    return [env.BETTER_AUTH_URL, env.FRONTEND_URL, env.BACKEND_URL].filter(
        (u): u is string => typeof u === "string" && u.length > 0
    );
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

    emailAndPassword: {
        enabled: true,
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
                    if (first && data.firstName == null) {
                        data.firstName = first;
                    }
                    if (last && data.lastName == null) {
                        data.lastName = last;
                    }
                    return { data };
                },
            },
        },
    },
});
