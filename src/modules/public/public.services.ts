import { prisma } from "../../config/prisma.config";
import { normalizeText, toDisplayName } from "../../shared/utils";
import { PlatformReviewStatus } from "../../generated/prisma/client";
import { HttpError } from "../../utils/http-error";
import {
    PublicLandingResponse,
    PublicSubjectDetailResponse,
    PublicSubjectsQuery,
    PublicSubjectsResponse,
} from "./public.types";

function toPublicBio(bio: unknown): string {
    return normalizeText(bio) || "This tutor is setting up their public profile.";
}

function toProfessionalTitle(value: unknown): string {
    return normalizeText(value) || "Professional Tutor";
}

export async function getLandingData(): Promise<PublicLandingResponse> {
    const [
        activeStudents,
        activeSubjects,
        expertTutors,
        sessionsBooked,
        averageRatingAggregate,
        featuredTutors,
        subjects,
        platformReviews,
    ] = await Promise.all([
        prisma.user.count({
            where: {
                deletedAt: null,
                isBanned: false,
                role: "student",
            },
        }),
        prisma.subject.count({
            where: {
                isActive: true,
                category: {
                    isActive: true,
                },
            },
        }),
        prisma.tutorProfile.count({
            where: {
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
                    deletedAt: null,
                    isBanned: false,
                    role: "tutor",
                },
            },
        }),
        prisma.booking.count({
            where: {
                deletedAt: null,
            },
        }),
        prisma.review.aggregate({
            where: {
                deletedAt: null,
                isVisible: true,
            },
            _avg: {
                rating: true,
            },
        }),
        prisma.tutorProfile.findMany({
            where: {
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
                    deletedAt: null,
                    isBanned: false,
                    role: "tutor",
                },
            },
            orderBy: [
                { isTopRated: "desc" },
                { averageRating: "desc" },
                { totalReviews: "desc" },
                { totalHoursTaught: "desc" },
            ],
            take: 5,
            include: {
                user: true,
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
                categories: {
                    include: {
                        category: true,
                    },
                    orderBy: {
                        category: {
                            name: "asc",
                        },
                    },
                },
            },
        }),
        prisma.subject.findMany({
            take: 8,
            orderBy: {
                tutors: {
                    _count: "desc",
                },
            },
            where: {
                isActive: true,
                category: {
                    isActive: true,
                },
            },
            include: {
                category: true,
            },
        }),
        prisma.platformReview.findMany({
            where: {
                deletedAt: null,
                status: PlatformReviewStatus.visible,
                user: {
                    deletedAt: null,
                    isBanned: false,
                },
            },
            include: {
                user: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 6,
        }),
    ]);

    return {
        stats: {
            activeStudents,
            activeSubjects,
            expertTutors,
            sessionsBooked,
            averageRating: Number((averageRatingAggregate._avg.rating ?? 0).toFixed(1)),
        },
        featuredTutors: featuredTutors.map((tutor) => ({
            id: tutor.id,
            displayName: toDisplayName(tutor.user),
            professionalTitle: toProfessionalTitle(tutor.professionalTitle),
            avatarUrl: tutor.user.image ?? null,
            bio: toPublicBio(tutor.bio),
            hourlyRate: tutor.hourlyRate,
            averageRating: tutor.averageRating,
            totalReviews: tutor.totalReviews,
            isTopRated: tutor.isTopRated,
            categories: tutor.categories.map(({ category }) => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
            })),
            subjects: tutor.subjects.map(({ subject }) => ({
                id: subject.id,
                name: subject.name,
                slug: subject.slug,
                categoryId: subject.categoryId,
                categoryName: subject.category.name,
            })),
        })),
        subjects: subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            slug: subject.slug,
            iconUrl: subject.iconUrl ?? null,
            description: subject.description ?? null,
            categoryName: subject.category.name,
        })),
        platformReviews: platformReviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            title: review.title ?? null,
            message: review.message,
            createdAt: review.createdAt.toISOString(),
            user: {
                id: review.user.id,
                name: toDisplayName(review.user),
                avatarUrl: review.user.image ?? null,
            },
        })),
    };
}

export async function getPublicSubjects(
    filters: PublicSubjectsQuery
): Promise<PublicSubjectsResponse> {
    const subjects = await prisma.subject.findMany({
        where: {
            isActive: true,
            category: {
                isActive: true,
            },
            ...(filters.q
                ? {
                      OR: [
                          {
                              name: {
                                  contains: filters.q,
                                  mode: "insensitive",
                              },
                          },
                          {
                              description: {
                                  contains: filters.q,
                                  mode: "insensitive",
                              },
                          },
                          {
                              category: {
                                  name: {
                                      contains: filters.q,
                                      mode: "insensitive",
                                  },
                              },
                          },
                      ],
                  }
                : {}),
        },
        include: {
            category: true,
            tutors: {
                where: {
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
                select: {
                    tutorId: true,
                },
            },
        },
        orderBy:
            filters.sortBy === "alphabetical"
                ? [{ category: { name: "asc" } }, { name: "asc" }]
                : [{ tutors: { _count: "desc" } }, { name: "asc" }],
    });

    return {
        filters,
        subjects: subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            slug: subject.slug,
            iconUrl: subject.iconUrl ?? null,
            description: subject.description ?? null,
            category: {
                id: subject.category.id,
                name: subject.category.name,
                slug: subject.category.slug,
            },
            tutorCount: subject.tutors.length,
        })),
    };
}

export async function getPublicSubjectBySlug(
    slug: string
): Promise<PublicSubjectDetailResponse> {
    const subject = await prisma.subject.findFirst({
        where: {
            slug,
            isActive: true,
            category: {
                isActive: true,
            },
        },
        include: {
            category: true,
            tutors: {
                where: {
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
                include: {
                    tutor: {
                        include: {
                            user: true,
                        },
                    },
                },
                orderBy: [
                    { tutor: { isTopRated: "desc" } },
                    { tutor: { averageRating: "desc" } },
                    { tutor: { totalReviews: "desc" } },
                ],
            },
        },
    });

    if (!subject) {
        throw new HttpError(404, "Subject not found.");
    }

    return {
        subject: {
            id: subject.id,
            name: subject.name,
            slug: subject.slug,
            description: subject.description ?? null,
            iconUrl: subject.iconUrl ?? null,
            category: {
                id: subject.category.id,
                name: subject.category.name,
                slug: subject.category.slug,
            },
        },
        tutors: subject.tutors.map((item) => ({
            id: item.tutor.id,
            userId: item.tutor.userId,
            displayName: toDisplayName(item.tutor.user),
            professionalTitle: toProfessionalTitle(item.tutor.professionalTitle),
            avatarUrl: item.tutor.user.image ?? null,
            bio: toPublicBio(item.tutor.bio),
            hourlyRate: item.tutor.hourlyRate,
            averageRating: item.tutor.averageRating,
            totalReviews: item.tutor.totalReviews,
            isTopRated: item.tutor.isTopRated,
        })),
    };
}
