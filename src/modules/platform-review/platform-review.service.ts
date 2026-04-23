import { PlatformReviewStatus } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { toDisplayName } from "../../shared/utils";
import { HttpError } from "../../utils/http-error";
import type {
    PlatformReviewListItem,
    PlatformReviewSubmitInput,
    PlatformReviewsResponse,
} from "./platform-review.types";

function mapPlatformReview(input: {
    id: string;
    rating: number;
    title: string | null;
    message: string;
    status: PlatformReviewStatus;
    createdAt: Date;
    user: {
        id: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        image: string | null;
    };
}): PlatformReviewListItem {
    return {
        id: input.id,
        rating: input.rating,
        title: input.title,
        message: input.message,
        status: input.status,
        createdAt: input.createdAt.toISOString(),
        user: {
            id: input.user.id,
            name: toDisplayName(input.user),
            avatarUrl: input.user.image ?? null,
        },
    };
}

export async function getVisiblePlatformReviews(
    limit = 10
): Promise<PlatformReviewsResponse> {
    const reviews = await prisma.platformReview.findMany({
        where: {
            deletedAt: null,
            status: PlatformReviewStatus.visible,
            user: {
                deletedAt: null,
                isBanned: false,
            },
        },
        include: {
            user: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: limit,
    });

    return {
        reviews: reviews.map(mapPlatformReview),
    };
}

export async function submitPlatformReview(
    userId: string,
    input: PlatformReviewSubmitInput
): Promise<{ review: PlatformReviewListItem }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            deletedAt: true,
            isBanned: true,
        },
    });

    if (!user || user.deletedAt || user.isBanned) {
        throw new HttpError(403, "Your account cannot submit platform reviews.");
    }

    const review = await prisma.platformReview.create({
        data: {
            userId,
            rating: input.rating,
            title: input.title?.trim() || null,
            message: input.message.trim(),
            status: PlatformReviewStatus.visible,
        },
        include: {
            user: true,
        },
    });

    return {
        review: mapPlatformReview(review),
    };
}
