/**
 * Aligned with Prisma `Role` enum and `skill-bridge_frontend/src/types/auth.ts`.
 */
export const USER_ROLES = ["student", "tutor", "admin"] as const;
export const PUBLIC_REGISTER_ROLES = ["student", "tutor"] as const;
export type AppUserRole = (typeof USER_ROLES)[number];
