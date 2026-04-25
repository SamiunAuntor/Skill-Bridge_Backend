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
    q?: string;
    category?: string;
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
    professionalTitle: string;
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
    subjects: Array<{
        id: string;
        name: string;
        slug: string;
        categoryId: string;
        categoryName: string;
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
        professionalTitle: string;
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
        subjects: Array<{
            id: string;
            name: string;
            slug: string;
            categoryId: string;
            categoryName: string;
            iconUrl: string | null;
        }>;
        education: Array<{
            id: string;
            degree: string;
            categoryName: string;
            institution: string;
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
            startAt: string;
            endAt: string;
        }>;
    };
}

export interface TutorEditableCategoryOption {
    id: string;
    name: string;
    slug: string;
}

export interface TutorEditableSubjectOption {
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string | null;
    iconUrl: string | null;
}

export interface TutorEditableDegreeOption {
    id: string;
    categoryId: string;
    categoryName: string;
    name: string;
    level: string | null;
}

export interface TutorEditableSubjectItem {
    id: string;
    subjectId: string;
    categoryId: string;
    name: string;
    slug: string;
}

export interface TutorEditableEducationItem {
    id: string;
    degreeId: string;
    categoryId: string;
    institution: string;
    startYear: number;
    endYear: number | null;
    description: string | null;
}

export interface TutorEditableProfile {
    id: string;
    userId: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    profileImageUrl: string | null;
    professionalTitle: string;
    bio: string;
    hourlyRate: number;
    experienceYears: number;
    categoryIds: string[];
    subjects: TutorEditableSubjectItem[];
    education: TutorEditableEducationItem[];
}

export interface TutorEditableProfileResponse {
    profile: TutorEditableProfile;
    availableCategories: TutorEditableCategoryOption[];
    availableSubjects: TutorEditableSubjectOption[];
    availableDegrees: TutorEditableDegreeOption[];
}

export interface TutorSubjectOption {
    id: string;
    name: string;
    slug: string;
    iconUrl: string | null;
    categoryId: string;
    categoryName: string;
    description: string | null;
}

export interface TutorCategoryOption {
    id: string;
    name: string;
    slug: string;
}

export interface TutorProfileUpdateSubjectInput {
    subjectId: string;
}

export interface TutorProfileUpdateEducationInput {
    id?: string;
    degreeId: string;
    categoryId: string;
    institution: string;
    startYear: number;
    endYear?: number | null | undefined;
    description?: string | null | undefined;
}

export interface TutorProfileUpdateInput {
    profileImageUrl?: string | null;
    professionalTitle: string;
    bio: string;
    hourlyRate: number;
    experienceYears: number;
    categoryIds: string[];
    subjectIds: string[];
    education: TutorProfileUpdateEducationInput[];
}
