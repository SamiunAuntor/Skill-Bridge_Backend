import { Prisma } from "../../generated/prisma/client";
import { QueryBuilder } from "../../shared/query-builder/QueryBuilder";
import { TutorListQuery, TutorSortOption } from "./tutor.types";

const defaultListPage = 1;
const defaultListLimit = 10;

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

function createTutorBaseWhereClause(): Prisma.TutorProfileWhereInput {
    return {
        deletedAt: null,
        professionalTitle: {
            not: "",
        },
        bio: {
            not: "",
        },
        hourlyRate: {
            gt: 0,
        },
        categories: {
            some: {},
        },
        subjects: {
            some: {},
        },
        user: {
            isBanned: false,
            deletedAt: null,
            role: "tutor",
        },
    };
}

function createTutorSubjectFilter(
    subject: string | undefined
): Prisma.TutorProfileWhereInput | null {
    if (!subject) {
        return null;
    }

    return {
        subjects: {
            some: {
                subject: {
                    slug: subject,
                },
            },
        },
    };
}

function createTutorCategoryFilter(
    category: string | undefined
): Prisma.TutorProfileWhereInput | null {
    if (!category) {
        return null;
    }

    return {
        categories: {
            some: {
                category: {
                    slug: category,
                },
            },
        },
    };
}

function createTutorSearchFilter(
    q: string | undefined
): Prisma.TutorProfileWhereInput | null {
    const normalizedQuery = q?.trim();

    if (!normalizedQuery) {
        return null;
    }

    return {
        OR: [
            {
                professionalTitle: {
                    contains: normalizedQuery,
                    mode: "insensitive",
                },
            },
            {
                bio: {
                    contains: normalizedQuery,
                    mode: "insensitive",
                },
            },
            {
                user: {
                    OR: [
                        {
                            name: {
                                contains: normalizedQuery,
                                mode: "insensitive",
                            },
                        },
                        {
                            firstName: {
                                contains: normalizedQuery,
                                mode: "insensitive",
                            },
                        },
                        {
                            lastName: {
                                contains: normalizedQuery,
                                mode: "insensitive",
                            },
                        },
                    ],
                },
            },
            {
                categories: {
                    some: {
                        category: {
                            name: {
                                contains: normalizedQuery,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            },
            {
                subjects: {
                    some: {
                        subject: {
                            name: {
                                contains: normalizedQuery,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            },
        ],
    };
}

function createTutorPriceFilter(
    filters: TutorListQuery
): Prisma.TutorProfileWhereInput | null {
    if (
        typeof filters.minPrice !== "number" &&
        typeof filters.maxPrice !== "number"
    ) {
        return null;
    }

    const hourlyRate: Prisma.FloatFilter<"TutorProfile"> = {};

    if (typeof filters.minPrice === "number") {
        hourlyRate.gte = filters.minPrice;
    }

    if (typeof filters.maxPrice === "number") {
        hourlyRate.lte = filters.maxPrice;
    }

    return { hourlyRate };
}

function createTutorRatingFilter(
    minRating: number | undefined
): Prisma.TutorProfileWhereInput | null {
    if (typeof minRating !== "number") {
        return null;
    }

    return {
        averageRating: {
            gte: minRating,
        },
    };
}

function createTutorAvailabilityFilter(
    availability: boolean | undefined
): Prisma.TutorProfileWhereInput | null {
    if (!availability) {
        return null;
    }

    return {
        availability: {
            some: {
                isBooked: false,
                deletedAt: null,
                startAt: {
                    gte: new Date(),
                },
            },
        },
    };
}

export function buildTutorListPrismaQuery(filters: TutorListQuery) {
    return new QueryBuilder<
        Prisma.TutorProfileWhereInput,
        Prisma.TutorProfileOrderByWithRelationInput
    >(createTutorBaseWhereClause())
        .filter(createTutorSearchFilter(filters.q))
        .filter(createTutorCategoryFilter(filters.category))
        .filter(createTutorSubjectFilter(filters.subject))
        .filter(createTutorPriceFilter(filters))
        .filter(createTutorRatingFilter(filters.minRating))
        .filter(createTutorAvailabilityFilter(filters.availability))
        .sort(filters.sortBy, getTutorOrderBy)
        .paginate({
            page: filters.page,
            limit: filters.limit,
        })
        .build();
}

export function buildTutorDetailWhere(tutorId: string): Prisma.TutorProfileWhereInput {
    return new QueryBuilder<
        Prisma.TutorProfileWhereInput,
        Prisma.TutorProfileOrderByWithRelationInput
    >(createTutorBaseWhereClause())
        .filter({
            id: tutorId,
        })
        .build().where;
}

export const tutorQueryDefaults = {
    page: defaultListPage,
    limit: defaultListLimit,
};
