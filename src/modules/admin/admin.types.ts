import type { BookingStatus, PaymentStatus, Role } from "../../generated/prisma/client";

export const adminUserSortOptions = [
    "newest",
    "oldest",
    "name_asc",
    "name_desc",
    "email_asc",
    "email_desc",
] as const;

export type AdminUserSortOption = (typeof adminUserSortOptions)[number];

export const adminBookingSortOptions = [
    "session_desc",
    "session_asc",
    "amount_high",
    "amount_low",
    "newest",
    "oldest",
] as const;

export type AdminBookingSortOption = (typeof adminBookingSortOptions)[number];

export const adminMasterSortOptions = [
    "display_asc",
    "display_desc",
    "name_asc",
    "name_desc",
    "newest",
    "oldest",
] as const;

export type AdminMasterSortOption = (typeof adminMasterSortOptions)[number];

export interface AdminPagination {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface AdminDashboardResponse {
    stats: {
        totalUsers: number;
        totalStudents: number;
        totalTutors: number;
        totalBookings: number;
        totalCategories: number;
        totalSubjects: number;
        totalDegrees: number;
    };
}

export interface AdminUsersQuery {
    q?: string;
    role?: Extract<Role, "student" | "tutor">;
    banned?: boolean;
    verified?: boolean;
    sortBy: AdminUserSortOption;
    page: number;
    limit: number;
}

export interface AdminUsersResponse {
    users: Array<{
        id: string;
        name: string;
        email: string;
        role: Extract<Role, "student" | "tutor">;
        isBanned: boolean;
        emailVerified: boolean;
        createdAt: string;
        tutorProfileId: string | null;
    }>;
    pagination: AdminPagination;
    filters: AdminUsersQuery;
}

export interface AdminUserStatusUpdateInput {
    isBanned: boolean;
}

export interface AdminBookingsQuery {
    q?: string;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
    sortBy: AdminBookingSortOption;
    page: number;
    limit: number;
}

export interface AdminBookingsResponse {
    bookings: Array<{
        id: string;
        bookingStatus: BookingStatus;
        paymentStatus: PaymentStatus;
        sessionDate: string;
        startTime: string;
        endTime: string;
        priceAtBooking: number;
        createdAt: string;
        student: {
            id: string;
            name: string;
            email: string;
        };
        tutor: {
            id: string;
            profileId: string;
            name: string;
            email: string;
        };
    }>;
    pagination: AdminPagination;
    filters: AdminBookingsQuery;
}

export interface AdminCategoriesQuery {
    q?: string;
    isActive?: boolean;
    sortBy: AdminMasterSortOption;
    page: number;
    limit: number;
}

export interface AdminSubjectsQuery extends AdminCategoriesQuery {
    categoryId?: string;
}

export interface AdminDegreesQuery extends AdminCategoriesQuery {}

export interface AdminCategoriesResponse {
    categories: Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        isActive: boolean;
        displayOrder: number;
        subjectCount: number;
        tutorCount: number;
        createdAt: string;
    }>;
    pagination: AdminPagination;
    filters: AdminCategoriesQuery;
}

export interface AdminSubjectsResponse {
    subjects: Array<{
        id: string;
        categoryId: string;
        categoryName: string;
        name: string;
        slug: string;
        shortDescription: string | null;
        longDescription: string | null;
        iconKey: string | null;
        heroImageUrl: string | null;
        isActive: boolean;
        displayOrder: number;
        tutorCount: number;
        createdAt: string;
    }>;
    pagination: AdminPagination;
    filters: AdminSubjectsQuery;
}

export interface AdminDegreesResponse {
    degrees: Array<{
        id: string;
        name: string;
        slug: string;
        level: string | null;
        isActive: boolean;
        displayOrder: number;
        usageCount: number;
        createdAt: string;
    }>;
    pagination: AdminPagination;
    filters: AdminDegreesQuery;
}

export interface AdminCategoryUpsertInput {
    name: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
    displayOrder?: number;
}

export interface AdminSubjectUpsertInput {
    categoryId: string;
    name: string;
    slug?: string;
    shortDescription?: string | null;
    longDescription?: string | null;
    iconKey?: string | null;
    heroImageUrl?: string | null;
    isActive?: boolean;
    displayOrder?: number;
}

export interface AdminDegreeUpsertInput {
    name: string;
    slug?: string;
    level?: string | null;
    isActive?: boolean;
    displayOrder?: number;
}
