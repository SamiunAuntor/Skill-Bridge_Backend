import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { HttpError } from "../../utils/http-error";
import {
    TutorDetailResponse,
    TutorEditableProfileResponse,
    TutorListQuery,
    TutorListResponse,
    TutorSubjectOption,
    TutorProfileUpdateInput,
    TutorSortOption,
} from "./tutor.types";

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
                startAt: {
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
    return fullName || normalizeText(input.name) || input.email;
}

function normalizeText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toPublicBio(bio: unknown): string {
    const normalizedBio = normalizeText(bio);
    return normalizedBio || "This tutor is setting up their public profile.";
}

function toProfessionalTitle(value: unknown): string {
    return normalizeText(value) || "Professional Tutor";
}

function slugifyExpertiseName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

type TutorStatsSnapshot = {
    averageRating: number;
    totalReviews: number;
    totalHoursTaught: number;
    isTopRated: boolean;
};

export async function syncTutorProfileStats(targetTutorId?: string): Promise<void> {
    const tutors = await prisma.tutorProfile.findMany({
        where: {
            deletedAt: null,
            ...(targetTutorId ? { id: targetTutorId } : {}),
        },
        select: {
            id: true,
        },
    });

    if (tutors.length === 0) {
        return;
    }

    const tutorIds = tutors.map((tutor) => tutor.id);

    const [reviews, completedSessions] = await Promise.all([
        prisma.review.findMany({
            where: {
                tutorId: {
                    in: tutorIds,
                },
                deletedAt: null,
                isVisible: true,
            },
            select: {
                tutorId: true,
                rating: true,
            },
        }),
        prisma.session.findMany({
            where: {
                status: "completed",
                booking: {
                    tutorId: {
                        in: tutorIds,
                    },
                    deletedAt: null,
                },
            },
            select: {
                durationHours: true,
                booking: {
                    select: {
                        tutorId: true,
                        startTime: true,
                        endTime: true,
                    },
                },
            },
        }),
    ]);

    const statsByTutor = new Map<string, TutorStatsSnapshot>();

    for (const tutorId of tutorIds) {
        statsByTutor.set(tutorId, {
            averageRating: 0,
            totalReviews: 0,
            totalHoursTaught: 0,
            isTopRated: false,
        });
    }

    const reviewAccumulator = new Map<
        string,
        { totalRating: number; totalReviews: number }
    >();

    for (const review of reviews) {
        const current = reviewAccumulator.get(review.tutorId) ?? {
            totalRating: 0,
            totalReviews: 0,
        };

        current.totalRating += review.rating;
        current.totalReviews += 1;
        reviewAccumulator.set(review.tutorId, current);
    }

    for (const [tutorId, aggregate] of reviewAccumulator.entries()) {
        const snapshot = statsByTutor.get(tutorId);
        if (!snapshot) {
            continue;
        }

        snapshot.totalReviews = aggregate.totalReviews;
        snapshot.averageRating =
            aggregate.totalReviews > 0
                ? Number((aggregate.totalRating / aggregate.totalReviews).toFixed(2))
                : 0;
    }

    for (const session of completedSessions) {
        const tutorId = session.booking.tutorId;
        const snapshot = statsByTutor.get(tutorId);
        if (!snapshot) {
            continue;
        }

        const durationHours =
            typeof session.durationHours === "number"
                ? session.durationHours
                : (session.booking.endTime.getTime() -
                      session.booking.startTime.getTime()) /
                  (1000 * 60 * 60);

        snapshot.totalHoursTaught += Math.max(durationHours, 0);
    }

    const rankedTutors = [...statsByTutor.entries()]
        .filter(([, snapshot]) => snapshot.totalReviews > 0)
        .sort((left, right) => {
            if (right[1].averageRating !== left[1].averageRating) {
                return right[1].averageRating - left[1].averageRating;
            }

            return right[1].totalReviews - left[1].totalReviews;
        })
        .slice(0, 10)
        .map(([tutorId]) => tutorId);

    const topRatedIds = new Set(rankedTutors);

    for (const [tutorId, snapshot] of statsByTutor.entries()) {
        snapshot.totalHoursTaught = Number(snapshot.totalHoursTaught.toFixed(2));
        snapshot.isTopRated =
            snapshot.averageRating >= 4.5 ||
            (snapshot.totalReviews > 0 && topRatedIds.has(tutorId));
    }

    await prisma.$transaction(
        [...statsByTutor.entries()].map(([tutorId, snapshot]) =>
            prisma.tutorProfile.update({
                where: { id: tutorId },
                data: {
                    averageRating: snapshot.averageRating,
                    totalReviews: snapshot.totalReviews,
                    totalHoursTaught: snapshot.totalHoursTaught,
                    isTopRated: snapshot.isTopRated,
                },
            })
        )
    );
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
    await syncTutorProfileStats();

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
                        startAt: {
                            gte: now,
                        },
                    },
                    orderBy: {
                        startAt: "asc",
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
            professionalTitle: toProfessionalTitle(tutor.professionalTitle),
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
            nextAvailableSlot: tutor.availability[0]?.startAt.toISOString() ?? null,
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
    await syncTutorProfileStats(tutorId);

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
                    startAt: {
                        gte: now,
                    },
                },
                orderBy: {
                    startAt: "asc",
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
            professionalTitle: toProfessionalTitle(tutor.professionalTitle),
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
                startAt: slot.startAt.toISOString(),
                endAt: slot.endAt.toISOString(),
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
            profileImageUrl: tutor.user.image ?? tutor.user.avatarUrl ?? null,
            professionalTitle: toProfessionalTitle(tutor.professionalTitle),
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

    const [existingExpertise, existingEducation] = await Promise.all([
        prisma.tutorExpertise.findMany({
            where: { tutorId: tutor.id },
            select: { id: true },
        }),
        prisma.tutorEducation.findMany({
            where: { tutorId: tutor.id },
            select: { id: true },
        }),
    ]);

    const existingExpertiseIds = new Set(existingExpertise.map((item) => item.id));
    const existingEducationIds = new Set(existingEducation.map((item) => item.id));

    const keptExpertiseIds = uniqueExpertise
        .map((item) => item.id?.trim())
        .filter((value): value is string => Boolean(value));

    const keptEducationIds = normalizedEducation
        .map((item) => item.id?.trim())
        .filter((value): value is string => Boolean(value));

    await prisma.$transaction(async (tx) => {
        await tx.tutorProfile.update({
            where: { id: tutor.id },
            data: {
                professionalTitle: payload.professionalTitle.trim(),
                bio: payload.bio.trim(),
                hourlyRate: payload.hourlyRate,
                experienceYears: payload.experienceYears,
            },
        });

        if (payload.profileImageUrl !== undefined) {
            await tx.user.update({
                where: { id: userId },
                data: {
                    image: payload.profileImageUrl,
                },
            });
        }

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
                existingExpertiseIds.has(expertise.id)
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
                existingEducationIds.has(educationItem.id)
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
    }, {
        maxWait: 10000,
        timeout: 20000,
    });

    return getMyTutorProfile(userId);
}

export async function getTutorSubjectOptions(): Promise<TutorSubjectOption[]> {
    const expertiseItems = await prisma.tutorExpertise.findMany({
        where: {
            tutor: {
                deletedAt: null,
                user: {
                    deletedAt: null,
                    isBanned: false,
                    role: "tutor",
                },
            },
        },
        orderBy: {
            name: "asc",
        },
        select: {
            id: true,
            name: true,
            slug: true,
        },
    });

    const uniqueSubjects = new Map<string, TutorSubjectOption>();

    for (const item of expertiseItems) {
        if (!uniqueSubjects.has(item.slug)) {
            uniqueSubjects.set(item.slug, {
                id: item.id,
                name: item.name,
                slug: item.slug,
            });
        }
    }

    return [...uniqueSubjects.values()];
}

export const tutorDefaults = {
    page: defaultListPage,
    limit: defaultListLimit,
};
