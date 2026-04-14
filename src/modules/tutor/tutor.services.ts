import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { HttpError } from "../../utils/http-error";
import {
    TutorDetailResponse,
    TutorEditableProfileResponse,
    TutorListQuery,
    TutorListResponse,
    TutorProfileUpdateInput,
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
    const andClauses: Prisma.TutorProfileWhereInput[] = [];

    const where: Prisma.TutorProfileWhereInput = {
        deletedAt: null,
        AND: andClauses,
        user: {
            isBanned: false,
            deletedAt: null,
            role: "tutor",
        },
    };

    if (filters.subject) {
        andClauses.push({
            OR: [
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
            ],
        });
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

function toPublicBio(bio: string): string {
    const normalizedBio = bio.trim();
    return normalizedBio || "This tutor is setting up their public profile.";
}

function slugifyExpertiseName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toEditableEducation(input: {
    id: string;
    degree: string;
    institution: string;
    fieldOfStudy: string;
    startYear: number;
    endYear: number | null;
    description: string | null;
}) {
    return {
        id: input.id,
        degree: input.degree,
        institution: input.institution,
        fieldOfStudy: input.fieldOfStudy,
        startYear: input.startYear,
        endYear: input.endYear,
        description: input.description,
    };
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
            bio: toPublicBio(tutor.bio),
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
            ...buildTutorWhereClause({
                sortBy: "recommended",
                page: 1,
                limit: 1,
            }),
            id: tutorId,
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
            bio: toPublicBio(tutor.bio),
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

export async function getMyTutorProfile(
    userId: string
): Promise<TutorEditableProfileResponse> {
    const [tutor, categories] = await Promise.all([
        prisma.tutorProfile.findUnique({
            where: { userId },
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
            },
        }),
        prisma.category.findMany({
            orderBy: {
                name: "asc",
            },
        }),
    ]);

    if (!tutor || tutor.deletedAt) {
        throw new HttpError(404, "Tutor profile not found.");
    }

    return {
        profile: {
            id: tutor.id,
            userId: tutor.userId,
            displayName: toDisplayName(tutor.user),
            email: tutor.user.email,
            avatarUrl: tutor.user.avatarUrl ?? tutor.user.image ?? null,
            bio: tutor.bio,
            hourlyRate: tutor.hourlyRate,
            experienceYears: tutor.experienceYears,
            categoryIds: tutor.categories.map(({ categoryId }) => categoryId),
            expertise: tutor.expertise.map((item) => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
            })),
            education: tutor.education.map(toEditableEducation),
        },
        availableCategories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
        })),
    };
}

export async function updateMyTutorProfile(
    userId: string,
    payload: TutorProfileUpdateInput
): Promise<TutorEditableProfileResponse> {
    const tutor = await prisma.tutorProfile.findUnique({
        where: { userId },
        select: {
            id: true,
            deletedAt: true,
        },
    });

    if (!tutor || tutor.deletedAt) {
        throw new HttpError(404, "Tutor profile not found.");
    }

    const uniqueCategoryIds = [...new Set(payload.categoryIds)];
    const uniqueExpertise = Array.from(
        new Map(
            payload.expertise.map((item) => [
                item.id?.trim() || `new:${slugifyExpertiseName(item.name)}`,
                {
                    ...item,
                    name: item.name.trim(),
                },
            ])
        ).values()
    );
    const normalizedEducation = payload.education.map((item) => ({
        ...item,
        degree: item.degree.trim(),
        institution: item.institution.trim(),
        fieldOfStudy: item.fieldOfStudy?.trim() ?? "",
        description: item.description?.trim() || null,
    }));

    const validCategories = await prisma.category.findMany({
        where: {
            id: {
                in: uniqueCategoryIds,
            },
        },
        select: {
            id: true,
        },
    });

    if (validCategories.length !== uniqueCategoryIds.length) {
        throw new HttpError(400, "One or more selected categories are invalid.");
    }

    await prisma.$transaction(async (tx) => {
        await tx.tutorProfile.update({
            where: { id: tutor.id },
            data: {
                bio: payload.bio.trim(),
                hourlyRate: payload.hourlyRate,
                experienceYears: payload.experienceYears,
            },
        });

        await tx.tutorCategory.deleteMany({
            where: {
                tutorId: tutor.id,
                categoryId: {
                    notIn: uniqueCategoryIds.length > 0 ? uniqueCategoryIds : [""],
                },
            },
        });

        if (uniqueCategoryIds.length > 0) {
            await tx.tutorCategory.createMany({
                data: uniqueCategoryIds.map((categoryId) => ({
                    tutorId: tutor.id,
                    categoryId,
                })),
                skipDuplicates: true,
            });
        } else {
            await tx.tutorCategory.deleteMany({
                where: {
                    tutorId: tutor.id,
                },
            });
        }

        const existingExpertise = await tx.tutorExpertise.findMany({
            where: { tutorId: tutor.id },
            select: { id: true },
        });
        const keptExpertiseIds = uniqueExpertise
            .map((item) => item.id?.trim())
            .filter((value): value is string => Boolean(value));

        await tx.tutorExpertise.deleteMany({
            where: {
                tutorId: tutor.id,
                id: {
                    notIn: keptExpertiseIds.length > 0 ? keptExpertiseIds : [""],
                },
            },
        });

        for (const expertise of uniqueExpertise) {
            const slugBase = slugifyExpertiseName(expertise.name);
            const slug = slugBase || `expertise-${Date.now()}`;

            if (
                expertise.id &&
                existingExpertise.some((item) => item.id === expertise.id)
            ) {
                await tx.tutorExpertise.update({
                    where: { id: expertise.id },
                    data: {
                        name: expertise.name,
                        slug,
                    },
                });
            } else {
                await tx.tutorExpertise.create({
                    data: {
                        tutorId: tutor.id,
                        name: expertise.name,
                        slug,
                    },
                });
            }
        }

        const existingEducation = await tx.tutorEducation.findMany({
            where: { tutorId: tutor.id },
            select: { id: true },
        });
        const keptEducationIds = normalizedEducation
            .map((item) => item.id?.trim())
            .filter((value): value is string => Boolean(value));

        await tx.tutorEducation.deleteMany({
            where: {
                tutorId: tutor.id,
                id: {
                    notIn: keptEducationIds.length > 0 ? keptEducationIds : [""],
                },
            },
        });

        for (const educationItem of normalizedEducation) {
            const data = {
                degree: educationItem.degree,
                institution: educationItem.institution,
                fieldOfStudy: educationItem.fieldOfStudy,
                startYear: educationItem.startYear,
                endYear: educationItem.endYear ?? null,
                description: educationItem.description,
            };

            if (
                educationItem.id &&
                existingEducation.some((item) => item.id === educationItem.id)
            ) {
                await tx.tutorEducation.update({
                    where: { id: educationItem.id },
                    data,
                });
            } else {
                await tx.tutorEducation.create({
                    data: {
                        tutorId: tutor.id,
                        ...data,
                    },
                });
            }
        }
    });

    return getMyTutorProfile(userId);
}

export const tutorDefaults = {
    page: defaultListPage,
    limit: defaultListLimit,
};
