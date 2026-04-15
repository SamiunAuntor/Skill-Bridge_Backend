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

export interface SessionListResponse {
    sessions: SessionListItem[];
}

export interface CancelBookingResponse {
    bookingId: string;
    sessionId: string | null;
    status: "cancelled";
    sessionStatus: "cancelled" | null;
    slotReleased: boolean;
}
