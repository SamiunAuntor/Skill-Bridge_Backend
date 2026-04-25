import { prisma } from "../../config/prisma.config";
import { normalizeText, toDisplayName } from "../../shared/utils";
import { HttpError } from "../../utils/http-error";
import {
    buildTutorDetailWhere,
    buildTutorListPrismaQuery,
    tutorQueryDefaults,
} from "./tutor.query";
import {
    TutorCategoryOption,
    TutorDetailResponse,
    TutorEditableProfileResponse,
    TutorListQuery,
    TutorListResponse,
    TutorProfileUpdateInput,
    TutorSubjectOption,
} from "./tutor.types";

function toPublicBio(bio: unknown): string {
    const normalizedBio = normalizeText(bio);
    return normalizedBio || "This tutor is setting up their public profile.";
}

function toProfessionalTitle(value: unknown): string {
    return normalizeText(value) || "Professional Tutor";
}

function computeIsTopRated(averageRating: number, totalReviews: number): boolean {
    return totalReviews >= 10 && averageRating >= 4.5;
}

function mapTutorSubject(item: {
    subject: {
        id: string;
        name: string;
        slug: string;
        categoryId: string;
        iconUrl?: string | null;
        category: {
            name: string;
        };
    };
}) {
    return {
        id: item.subject.id,
        name: item.subject.name,
        slug: item.subject.slug,
        categoryId: item.subject.categoryId,
        categoryName: item.subject.category.name,
        iconUrl: item.subject.iconUrl ?? null,
    };
}

function toEditableEducation(input: {
    id: string;
    degreeId: string;
    degreeOption: {
        categoryId: string;
        name: string;
        category: {
            name: string;
        };
    };
    institution: string;
    startYear: number;
    endYear: number | null;
    description: string | null;
}) {
    return {
        id: input.id,
        degreeId: input.degreeId,
        categoryId: input.degreeOption.categoryId,
        institution: input.institution,
        startYear: input.startYear,
        endYear: input.endYear,
        description: input.description,
    };
}

type TutorStatsSnapshot = {
    averageRating: number;
    totalReviews: number;
    totalHoursTaught: number;
    totalEarnings: number;
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
                        priceAtBooking: true,
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
            totalEarnings: 0,
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
        snapshot.totalEarnings += session.booking.priceAtBooking;
    }

    for (const [tutorId, snapshot] of statsByTutor.entries()) {
        snapshot.totalHoursTaught = Number(snapshot.totalHoursTaught.toFixed(2));
        snapshot.totalEarnings = Number(snapshot.totalEarnings.toFixed(2));
        snapshot.isTopRated = computeIsTopRated(
            snapshot.averageRating,
            snapshot.totalReviews
        );
    }

    await prisma.$transaction(
        [...statsByTutor.entries()].map(([tutorId, snapshot]) =>
            prisma.tutorProfile.update({
                where: { id: tutorId },
                data: {
                    averageRating: snapshot.averageRating,
                    totalReviews: snapshot.totalReviews,
                    totalHoursTaught: snapshot.totalHoursTaught,
                    totalEarnings: snapshot.totalEarnings,
                    isTopRated: snapshot.isTopRated,
                },
            })
        )
    );
}

