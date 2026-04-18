import { BookingStatus, Prisma, Role, SessionStatus } from "../../generated/prisma/client";
import { QueryBuilder } from "../../shared/query-builder/QueryBuilder";
import { SessionListQuery, SessionListSortOption, sessionSortOptions } from "./booking.types";

function createSessionListBaseWhere(
    userId: string,
    role: "student" | "tutor"
): Prisma.BookingWhereInput {
    return role === Role.student
        ? {
              studentId: userId,
              deletedAt: null,
              session: {
                  isNot: null,
              },
          }
        : {
              deletedAt: null,
              tutor: {
                  userId,
                  deletedAt: null,
              },
              session: {
                  isNot: null,
              },
          };
}

function createSessionSearchConditions(
    role: "student" | "tutor",
    search: string
): Prisma.BookingWhereInput[] {
    const normalizedSearch = search.trim().toLowerCase();
    const numericSearch =
        normalizedSearch && !Number.isNaN(Number(normalizedSearch))
            ? Number(normalizedSearch)
            : null;

    const conditions: Prisma.BookingWhereInput[] =
        role === Role.student
            ? [
                  { tutor: { user: { name: { contains: search, mode: "insensitive" } } } },
                  { tutor: { user: { firstName: { contains: search, mode: "insensitive" } } } },
                  { tutor: { user: { lastName: { contains: search, mode: "insensitive" } } } },
                  { tutor: { user: { email: { contains: search, mode: "insensitive" } } } },
              ]
            : [
                  { student: { name: { contains: search, mode: "insensitive" } } },
                  { student: { firstName: { contains: search, mode: "insensitive" } } },
                  { student: { lastName: { contains: search, mode: "insensitive" } } },
                  { student: { email: { contains: search, mode: "insensitive" } } },
              ];

    if (numericSearch !== null) {
        conditions.push({
            priceAtBooking: numericSearch,
        });
    }

    return conditions;
}

function createSessionStatusFilter(
    sortBy: SessionListSortOption
): Prisma.BookingWhereInput | null {
    if (sortBy === "upcoming_only") {
        return {
            session: {
                is: {
                    status: {
                        in: [SessionStatus.scheduled, SessionStatus.ongoing],
                    },
                },
            },
        };
    }

    if (sortBy === "completed_only") {
        return {
            session: {
                is: {
                    status: SessionStatus.completed,
                },
            },
        };
    }

    if (sortBy === "cancelled_only") {
        return {
            session: {
                is: {
                    status: SessionStatus.cancelled,
                },
            },
        };
    }

    return null;
}

function getSessionOrderBy(
    sortBy: SessionListSortOption
): Prisma.BookingOrderByWithRelationInput[] {
    if (sortBy === "amount_high") {
        return [{ priceAtBooking: "desc" }, { startTime: "asc" }];
    }

    if (sortBy === "amount_low") {
        return [{ priceAtBooking: "asc" }, { startTime: "asc" }];
    }

    if (sortBy === "time_desc") {
        return [{ startTime: "desc" }, { createdAt: "desc" }];
    }

    return [{ startTime: "asc" }, { createdAt: "desc" }];
}

export function buildSessionListPrismaQuery(
    userId: string,
    role: "student" | "tutor",
    filters: SessionListQuery
) {
    return new QueryBuilder<
        Prisma.BookingWhereInput,
        Prisma.BookingOrderByWithRelationInput
    >(createSessionListBaseWhere(userId, role))
        .search(filters.search, (searchTerm) =>
            createSessionSearchConditions(role, searchTerm)
        )
        .filter(createSessionStatusFilter(filters.sortBy))
        .sort(filters.sortBy, getSessionOrderBy)
        .build();
}

export function buildSessionStatsBaseWhere(
    userId: string,
    role: "student" | "tutor"
): Prisma.BookingWhereInput {
    return createSessionListBaseWhere(userId, role);
}

export { sessionSortOptions };
