import { prisma } from "../../config/prisma.config";
import { PublicLandingResponse } from "./public.types";

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
        prisma.category.count(),
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
                expertise: {
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
        prisma.category.findMany({
            take: 8,
            orderBy: {
                tutors: {
                    _count: "desc",
                },
            },
            select: {
                id: true,
                name: true,
                slug: true,
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
                tutor.expertise[0]?.name ??
                tutor.categories[0]?.category.name ??
                "General Tutoring",
        })),
        subjects,
    };
}
