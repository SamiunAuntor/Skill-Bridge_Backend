export const tutorSortOptions = [
    "recommended",
    "highest_rated",
    "lowest_rated",
    "lowest_price",
    "highest_price",
    "most_reviewed",
] as const;

export type TutorSortOption = (typeof tutorSortOptions)[number];

export interface TutorListQuery {
    subject?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    availability?: boolean;
    sortBy: TutorSortOption;
    page: number;
    limit: number;
}

export interface TutorCard {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string;
    hourlyRate: number;
    experienceYears: number;
    averageRating: number;
    totalReviews: number;
    isTopRated: boolean;
    categories: Array<{
        id: string;
        name: string;
        slug: string;
    }>;
    expertise: Array<{
        id: string;
        name: string;
        slug: string;
    }>;
    hasAvailability: boolean;
    nextAvailableSlot: string | null;
}

export interface TutorListResponse {
    tutors: TutorCard[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    filters: TutorListQuery;
}

export interface TutorDetailResponse {
    tutor: {
        id: string;
        userId: string;
        displayName: string;
        email: string;
        avatarUrl: string | null;
        bio: string;
        hourlyRate: number;
        experienceYears: number;
        totalHoursTaught: number;
        totalEarnings: number;
        averageRating: number;
        totalReviews: number;
        isTopRated: boolean;
        categories: Array<{
            id: string;
            name: string;
            slug: string;
        }>;
        expertise: Array<{
            id: string;
            name: string;
            slug: string;
        }>;
        education: Array<{
            id: string;
            degree: string;
            institution: string;
            fieldOfStudy: string;
            startYear: number;
            endYear: number | null;
            description: string | null;
        }>;
        testimonials: Array<{
            id: string;
            rating: number;
            comment: string | null;
            createdAt: string;
            student: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        }>;
        availableSlots: Array<{
            id: string;
            date: string;
            startTime: string;
            endTime: string;
        }>;
    };
}
