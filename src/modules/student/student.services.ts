import { prisma } from "../../config/prisma.config";
import { normalizeText } from "../../shared/utils";
import { HttpError } from "../../utils/http-error";
import {
    StudentProfileResponse,
    UpdateStudentProfileInput,
} from "./student.types";

function splitFullName(fullName: string): {
    name: string;
    firstName: string | null;
    lastName: string | null;
} {
    const normalized = normalizeText(fullName);
    const parts = normalized.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

    return {
        name: normalized,
        firstName: firstName || null,
        lastName: lastName || null,
    };
}

export async function updateMyStudentProfile(
    userId: string,
    input: UpdateStudentProfileInput
): Promise<StudentProfileResponse> {
    const fullName = normalizeText(input.fullName);

    if (!fullName) {
        throw new HttpError(400, "Full name is required.");
    }

    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            role: "student",
            deletedAt: null,
        },
        select: {
            id: true,
        },
    });

    if (!user) {
        throw new HttpError(404, "Student profile not found.");
    }

    const parsedName = splitFullName(fullName);
    const image = normalizeText(input.profileImageUrl);

    const updated = await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            name: parsedName.name,
            firstName: parsedName.firstName,
            lastName: parsedName.lastName,
            image: image || null,
        },
        select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
        },
    });

    return {
        profile: {
            id: updated.id,
            name: updated.name,
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            image: updated.image,
        },
    };
}
