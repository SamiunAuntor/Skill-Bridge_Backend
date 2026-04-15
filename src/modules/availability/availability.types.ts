export interface AvailabilitySlotDto {
    id: string;
    tutorId: string;
    startAt: string;
    endAt: string;
    isBooked: boolean;
}

export interface CreateAvailabilityInput {
    startAt: Date;
    endAt: Date;
}

export interface UpdateAvailabilityInput {
    startAt: Date;
    endAt: Date;
}

export interface AvailabilityListResponse {
    slots: AvailabilitySlotDto[];
}
