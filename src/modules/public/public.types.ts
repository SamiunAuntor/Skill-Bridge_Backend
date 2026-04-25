import { publicSubjectSortOptions } from "./public.validation";

export type PublicSubjectSortOption = (typeof publicSubjectSortOptions)[number];

export interface PublicSubjectsQuery {
    q?: string;
    sortBy: PublicSubjectSortOption;
}

export interface PublicLandingResponse {
    stats: {
        activeStudents: number;
        activeSubjects: number;
        expertTutors: number;
        sessionsBooked: number;
        averageRating: number;
    };
    featuredTutors: Array<{
        id: string;
        displayName: string;
        professionalTitle: string;
        avatarUrl: string | null;
        bio: string;
        hourlyRate: number;
        averageRating: number;
        totalReviews: number;
        isTopRated: boolean;
        categories: Array<{
            id: string;
            name: string;
            slug: string;
        }>;
        subjects: Array<{
            id: string;
            name: string;
            slug: string;
            categoryId: string;
            categoryName: string;
        }>;
    }>;
    subjects: Array<{
        id: string;
        name: string;
        slug: string;
        iconUrl: string | null;
        description: string | null;
        categoryName: string;
    }>;
    platformReviews: Array<{
        id: string;
        rating: number;
        title: string | null;
        message: string;
        createdAt: string;
        user: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    }>;
}

export interface PublicSubjectsResponse {
    filters: PublicSubjectsQuery;
    subjects: Array<{
        id: string;
        name: string;
        slug: string;
        iconUrl: string | null;
        description: string | null;
        category: {
            id: string;
            name: string;
            slug: string;
        };
        tutorCount: number;
    }>;
}

export interface PublicSubjectDetailResponse {
    subject: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        iconUrl: string | null;
        category: {
            id: string;
            name: string;
            slug: string;
        };
    };
    tutors: Array<{
        id: string;
        userId: string;
        displayName: string;
        professionalTitle: string;
        avatarUrl: string | null;
        bio: string;
        hourlyRate: number;
        averageRating: number;
        totalReviews: number;
        isTopRated: boolean;
    }>;
}
