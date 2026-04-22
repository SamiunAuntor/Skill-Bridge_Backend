import { BookingStatus, PaymentStatus } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { toDisplayName } from "../../shared/utils";
import { HttpError } from "../../utils/http-error";
import { deleteUploadedAsset } from "../upload/upload.services";
import {
    buildAdminBookingsQuery,
    buildAdminCategoriesQuery,
    buildAdminDegreesQuery,
    buildAdminSubjectsQuery,
    buildAdminUsersQuery,
} from "./admin.query";
import {
    AdminBookingsQuery,
    AdminBookingsResponse,
    AdminCategoriesQuery,
    AdminCategoriesResponse,
    AdminCategoryUpsertInput,
    AdminDashboardResponse,
    AdminDegreesQuery,
    AdminDegreesResponse,
    AdminDegreeUpsertInput,
    AdminSubjectsQuery,
    AdminSubjectsResponse,
    AdminSubjectUpsertInput,
    AdminUserStatusUpdateInput,
    AdminUsersQuery,
    AdminUsersResponse,
} from "./admin.types";

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getPagination(page: number, limit: number, totalItems: number) {
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
}

function buildLastSixMonthBuckets(): Array<{
    label: string;
    start: Date;
    end: Date;
}> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return Array.from({ length: 6 }, (_, index) => {
        const offset = 5 - index;
        const start = new Date(
            currentMonthStart.getFullYear(),
            currentMonthStart.getMonth() - offset,
            1
        );
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

        return {
            label: new Intl.DateTimeFormat("en-BD", {
                month: "short",
                year: "2-digit",
            }).format(start),
            start,
            end,
        };
    });
}

function buildMonthlyTrend(
    dates: Date[],
    buckets: ReturnType<typeof buildLastSixMonthBuckets>
) {
    return buckets.map((bucket) => ({
        label: bucket.label,
        count: dates.filter(
            (value) => value >= bucket.start && value < bucket.end
        ).length,
    }));
}

export async function getAdminDashboardData(): Promise<AdminDashboardResponse> {
    const monthBuckets = buildLastSixMonthBuckets();
    const trendStartDate = monthBuckets[0]?.start ?? new Date();

    const [
        totalUsers,
        totalStudents,
        totalTutors,
        totalBookings,
        totalCategories,
        totalSubjects,
        totalDegrees,
        bannedUsers,
        studentRegistrations,
        tutorRegistrations,
        bookingCreations,
        bookingStatusBreakdown,
    ] = await Promise.all([
        prisma.user.count({
            where: {
                deletedAt: null,
                role: {
                    in: ["student", "tutor"],
                },
            },
        }),
        prisma.user.count({
            where: {
                deletedAt: null,
                role: "student",
            },
        }),
        prisma.user.count({
            where: {
                deletedAt: null,
                role: "tutor",
            },
        }),
        prisma.booking.count({
            where: {
                deletedAt: null,
            },
        }),
        prisma.category.count(),
        prisma.subject.count(),
        prisma.degree.count(),
        prisma.user.count({
            where: {
                deletedAt: null,
                isBanned: true,
                role: {
                    in: ["student", "tutor"],
                },
            },
        }),
        prisma.user.findMany({
            where: {
                deletedAt: null,
                role: "student",
                createdAt: {
                    gte: trendStartDate,
                },
            },
            select: {
                createdAt: true,
            },
        }),
        prisma.user.findMany({
            where: {
                deletedAt: null,
                role: "tutor",
                createdAt: {
                    gte: trendStartDate,
                },
            },
            select: {
                createdAt: true,
            },
        }),
        prisma.booking.findMany({
            where: {
                deletedAt: null,
                createdAt: {
                    gte: trendStartDate,
                },
            },
            select: {
                createdAt: true,
            },
        }),
        prisma.booking.groupBy({
            by: ["status"],
            where: {
                deletedAt: null,
            },
            _count: {
                status: true,
            },
        }),
    ]);

    return {
        stats: {
            totalUsers,
            totalStudents,
            totalTutors,
            totalBookings,
            totalCategories,
            totalSubjects,
            totalDegrees,
            bannedUsers,
        },
        charts: {
            studentRegistrations: buildMonthlyTrend(
                studentRegistrations.map((item) => item.createdAt),
                monthBuckets
            ),
            tutorRegistrations: buildMonthlyTrend(
                tutorRegistrations.map((item) => item.createdAt),
                monthBuckets
            ),
            bookingTrend: buildMonthlyTrend(
                bookingCreations.map((item) => item.createdAt),
                monthBuckets
            ),
            bookingStatusBreakdown: [
                BookingStatus.confirmed,
                BookingStatus.completed,
                BookingStatus.cancelled,
                BookingStatus.no_show,
            ].map((status) => ({
                status,
                count:
                    bookingStatusBreakdown.find((item) => item.status === status)?._count
                        .status ?? 0,
            })),
        },
    };
}

