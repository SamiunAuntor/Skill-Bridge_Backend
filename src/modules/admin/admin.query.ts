import { Prisma } from "../../generated/prisma/client";
import { QueryBuilder } from "../../shared/query-builder/QueryBuilder";
import {
    AdminBookingSortOption,
    AdminBookingsQuery,
    AdminCategoriesQuery,
    AdminDegreesQuery,
    AdminMasterSortOption,
    AdminSubjectsQuery,
    AdminUserSortOption,
    AdminUsersQuery,
} from "./admin.types";

export const adminQueryDefaults = {
    page: 1,
    limit: 10,
};

function getAdminUserOrderBy(
    sortBy: AdminUserSortOption
): Prisma.UserOrderByWithRelationInput[] {
    switch (sortBy) {
        case "oldest":
            return [{ createdAt: "asc" }];
        case "name_asc":
            return [{ firstName: "asc" }, { name: "asc" }];
        case "name_desc":
            return [{ firstName: "desc" }, { name: "desc" }];
        case "email_asc":
            return [{ email: "asc" }];
        case "email_desc":
            return [{ email: "desc" }];
        case "newest":
        default:
            return [{ createdAt: "desc" }];
    }
}

function getAdminBookingOrderBy(
    sortBy: AdminBookingSortOption
): Prisma.BookingOrderByWithRelationInput[] {
    switch (sortBy) {
        case "session_asc":
            return [{ startTime: "asc" }];
        case "amount_high":
            return [{ priceAtBooking: "desc" }, { startTime: "desc" }];
        case "amount_low":
            return [{ priceAtBooking: "asc" }, { startTime: "desc" }];
        case "oldest":
            return [{ createdAt: "asc" }];
        case "newest":
            return [{ createdAt: "desc" }];
        case "session_desc":
        default:
            return [{ startTime: "desc" }];
    }
}

function getMasterOrderBy(
    sortBy: AdminMasterSortOption
): Prisma.CategoryOrderByWithRelationInput[] {
    switch (sortBy) {
        case "display_desc":
            return [{ displayOrder: "desc" }, { name: "asc" }];
        case "name_asc":
            return [{ name: "asc" }];
        case "name_desc":
            return [{ name: "desc" }];
        case "newest":
            return [{ createdAt: "desc" }];
        case "oldest":
            return [{ createdAt: "asc" }];
        case "display_asc":
        default:
            return [{ displayOrder: "asc" }, { name: "asc" }];
    }
}

function getSubjectOrderBy(
    sortBy: AdminMasterSortOption
): Prisma.SubjectOrderByWithRelationInput[] {
    switch (sortBy) {
        case "display_desc":
            return [{ displayOrder: "desc" }, { name: "asc" }];
        case "name_asc":
            return [{ name: "asc" }];
        case "name_desc":
            return [{ name: "desc" }];
        case "newest":
            return [{ createdAt: "desc" }];
        case "oldest":
            return [{ createdAt: "asc" }];
        case "display_asc":
        default:
            return [{ displayOrder: "asc" }, { name: "asc" }];
    }
}

function getDegreeOrderBy(
    sortBy: AdminMasterSortOption
): Prisma.DegreeOrderByWithRelationInput[] {
    switch (sortBy) {
        case "display_desc":
            return [{ displayOrder: "desc" }, { name: "asc" }];
        case "name_asc":
            return [{ name: "asc" }];
        case "name_desc":
            return [{ name: "desc" }];
        case "newest":
            return [{ createdAt: "desc" }];
        case "oldest":
            return [{ createdAt: "asc" }];
        case "display_asc":
        default:
            return [{ displayOrder: "asc" }, { name: "asc" }];
    }
}

