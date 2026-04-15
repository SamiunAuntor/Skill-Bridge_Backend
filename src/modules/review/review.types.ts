export interface CreateReviewInput {
    bookingId: string;
    rating: number;
    comment?: string;
}

export interface CreateReviewResponse {
    review: {
        id: string;
        bookingId: string;
        studentId: string;
        tutorId: string;
        rating: number;
        comment: string | null;
        createdAt: string;
    };
}