export async function getAdminUsers(
    filters: AdminUsersQuery
): Promise<AdminUsersResponse> {
    const query = buildAdminUsersQuery(filters);

    const [totalItems, users] = await Promise.all([
        prisma.user.count({
            where: query.where,
        }),
        prisma.user.findMany({
            where: query.where,
            orderBy: query.orderBy,
            ...(query.pagination
                ? {
                    skip: query.pagination.skip,
                    take: query.pagination.take,
                }
                : {}),
            include: {
                tutorProfile: {
                    select: {
                        id: true,
                    },
                },
            },
        }),
    ]);

    return {
        users: users.map((user) => ({
            id: user.id,
            name: toDisplayName(user),
            email: user.email,
            role: user.role as "student" | "tutor",
            isBanned: user.isBanned,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
            tutorProfileId: user.tutorProfile?.id ?? null,
        })),
        pagination: getPagination(filters.page, filters.limit, totalItems),
        filters,
    };
}

export async function updateAdminUserStatus(
    actorUserId: string,
    targetUserId: string,
    input: AdminUserStatusUpdateInput
): Promise<{ id: string; isBanned: boolean }> {
    if (actorUserId === targetUserId) {
        throw new HttpError(400, "You cannot change your own admin access status.");
    }

    const targetUser = await prisma.user.findUnique({
        where: {
            id: targetUserId,
        },
        select: {
            id: true,
            role: true,
        },
    });

    if (!targetUser || targetUser.role === "admin") {
        throw new HttpError(404, "User not found.");
    }

    const updatedUser = await prisma.user.update({
        where: {
            id: targetUserId,
        },
        data: {
            isBanned: input.isBanned,
        },
        select: {
            id: true,
            isBanned: true,
        },
    });

    if (input.isBanned) {
        await prisma.authSession.deleteMany({
            where: {
                userId: targetUserId,
            },
        });
    }

    return updatedUser;
}

export async function getAdminBookings(
    filters: AdminBookingsQuery
): Promise<AdminBookingsResponse> {
    const query = buildAdminBookingsQuery(filters);

    const [totalItems, bookings] = await Promise.all([
        prisma.booking.count({
            where: query.where,
        }),
        prisma.booking.findMany({
            where: query.where,
            orderBy: query.orderBy,
            ...(query.pagination
                ? {
                    skip: query.pagination.skip,
                    take: query.pagination.take,
                }
                : {}),
            include: {
                student: true,
                tutor: {
                    include: {
                        user: true,
                    },
                },
            },
        }),
    ]);

    return {
        bookings: bookings.map((booking) => ({
            id: booking.id,
            bookingStatus: booking.status,
            paymentStatus: booking.paymentStatus,
            sessionDate: booking.sessionDate.toISOString(),
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            priceAtBooking: booking.priceAtBooking,
            createdAt: booking.createdAt.toISOString(),
            student: {
                id: booking.student.id,
                name: toDisplayName(booking.student),
                email: booking.student.email,
            },
            tutor: {
                id: booking.tutor.user.id,
                profileId: booking.tutor.id,
                name: toDisplayName(booking.tutor.user),
                email: booking.tutor.user.email,
            },
        })),
        pagination: getPagination(filters.page, filters.limit, totalItems),
        filters,
    };
}

