export interface PublicLandingResponse {
    stats: {
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
        primarySubject: string;
    }>;
    subjects: Array<{
        id: string;
        name: string;
        slug: string;
        iconKey: string | null;
        shortDescription: string | null;
        categoryName: string;
    }>;
}

export interface PublicSubjectsResponse {
    subjects: Array<{
        id: string;
        name: string;
        slug: string;
        iconKey: string | null;
        shortDescription: string | null;
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
        shortDescription: string | null;
        longDescription: string | null;
        iconKey: string | null;
        heroImageUrl: string | null;
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
