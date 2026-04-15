export interface UpdateStudentProfileInput {
    fullName: string;
    profileImageUrl?: string | null;
}

export interface StudentProfileResponse {
    profile: {
        id: string;
        name: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        image: string | null;
    };
}
