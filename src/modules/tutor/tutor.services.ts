import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { HttpError } from "../../utils/http-error";
import {
    TutorDetailResponse,
    TutorListQuery,
    TutorListResponse,
    TutorSortOption,
} from "./tutor.types";

const defaultListPage = 1;
const defaultListLimit = 9;

function getTutorOrderBy(
    sortBy: TutorSortOption
): Prisma.TutorProfileOrderByWithRelationInput[] {
    switch (sortBy) {
        case "highest_rated":
            return [{ averageRating: "desc" }, { totalReviews: "desc" }];
        case "lowest_rated":
            return [{ averageRating: "asc" }, { totalReviews: "desc" }];
        case "lowest_price":
            return [{ hourlyRate: "asc" }, { averageRating: "desc" }];
        case "highest_price":
            return [{ hourlyRate: "desc" }, { averageRating: "desc" }];
        case "most_reviewed":
            return [{ totalReviews: "desc" }, { averageRating: "desc" }];
        case "recommended":
        default:
            return [
                { isTopRated: "desc" },
                { averageRating: "desc" },
                { totalReviews: "desc" },
                { hourlyRate: "asc" },
            ];
    }
}

function buildTutorWhereClause(
    filters: TutorListQuery
): Prisma.TutorProfileWhereInput {
    const where: Prisma.TutorProfileWhereInput = {
        deletedAt: null,
        user: {
            isBanned: false,
            deletedAt: null,
            role: "tutor",
        },
    };

    if (filters.subject) {
        where.OR = [
            {
                categories: {
                    some: {
                        category: {
                            slug: filters.subject,
                        },
                    },
                },
            },
            {
                expertise: {
                    some: {
                        slug: filters.subject,
                    },
                },
            },
        ];
    }

    if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
        where.hourlyRate = {};

        if (typeof filters.minPrice === "number") {
            where.hourlyRate.gte = filters.minPrice;
        }

        if (typeof filters.maxPrice === "number") {
            where.hourlyRate.lte = filters.maxPrice;
        }
    }

    if (typeof filters.minRating === "number") {
        where.averageRating = {
            gte: filters.minRating,
        };
    }

    if (filters.availability) {
        where.availability = {
            some: {
                isBooked: false,
                deletedAt: null,
                startTime: {
                    gte: new Date(),
                },
            },
        };
    }

    return where;
}

function toDisplayName(input: {
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}): string {
    const fullName = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
    return fullName || input.name.trim() || input.email;
}

export async function getTutors(
    filters: TutorListQuery
): Promise<TutorListResponse> {
    const skip = (filters.page - defaultListPage) * filters.limit;
    const where = buildTutorWhereClause(filters);
    const orderBy = getTutorOrderBy(filters.sortBy);
    const now = new Date();

    const [totalItems, tutors] = await Promise.all([
        prisma.tutorProfile.count({ where }),
        prisma.tutorProfile.findMany({
            where,
            orderBy,
            skip,
            take: filters.limit,
            include: {
                user: true,
                categories: {
                    include: {
                        category: true,
                    },
                },
                expertise: true,
                availability: {
                    where: {
                        isBooked: false,
                        deletedAt: null,
                        startTime: {
                            gte: now,
                        },
                    },
                    orderBy: {
                        startTime: "asc",
                    },
                    take: 1,
                },
            },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / filters.limit));

    return {
        tutors: tutors.map((tutor) => ({
            id: tutor.id,
            userId: tutor.userId,
            displayName: toDisplayName(tutor.user),
            avatarUrl: tutor.user.avatarUrl ?? tutor.user.image ?? null,
            bio: tutor.bio,
            hourlyRate: tutor.hourlyRate,
            experienceYears: tutor.experienceYears,
            averageRating: tutor.averageRating,
            totalReviews: tutor.totalReviews,
            isTopRated: tutor.isTopRated,
            categories: tutor.categories.map(({ category }) => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
            })),
            expertise: tutor.expertise.map((item) => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
            })),
            hasAvailability: tutor.availability.length > 0,
            nextAvailableSlot: tutor.availability[0]?.startTime.toISOString() ?? null,
        })),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalItems,
            totalPages,
            hasNextPage: filters.page < totalPages,
            hasPreviousPage: filters.page > 1,
        },
        filters,
    };
}

export async function getTutorById(
    tutorId: string
): Promise<TutorDetailResponse> {
    const now = new Date();

    const tutor = await prisma.tutorProfile.findFirst({
        where: {
            id: tutorId,
            deletedAt: null,
            user: {
                isBanned: false,
                deletedAt: null,
                role: "tutor",
            },
        },
        include: {
            user: true,
            categories: {
                include: {
                    category: true,
                },
            },
            expertise: {
                orderBy: {
                    name: "asc",
                },
            },
            education: {
                orderBy: [{ endYear: "desc" }, { startYear: "desc" }],
            },
            availability: {
                where: {
                    isBooked: false,
                    deletedAt: null,
                    startTime: {
                        gte: now,
                    },
                },
                orderBy: {
                    startTime: "asc",
                },
                take: 30,
            },
            reviews: {
                where: {
                    deletedAt: null,
                    isVisible: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    student: true,
                },
                take: 20,
            },
        },
    });

    if (!tutor) {
        throw new HttpError(404, "Tutor not found.");
    }

    return {
        tutor: {
            id: tutor.id,
            userId: tutor.userId,
            displayName: toDisplayName(tutor.user),
            email: tutor.user.email,
            avatarUrl: tutor.user.avatarUrl ?? tutor.user.image ?? null,
            bio: tutor.bio,
            hourlyRate: tutor.hourlyRate,
            experienceYears: tutor.experienceYears,
            totalHoursTaught: tutor.totalHoursTaught,
            totalEarnings: tutor.totalEarnings,
            averageRating: tutor.averageRating,
            totalReviews: tutor.totalReviews,
            isTopRated: tutor.isTopRated,
            categories: tutor.categories.map(({ category }) => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
            })),
            expertise: tutor.expertise.map((item) => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
            })),
            education: tutor.education.map((item) => ({
                id: item.id,
                degree: item.degree,
                institution: item.institution,
                fieldOfStudy: item.fieldOfStudy,
                startYear: item.startYear,
                endYear: item.endYear,
                description: item.description,
            })),
            testimonials: tutor.reviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt.toISOString(),
                student: {
                    id: review.student.id,
                    name: toDisplayName(review.student),
                    avatarUrl: review.student.avatarUrl ?? review.student.image ?? null,
                },
            })),
            availableSlots: tutor.availability.map((slot) => ({
                id: slot.id,
                date: slot.date.toISOString(),
                startTime: slot.startTime.toISOString(),
                endTime: slot.endTime.toISOString(),
            })),
        },
    };
}

export const tutorDefaults = {
    page: defaultListPage,
    limit: defaultListLimit,
};