export async function getAdminCategories(
    filters: AdminCategoriesQuery
): Promise<AdminCategoriesResponse> {
    const query = buildAdminCategoriesQuery(filters);

    const [totalItems, categories] = await Promise.all([
        prisma.category.count({ where: query.where }),
        prisma.category.findMany({
            where: query.where,
            orderBy: query.orderBy,
            ...(query.pagination
                ? {
                    skip: query.pagination.skip,
                    take: query.pagination.take,
                }
                : {}),
            include: {
                _count: {
                    select: {
                        subjects: true,
                        tutors: true,
                    },
                },
            },
        }),
    ]);

    return {
        categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description ?? null,
            isActive: category.isActive,
            subjectCount: category._count.subjects,
            tutorCount: category._count.tutors,
            createdAt: category.createdAt.toISOString(),
        })),
        pagination: getPagination(filters.page, filters.limit, totalItems),
        filters,
    };
}

export async function createAdminCategory(input: AdminCategoryUpsertInput) {
    const name = input.name.trim();
    const slug = slugify(name);

    if (!slug) {
        throw new HttpError(400, "Category slug could not be generated.");
    }

    return prisma.category.create({
        data: {
            name,
            slug,
            description: input.description?.trim() || null,
            isActive: input.isActive ?? true,
        },
    });
}

export async function updateAdminCategory(
    id: string,
    input: AdminCategoryUpsertInput
) {
    const existing = await prisma.category.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!existing) {
        throw new HttpError(404, "Category not found.");
    }

    const name = input.name.trim();
    const slug = slugify(name);

    if (!slug) {
        throw new HttpError(400, "Category slug could not be generated.");
    }

    return prisma.category.update({
        where: { id },
        data: {
            name,
            slug,
            description: input.description?.trim() || null,
            ...(typeof input.isActive === "boolean"
                ? { isActive: input.isActive }
                : {}),
        },
    });
}

export async function deleteAdminCategory(id: string): Promise<void> {
    const category = await prisma.category.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    subjects: true,
                    tutors: true,
                },
            },
        },
    });

    if (!category) {
        throw new HttpError(404, "Category not found.");
    }

    if (category._count.subjects > 0 || category._count.tutors > 0) {
        throw new HttpError(
            400,
            "This category is still in use. Remove linked subjects and tutors or deactivate it instead."
        );
    }

    await prisma.category.delete({
        where: { id },
    });
}

export async function getAdminSubjects(
    filters: AdminSubjectsQuery
): Promise<AdminSubjectsResponse> {
    const query = buildAdminSubjectsQuery(filters);

    const [totalItems, subjects] = await Promise.all([
        prisma.subject.count({ where: query.where }),
        prisma.subject.findMany({
            where: query.where,
            orderBy: query.orderBy,
            ...(query.pagination
                ? {
                    skip: query.pagination.skip,
                    take: query.pagination.take,
                }
                : {}),
            include: {
                category: true,
                _count: {
                    select: {
                        tutors: true,
                    },
                },
            },
        }),
    ]);

    return {
        subjects: subjects.map((subject) => ({
            id: subject.id,
            categoryId: subject.categoryId,
            categoryName: subject.category.name,
            name: subject.name,
            description: subject.description ?? null,
            iconUrl: subject.iconUrl ?? null,
            iconPublicId: subject.iconPublicId ?? null,
            isActive: subject.isActive,
            tutorCount: subject._count.tutors,
            createdAt: subject.createdAt.toISOString(),
        })),
        pagination: getPagination(filters.page, filters.limit, totalItems),
        filters,
    };
}

export async function createAdminSubject(input: AdminSubjectUpsertInput) {
    const category = await prisma.category.findUnique({
        where: {
            id: input.categoryId,
        },
        select: {
            id: true,
        },
    });

    if (!category) {
        throw new HttpError(400, "Selected category is invalid.");
    }

    const name = input.name.trim();
    const slug = slugify(name);

    if (!slug) {
        throw new HttpError(400, "Subject slug could not be generated.");
    }

    return prisma.subject.create({
        data: {
            categoryId: input.categoryId,
            name,
            slug,
            description: input.description?.trim() || null,
            iconUrl: input.iconUrl?.trim() || null,
            iconPublicId: input.iconPublicId?.trim() || null,
            isActive: input.isActive ?? true,
        },
    });
}

