export interface CreateBookingInput {
    tutorId: string;
    slotId: string;
}

export interface BookingConfirmationResponse {
    booking: {
        id: string;
        sessionId: string;
        tutorId: string;
        slotId: string;
        sessionDate: string;
        startTime: string;
        endTime: string;
        priceAtBooking: number;
        status: "confirmed";
        paymentStatus: "paid";
        sessionStatus: "scheduled";
        meetingProvider: string | null;
        meetingId: string | null;
        meetingJoinUrl: string | null;
        meetingPassword: string | null;
    };
}

export interface SessionListItem {
    bookingId: string;
    sessionId: string;
    bookingStatus: "confirmed" | "completed" | "cancelled" | "no_show";
    sessionStatus: "scheduled" | "ongoing" | "completed" | "cancelled";
    sessionDate: string;
    startTime: string;
    endTime: string;
    priceAtBooking: number;
    canCancel: boolean;
    canJoin: boolean;
    meetingProvider: string | null;
    meetingId: string | null;
    meetingJoinUrl: string | null;
    meetingPassword: string | null;
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