export function buildAdminUsersQuery(filters: AdminUsersQuery) {
    return new QueryBuilder<
        Prisma.UserWhereInput,
        Prisma.UserOrderByWithRelationInput
    >({
        deletedAt: null,
        role: {
            in: ["student", "tutor"],
        },
    })
        .filter(
            filters.role
                ? {
                      role: filters.role,
                  }
                : null
        )
        .filter(
            typeof filters.banned === "boolean"
                ? { isBanned: filters.banned }
                : null
        )
        .filter(
            typeof filters.verified === "boolean"
                ? { emailVerified: filters.verified }
                : null
        )
        .search(filters.q, (searchTerm) => [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            { firstName: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
        ])
        .sort(filters.sortBy, getAdminUserOrderBy)
        .paginate({
            page: filters.page,
            limit: filters.limit,
        })
        .build();
}

export function buildAdminBookingsQuery(filters: AdminBookingsQuery) {
    return new QueryBuilder<
        Prisma.BookingWhereInput,
        Prisma.BookingOrderByWithRelationInput
    >({
        deletedAt: null,
    })
        .filter(
            filters.status
                ? {
                      status: filters.status,
                  }
                : null
        )
        .filter(
            filters.paymentStatus
                ? {
                      paymentStatus: filters.paymentStatus,
                  }
                : null
        )
        .search(filters.q, (searchTerm) => [
            { student: { name: { contains: searchTerm, mode: "insensitive" } } },
            { student: { email: { contains: searchTerm, mode: "insensitive" } } },
            { tutor: { user: { name: { contains: searchTerm, mode: "insensitive" } } } },
            { tutor: { user: { email: { contains: searchTerm, mode: "insensitive" } } } },
            { id: { contains: searchTerm, mode: "insensitive" } },
        ])
        .sort(filters.sortBy, getAdminBookingOrderBy)
        .paginate({
            page: filters.page,
            limit: filters.limit,
        })
        .build();
}

export function buildAdminCategoriesQuery(filters: AdminCategoriesQuery) {
    return new QueryBuilder<
        Prisma.CategoryWhereInput,
        Prisma.CategoryOrderByWithRelationInput
    >({})
        .filter(
            typeof filters.isActive === "boolean"
                ? { isActive: filters.isActive }
                : null
        )
        .search(filters.q, (searchTerm) => [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { slug: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
        ])
        .sort(filters.sortBy, getMasterOrderBy)
        .paginate({
            page: filters.page,
            limit: filters.limit,
        })
        .build();
}

export function buildAdminSubjectsQuery(filters: AdminSubjectsQuery) {
    return new QueryBuilder<
        Prisma.SubjectWhereInput,
        Prisma.SubjectOrderByWithRelationInput
    >({})
        .filter(
            typeof filters.isActive === "boolean"
                ? { isActive: filters.isActive }
                : null
        )
        .filter(
            filters.categoryId
                ? {
                      categoryId: filters.categoryId,
                  }
                : null
        )
        .search(filters.q, (searchTerm) => [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { slug: { contains: searchTerm, mode: "insensitive" } },
            { shortDescription: { contains: searchTerm, mode: "insensitive" } },
            { category: { name: { contains: searchTerm, mode: "insensitive" } } },
        ])
        .sort(filters.sortBy, getSubjectOrderBy)
        .paginate({
            page: filters.page,
            limit: filters.limit,
        })
        .build();
}

export function buildAdminDegreesQuery(filters: AdminDegreesQuery) {
    return new QueryBuilder<
        Prisma.DegreeWhereInput,
        Prisma.DegreeOrderByWithRelationInput
    >({})
        .filter(
            typeof filters.isActive === "boolean"
                ? { isActive: filters.isActive }
                : null
        )
        .search(filters.q, (searchTerm) => [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { slug: { contains: searchTerm, mode: "insensitive" } },
            { level: { contains: searchTerm, mode: "insensitive" } },
        ])
        .sort(filters.sortBy, getDegreeOrderBy)
        .paginate({
            page: filters.page,
            limit: filters.limit,
        })
        .build();
}
