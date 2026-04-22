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
        iconUrl: string | null;
        description: string | null;
        categoryName: string;
    }>;
}

export interface PublicSubjectsResponse {
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