export async function getTutors(
    filters: TutorListQuery
): Promise<TutorListResponse> {
    const queryBuilder = buildTutorListPrismaQuery(filters);
    const now = new Date();

    const [totalItems, tutors] = await Promise.all([
        prisma.tutorProfile.count({ where: queryBuilder.where }),
        prisma.tutorProfile.findMany({
            where: queryBuilder.where,
            orderBy: queryBuilder.orderBy,
            ...(queryBuilder.pagination
                ? {
                      skip: queryBuilder.pagination.skip,
                      take: queryBuilder.pagination.take,
                  }
                : {}),
            include: {
                user: true,
                categories: {
                    include: {
                        category: true,
                    },
                },
                subjects: {
                    include: {
                        subject: {
                            include: {
                                category: true,
                            },
                        },
                    },
                    orderBy: {
                        subject: {
                            name: "asc",
                        },
                    },
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
                avatarUrl: tutor.user.image ?? null,
                bio: toPublicBio(tutor.bio),
                hourlyRate: tutor.hourlyRate,
                experienceYears: tutor.experienceYears,
                averageRating: tutor.averageRating,
                totalReviews: tutor.totalReviews,
                isTopRated: computeIsTopRated(
                    tutor.averageRating,
                    tutor.totalReviews
                ),
                categories: tutor.categories.map(({ category }) => ({
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                })),
                subjects: tutor.subjects.map(mapTutorSubject),
                hasAvailability: tutor.availability.length > 0,
                nextAvailableSlot:
                    tutor.availability[0]?.startAt.toISOString() ?? null,
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
    const detailWhere = buildTutorDetailWhere(tutorId);

    const tutor = await prisma.tutorProfile.findFirst({
        where: detailWhere,
        include: {
            user: true,
            categories: {
                include: {
                    category: true,
                },
            },
            subjects: {
                include: {
                    subject: {
                        include: {
                            category: true,
                        },
                    },
                },
                orderBy: [
                    {
                        subject: {
                            name: "asc",
                        },
                    },
                    {
                        subject: {
                            name: "asc",
                        },
                    },
                ],
            },
            education: {
                include: {
                    degreeOption: {
                        select: {
                            categoryId: true,
                            name: true,
                            category: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
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
            avatarUrl: tutor.user.image ?? null,
            bio: toPublicBio(tutor.bio),
            hourlyRate: tutor.hourlyRate,
            experienceYears: tutor.experienceYears,
            totalHoursTaught: tutor.totalHoursTaught,
            totalEarnings: tutor.totalEarnings,
            averageRating: tutor.averageRating,
            totalReviews: tutor.totalReviews,
            isTopRated: computeIsTopRated(
                tutor.averageRating,
                tutor.totalReviews
            ),
            categories: tutor.categories.map(({ category }) => ({
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                })),
            subjects: tutor.subjects.map(mapTutorSubject),
            education: tutor.education.map((item) => ({
                id: item.id,
                degree: item.degreeOption.name,
                categoryName: item.degreeOption.category.name,
                institution: item.institution,
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
                    avatarUrl: review.student.image ?? null,
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
    const [tutor, categories, subjects, degrees] = await Promise.all([
        prisma.tutorProfile.findUnique({
            where: { userId },
            include: {
                user: true,
                categories: {
                    include: {
                        category: true,
                    },
                },
                subjects: {
                    include: {
                        subject: {
                            include: {
                                category: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            subject: {
                                name: "asc",
                            },
                        },
                        {
                            subject: {
                                name: "asc",
                            },
                        },
                    ],
                },
                education: {
                    include: {
                        degreeOption: {
                            select: {
                                categoryId: true,
                                name: true,
                                category: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: [{ endYear: "desc" }, { startYear: "desc" }],
                },
            },
        }),
        prisma.category.findMany({
            where: {
                isActive: true,
            },
            orderBy: [{ name: "asc" }],
        }),
        prisma.subject.findMany({
            where: {
                isActive: true,
                category: {
                    isActive: true,
                },
            },
            include: {
                category: true,
            },
            orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
        }),
        prisma.degree.findMany({
            where: {
                isActive: true,
                category: {
                    isActive: true,
                },
            },
            include: {
                category: true,
            },
            orderBy: [{ name: "asc" }],
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
            avatarUrl: tutor.user.image ?? null,
            profileImageUrl: tutor.user.image ?? null,
            professionalTitle: toProfessionalTitle(tutor.professionalTitle),
            bio: tutor.bio,
            hourlyRate: tutor.hourlyRate,
            experienceYears: tutor.experienceYears,
            categoryIds: tutor.categories.map(({ categoryId }) => categoryId),
            subjects: tutor.subjects.map((item) => ({
                id: item.id,
                subjectId: item.subjectId,
                categoryId: item.subject.categoryId,
                name: item.subject.name,
                slug: item.subject.slug,
            })),
            education: tutor.education.map(toEditableEducation),
        },
        availableCategories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
        })),
        availableSubjects: subjects.map((subject) => ({
            id: subject.id,
            categoryId: subject.categoryId,
            name: subject.name,
            slug: subject.slug,
            description: subject.description ?? null,
            iconUrl: subject.iconUrl ?? null,
        })),
        availableDegrees: degrees.map((degree) => ({
            id: degree.id,
            categoryId: degree.categoryId,
            categoryName: degree.category.name,
            name: degree.name,
            level: degree.level ?? null,
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
    const uniqueSubjectIds = [...new Set(payload.subjectIds)];
    const normalizedEducation = payload.education.map((item) => ({
        ...item,
        institution: item.institution.trim(),
        description: item.description?.trim() || null,
    }));

    const uniqueEducationCategoryIds = [
        ...new Set(normalizedEducation.map((item) => item.categoryId)),
    ];

    const [validTeachingCategories, validEducationCategories, validSubjects, validDegrees, existingEducation] =
        await Promise.all([
            prisma.category.findMany({
                where: {
                    id: {
                        in: uniqueCategoryIds,
                    },
                    isActive: true,
                },
                select: {
                    id: true,
                },
            }),
            prisma.category.findMany({
                where: {
                    id: {
                        in: uniqueEducationCategoryIds,
                    },
                    isActive: true,
                },
                select: {
                    id: true,
                },
            }),
            prisma.subject.findMany({
                where: {
                    id: {
                        in: uniqueSubjectIds,
                    },
                    isActive: true,
                },
                select: {
                    id: true,
                    categoryId: true,
                    name: true,
                },
            }),
            prisma.degree.findMany({
                where: {
                    id: {
                        in: [...new Set(normalizedEducation.map((item) => item.degreeId))],
                    },
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    categoryId: true,
                    category: {
                        select: {
                            isActive: true,
                        },
                    },
                },
            }),
            prisma.tutorEducation.findMany({
                where: { tutorId: tutor.id },
                select: { id: true },
            }),
        ]);

    if (validTeachingCategories.length !== uniqueCategoryIds.length) {
        throw new HttpError(400, "One or more selected categories are invalid.");
    }

    if (validEducationCategories.length !== uniqueEducationCategoryIds.length) {
        throw new HttpError(
            400,
            "One or more selected education categories are invalid."
        );
    }

    if (validSubjects.length !== uniqueSubjectIds.length) {
        throw new HttpError(400, "One or more selected subjects are invalid.");
    }

    const allowedTeachingCategoryIds = new Set(
        validTeachingCategories.map((item) => item.id)
    );
    for (const subject of validSubjects) {
        if (!allowedTeachingCategoryIds.has(subject.categoryId)) {
            throw new HttpError(
                400,
                "Each selected subject must belong to one of the selected categories."
            );
        }
    }

    for (const educationItem of normalizedEducation) {
        const matchedDegree = validDegrees.find(
            (item) => item.id === educationItem.degreeId
        );

        if (!matchedDegree) {
            throw new HttpError(400, "One or more selected degrees are invalid.");
        }

        if (matchedDegree.categoryId !== educationItem.categoryId) {
            throw new HttpError(
                400,
                "Each education degree must belong to its selected education category."
            );
        }
    }

    const existingEducationIds = new Set(existingEducation.map((item) => item.id));
    const keptEducationIds = normalizedEducation
        .map((item) => item.id?.trim())
        .filter((value): value is string => Boolean(value));

    await prisma.$transaction(
        async (tx) => {
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

            await tx.tutorSubject.deleteMany({
                where: {
                    tutorId: tutor.id,
                    subjectId: {
                        notIn: uniqueSubjectIds.length > 0 ? uniqueSubjectIds : [""],
                    },
                },
            });

            if (uniqueSubjectIds.length > 0) {
                await tx.tutorSubject.createMany({
                    data: uniqueSubjectIds.map((subjectId) => ({
                        tutorId: tutor.id,
                        subjectId,
                    })),
                    skipDuplicates: true,
                });
            } else {
                await tx.tutorSubject.deleteMany({
                    where: {
                        tutorId: tutor.id,
                    },
                });
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
                    degreeId: educationItem.degreeId,
                    institution: educationItem.institution,
                    startYear: educationItem.startYear,
                    endYear: educationItem.endYear ?? null,
                    description: educationItem.description,
                };

                if (educationItem.id && existingEducationIds.has(educationItem.id)) {
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
        },
        {
            maxWait: 10000,
            timeout: 20000,
        }
    );

    return getMyTutorProfile(userId);
}

export async function getTutorSubjectOptions(): Promise<TutorSubjectOption[]> {
    const subjects = await prisma.subject.findMany({
        where: {
            isActive: true,
            tutors: {
                some: {
                    tutor: {
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
                        user: {
                            deletedAt: null,
                            isBanned: false,
                            role: "tutor",
                        },
                    },
                },
            },
        },
        include: {
            category: true,
        },
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });

    return subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        iconUrl: subject.iconUrl ?? null,
        categoryId: subject.categoryId,
        categoryName: subject.category.name,
        description: subject.description ?? null,
    }));
}

export async function getTutorCategoryOptions(): Promise<TutorCategoryOption[]> {
    const categories = await prisma.category.findMany({
        where: {
            isActive: true,
            tutors: {
                some: {
                    tutor: {
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
                        user: {
                            deletedAt: null,
                            isBanned: false,
                            role: "tutor",
                        },
                    },
                },
            },
        },
        orderBy: [{ name: "asc" }],
    });

    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
    }));
}

export const tutorDefaults = {
    page: tutorQueryDefaults.page,
    limit: tutorQueryDefaults.limit,
};
