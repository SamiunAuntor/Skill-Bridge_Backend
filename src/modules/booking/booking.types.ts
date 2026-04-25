export interface SessionListItem {
    bookingId: string;
    sessionId: string;
    reviewId: string | null;
    bookingStatus:
        | "pending_payment"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show";
    sessionStatus: "scheduled" | "ongoing" | "completed" | "cancelled";
    sessionDate: string;
    startTime: string;
    endTime: string;
    subject: {
        id: string | null;
        name: string;
        categoryName: string | null;
    };
    priceAtBooking: number;
    canCancel: boolean;
    canJoin: boolean;
    meetingProvider: string | null;
    meetingId: string | null;
    meetingJoinUrl: string | null;
    meetingPassword: string | null;
    canLeaveReview: boolean;
    student: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
    tutor: {
        id: string;
        name: string;
        avatarUrl: string | null;
    };
}

export type SessionListSortOption =
    | "time_asc"
    | "time_desc"
    | "amount_high"
    | "amount_low"
    | "upcoming_only"
    | "completed_only"
    | "cancelled_only";

export const sessionSortOptions = [
    "time_asc",
    "time_desc",
    "amount_high",
    "amount_low",
    "upcoming_only",
    "completed_only",
    "cancelled_only",
] as const satisfies readonly SessionListSortOption[];

export interface SessionListQuery {
    search?: string;
    sortBy: SessionListSortOption;
}

export interface SessionListResponse {
    sessions: SessionListItem[];
    stats: {
        upcoming: number;
        completed: number;
        cancelled: number;
    };
    filters: {
        search: string;
        sortBy: SessionListSortOption;
    };
}

export interface TutorDashboardSummaryResponse {
    stats: {
        totalEarnings: number;
        totalHours: number;
        averageRating: number | null;
        totalReviews: number;
    };
    upcomingSessions: SessionListItem[];
}

export interface CancelBookingResponse {
    bookingId: string;
    sessionId: string | null;
    status: "cancelled";
    sessionStatus: "cancelled" | null;
    slotReleased: boolean;
}

export interface JoinSessionResponse {
    bookingId: string;
    sessionId: string;
    sessionStatus: "ongoing" | "completed";
    meetingJoinUrl: string;
}
