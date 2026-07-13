import { ContactSubmissionStatus, Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { HttpError } from "../../utils/http-error";

type CreateContactInput = {
    name: string;
    email: string;
    subject: string;
    message: string;
};

export async function createContactSubmission(input: CreateContactInput) {
    const duplicate = await prisma.contactSubmission.findFirst({
        where: {
            email: input.email,
            subject: input.subject,
            message: input.message,
            createdAt: { gte: new Date(Date.now() - 60_000) },
        },
        select: { id: true },
    });

    if (duplicate) {
        throw new HttpError(429, "Please wait before sending the same message again.");
    }

    const created = await prisma.contactSubmission.create({
        data: input,
        select: { id: true, createdAt: true },
    });

    return { id: created.id, createdAt: created.createdAt.toISOString() };
}

export async function getContactSubmissions(input: {
    q?: string;
    status?: ContactSubmissionStatus;
    sortBy: "newest" | "oldest";
    page: number;
    limit: number;
}) {
    const where: Prisma.ContactSubmissionWhereInput = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.q
            ? {
                  OR: [
                      { name: { contains: input.q, mode: "insensitive" } },
                      { email: { contains: input.q, mode: "insensitive" } },
                      { subject: { contains: input.q, mode: "insensitive" } },
                      { message: { contains: input.q, mode: "insensitive" } },
                  ],
              }
            : {}),
    };
    const [items, total] = await Promise.all([
        prisma.contactSubmission.findMany({
            where,
            orderBy: { createdAt: input.sortBy === "oldest" ? "asc" : "desc" },
            skip: (input.page - 1) * input.limit,
            take: Math.min(input.limit, 50),
        }),
        prisma.contactSubmission.count({ where }),
    ]);

    return {
        items: items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        })),
        meta: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / input.limit)),
        },
    };
}

export async function updateContactSubmissionStatus(
    id: string,
    status: ContactSubmissionStatus
) {
    const item = await prisma.contactSubmission.update({
        where: { id },
        data: { status },
    });
    return {
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
    };
}
