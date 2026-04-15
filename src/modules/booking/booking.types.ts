export interface CreateBookingInput {
    tutorId: string;
    slotId: string;
}

export interface BookingConfirmationResponse {
    booking: {
        id: string;
        tutorId: string;
        slotId: string;
        sessionDate: string;
        startTime: string;
        endTime: string;
        priceAtBooking: number;
        status: "confirmed";
        paymentStatus: "paid";
    };
}
