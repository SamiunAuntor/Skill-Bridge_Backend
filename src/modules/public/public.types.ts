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
    }>;
}
