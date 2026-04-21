import { prisma } from "../../config/prisma.config";
import { HttpError } from "../../utils/http-error";
import {
    PublicLandingResponse,
    PublicSubjectDetailResponse,
    PublicSubjectsResponse,
} from "./public.types";

function normalizeText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toDisplayName(input: {
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}): string {
    const fullName = [input.firstName?.trim(), input.lastName?.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || normalizeText(input.name) || input.email;
}

function toPublicBio(bio: unknown): string {
    return normalizeText(bio) || "This tutor is setting up their public profile.";
}

function toProfessionalTitle(value: unknown): string {
    return normalizeText(value) || "Professional Tutor";
}

export async function getLandingData(): Promise<PublicLandingResponse> {
    const [
        activeSubjects,
        expertTutors,
        sessionsBooked,
        averageRatingAggregate,
        featuredTutors,
        subjects,
    ] = await Promise.all([
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
            take: 3,
            include: {
                user: true,
                subjects: {
                    include: {
                        subject: true,
                    },
                    orderBy: {
                        subject: {
                            displayOrder: "asc",
                        },
                    },
                    take: 1,
                },
                legacyExpertise: {
                    orderBy: {
                        name: "asc",
                    },
                    take: 1,
                },
                categories: {
                    include: {
                        category: true,
                    },
                    take: 1,
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
    ]);

    return {
        stats: {
            activeSubjects,
            expertTutors,
            sessionsBooked,
            averageRating: Number((averageRatingAggregate._avg.rating ?? 0).toFixed(1)),
        },
        featuredTutors: featuredTutors.map((tutor) => ({
            id: tutor.id,
            displayName: toDisplayName(tutor.user),
            professionalTitle: toProfessionalTitle(tutor.professionalTitle),
            avatarUrl: tutor.user.avatarUrl ?? tutor.user.image ?? null,
            bio: toPublicBio(tutor.bio),
            hourlyRate: tutor.hourlyRate,
            averageRating: tutor.averageRating,
            totalReviews: tutor.totalReviews,
            primarySubject:
                tutor.subjects[0]?.subject.name ??
                tutor.legacyExpertise[0]?.name ??
                tutor.categories[0]?.category.name ??
                "General Tutoring",
        })),
        subjects: subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            slug: subject.slug,
            iconKey: subject.iconKey ?? null,
            shortDescription: subject.shortDescription ?? null,
            categoryName: subject.category.name,
        })),
    };
}

export async function getPublicSubjects(): Promise<PublicSubjectsResponse> {
    const subjects = await prisma.subject.findMany({
        where: {
            isActive: true,
            category: {
                isActive: true,
            },
        },
        include: {
            category: true,
            _count: {
                select: {
                    tutors: true,
                },
            },
        },
        orderBy: [
            { category: { displayOrder: "asc" } },
            { displayOrder: "asc" },
            { name: "asc" },
        ],
    });

    return {
        subjects: subjects.map((subject) => ({
            id: subject.id,
            name: subject.name,
            slug: subject.slug,
            iconKey: subject.iconKey ?? null,
            shortDescription: subject.shortDescription ?? null,
            category: {
                id: subject.category.id,
                name: subject.category.name,
                slug: subject.category.slug,
            },
            tutorCount: subject._count.tutors,
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
            shortDescription: subject.shortDescription ?? null,
            longDescription: subject.longDescription ?? null,
            iconKey: subject.iconKey ?? null,
            heroImageUrl: subject.heroImageUrl ?? null,
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
            avatarUrl: item.tutor.user.avatarUrl ?? item.tutor.user.image ?? null,
            bio: toPublicBio(item.tutor.bio),
            hourlyRate: item.tutor.hourlyRate,
            averageRating: item.tutor.averageRating,
            totalReviews: item.tutor.totalReviews,
            isTopRated: item.tutor.isTopRated,
        })),
    };
}