export async function updateAdminSubject(
    id: string,
    input: AdminSubjectUpsertInput
) {
    const [existing, category] = await Promise.all([
        prisma.subject.findUnique({
            where: { id },
            select: { id: true, iconPublicId: true },
        }),
        prisma.category.findUnique({
            where: { id: input.categoryId },
            select: { id: true },
        }),
    ]);

    if (!existing) {
        throw new HttpError(404, "Subject not found.");
    }

    if (!category) {
        throw new HttpError(400, "Selected category is invalid.");
    }

    const name = input.name.trim();
    const slug = slugify(name);

    if (!slug) {
        throw new HttpError(400, "Subject slug could not be generated.");
    }

    const updatedSubject = await prisma.subject.update({
        where: { id },
        data: {
            categoryId: input.categoryId,
            name,
            slug,
            description: input.description?.trim() || null,
            iconUrl: input.iconUrl?.trim() || null,
            iconPublicId: input.iconPublicId?.trim() || null,
            ...(typeof input.isActive === "boolean"
                ? { isActive: input.isActive }
                : {}),
        },
    });

    if (
        existing.iconPublicId &&
        existing.iconPublicId !== updatedSubject.iconPublicId
    ) {
        try {
            await deleteUploadedAsset({
                publicId: existing.iconPublicId,
                resourceType: "image",
            });
        } catch {
            // Best-effort cleanup only; failed old-asset cleanup should not break the admin update.
        }
    }

    return updatedSubject;
}

export async function deleteAdminSubject(id: string): Promise<void> {
    const subject = await prisma.subject.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    tutors: true,
                },
            },
        },
    });

    if (!subject) {
        throw new HttpError(404, "Subject not found.");
    }

    if (subject._count.tutors > 0) {
        throw new HttpError(
            400,
            "This subject is linked to tutors. Remove those tutor assignments or deactivate it instead."
        );
    }

    await prisma.subject.delete({
        where: { id },
    });

    if (subject.iconPublicId) {
        try {
            await deleteUploadedAsset({
                publicId: subject.iconPublicId,
                resourceType: "image",
            });
        } catch {
            // Best-effort cleanup only; failed remote deletion should not break local DB deletion.
        }
    }
}

export async function getAdminDegrees(
    filters: AdminDegreesQuery
): Promise<AdminDegreesResponse> {
    const query = buildAdminDegreesQuery(filters);

    const [totalItems, degrees] = await Promise.all([
        prisma.degree.count({ where: query.where }),
        prisma.degree.findMany({
            where: query.where,
            orderBy: query.orderBy,
            ...(query.pagination
                ? {
                    skip: query.pagination.skip,
                    take: query.pagination.take,
                }
                : {}),
            include: {
                _count: {
                    select: {
                        educations: true,
                    },
                },
            },
        }),
    ]);

    return {
        degrees: degrees.map((degree) => ({
            id: degree.id,
            name: degree.name,
            level: degree.level ?? null,
            isActive: degree.isActive,
            usageCount: degree._count.educations,
            createdAt: degree.createdAt.toISOString(),
        })),
        pagination: getPagination(filters.page, filters.limit, totalItems),
        filters,
    };
}

export async function createAdminDegree(input: AdminDegreeUpsertInput) {
    const name = input.name.trim();

    return prisma.degree.create({
        data: {
            name,
            level: input.level?.trim() || null,
            isActive: input.isActive ?? true,
        },
    });
}

export async function updateAdminDegree(
    id: string,
    input: AdminDegreeUpsertInput
) {
    const existing = await prisma.degree.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!existing) {
        throw new HttpError(404, "Degree not found.");
    }

    const name = input.name.trim();

    return prisma.degree.update({
        where: { id },
        data: {
            name,
            level: input.level?.trim() || null,
            ...(typeof input.isActive === "boolean"
                ? { isActive: input.isActive }
                : {}),
        },
    });
}

export async function deleteAdminDegree(id: string): Promise<void> {
    const degree = await prisma.degree.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    educations: true,
                },
            },
        },
    });

    if (!degree) {
        throw new HttpError(404, "Degree not found.");
    }

    if (degree._count.educations > 0) {
        throw new HttpError(
            400,
            "This degree is already used in tutor education history. Deactivate it instead."
        );
    }

    await prisma.degree.delete({
        where: { id },
    });
}
