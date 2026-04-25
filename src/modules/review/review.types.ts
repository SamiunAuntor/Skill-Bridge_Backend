export interface ReviewPayload {
    id: string;
    bookingId: string;
    studentId: string;
    tutorId: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt: string;
    student: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
}

export interface CreateReviewInput {
    bookingId: string;
    rating: number;
    comment: string;
}

export interface UpdateReviewInput {
    rating: number;
    comment: string;
}

export interface CreateReviewResponse {
    review: ReviewPayload;
}

export interface UpdateReviewResponse {
    review: ReviewPayload;
}

export interface GetReviewResponse {
    review: ReviewPayload;
}

export interface TutorReviewListResponse {
    reviews: ReviewPayload[];
}
