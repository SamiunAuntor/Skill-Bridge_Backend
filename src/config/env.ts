import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || "5000";

export const env = {
    PORT: Number(port) || 5000,
    AUTH_SECRET: process.env.AUTH_SECRET,
    BACKEND_URL: process.env.BACKEND_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        (process.env.NODE_ENV === "production"
            ? undefined
            : "dev-only-better-auth-secret-min-32-chars!"),
    BETTER_AUTH_URL:
        process.env.BETTER_AUTH_URL ||
        process.env.BACKEND_URL ||
        `http://localhost:${port}`,
};