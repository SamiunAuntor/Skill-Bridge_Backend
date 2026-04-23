import type {
    BookingStatus,
    PaymentStatus,
    PlatformReviewStatus,
    Role,
} from "../../generated/prisma/client";

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
        activeCategories: number;
        inactiveCategories: number;
        activeSubjects: number;
        inactiveSubjects: number;
        activeDegrees: number;
        inactiveDegrees: number;
        bannedUsers: number;
    };
    charts: {
        studentRegistrations: Array<{
            label: string;
            count: number;
        }>;
        tutorRegistrations: Array<{
            label: string;
            count: number;
        }>;
        bookingTrend: Array<{
            label: string;
            count: number;
        }>;
        bookingStatusBreakdown: Array<{
            status: BookingStatus;
            count: number;
        }>;
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

export interface AdminDegreesQuery extends AdminCategoriesQuery {
    categoryId?: string;
}

export interface AdminCategoriesResponse {
    categories: Array<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
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
        description: string | null;
        iconUrl: string | null;
        iconPublicId: string | null;
        isActive: boolean;
        tutorCount: number;
        createdAt: string;
    }>;
    pagination: AdminPagination;
    filters: AdminSubjectsQuery;
}

export interface AdminDegreesResponse {
    degrees: Array<{
        id: string;
        categoryId: string;
        categoryName: string;
        name: string;
        level: string | null;
        isActive: boolean;
        usageCount: number;
        createdAt: string;
    }>;
    pagination: AdminPagination;
    filters: AdminDegreesQuery;
}

export interface AdminCategoryUpsertInput {
    name: string;
    description?: string | null;
    isActive?: boolean;
}

export interface AdminSubjectUpsertInput {
    categoryId: string;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    iconPublicId?: string | null;
    isActive?: boolean;
}

export interface AdminDegreeUpsertInput {
    categoryId: string;
    name: string;
    level?: string | null;
    isActive?: boolean;
}

export interface AdminPlatformReviewsQuery {
    q?: string;
    status?: PlatformReviewStatus;
    sortBy: "newest" | "oldest" | "rating_high" | "rating_low";
    page: number;
    limit: number;
}

export interface AdminPlatformReviewsResponse {
    reviews: Array<{
        id: string;
        rating: number;
        title: string | null;
        message: string;
        status: PlatformReviewStatus;
        createdAt: string;
        user: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
    }>;
    pagination: AdminPagination;
    filters: AdminPlatformReviewsQuery;
}

export interface AdminPlatformReviewStatusUpdateInput {
    status: PlatformReviewStatus;
}
