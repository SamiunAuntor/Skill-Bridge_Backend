import type { PlatformReviewStatus } from "../../generated/prisma/client";

export interface PlatformReviewSubmitInput {
    rating: number;
    title?: string;
    message: string;
}

export interface PlatformReviewListItem {
    id: string;
    rating: number;
    title: string | null;
    message: string;
    status: PlatformReviewStatus;
    createdAt: string;
    user: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
}

export interface PlatformReviewsResponse {
    reviews: PlatformReviewListItem[];
}
