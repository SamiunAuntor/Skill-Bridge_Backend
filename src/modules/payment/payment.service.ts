import Stripe from "stripe";
import {
    BookingStatus,
    PaymentIntentStatus,
    PaymentStatus,
    Role,
    SessionStatus,
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma.config";
import { env } from "../../config/env";
import { getStripeClient, getStripeWebhookSecret } from "../../lib/stripe";
import { createZoomMeeting } from "../../services/zoom/zoom.service";
import { formatMoney, toDisplayName } from "../../shared/utils";
import { HttpError } from "../../utils/http-error";
import { syncTutorProfileStats } from "../tutor/tutor.services";
import {
    CreatePaymentIntentInput,
    CreatePaymentIntentResponse,
    PaymentStatusResponse,
} from "./payment.types";
import {
    DEFAULT_BOOKING_HOLD_MINUTES,
    DEFAULT_MINIMUM_PAYMENT_AMOUNT_IN_CENTS,
    DEFAULT_PAYMENT_CURRENCY,
} from "./payment.constants";
import { expirePendingBookingHoldById } from "./payment-maintenance.service";
import { createPaymentBookingNotifications } from "./payment-notification.service";

function calculatePrice(hourlyRate: number, startAt: Date, endAt: Date): number {
    const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
    return Number((hourlyRate * Math.max(durationHours, 0)).toFixed(2));
}

function toAmountInCents(amount: number): number {
    return Math.round(amount * 100);
}

function toPaymentIntentStatus(
    status: Stripe.PaymentIntent.Status
): PaymentIntentStatus {
    switch (status) {
        case "requires_payment_method":
            return PaymentIntentStatus.requires_payment_method;
        case "requires_confirmation":
            return PaymentIntentStatus.requires_confirmation;
        case "requires_action":
            return PaymentIntentStatus.requires_action;
        case "processing":
            return PaymentIntentStatus.processing;
        case "succeeded":
            return PaymentIntentStatus.succeeded;
        case "canceled":
            return PaymentIntentStatus.cancelled;
        case "requires_capture":
            return PaymentIntentStatus.requires_capture;
        default:
            return PaymentIntentStatus.requires_payment_method;
    }
}

function toBookingPaymentStatus(
    status: Stripe.PaymentIntent.Status
): PaymentStatus {
    if (status === "succeeded") {
        return PaymentStatus.paid;
    }

    if (status === "canceled") {
        return PaymentStatus.failed;
    }

    return PaymentStatus.pending;
}

function getHoldExpiry(now = new Date()): Date {
    return new Date(
        now.getTime() + DEFAULT_BOOKING_HOLD_MINUTES * 60 * 1000
    );
}

async function expirePendingBookingIfNeeded(slotId: string, now: Date): Promise<void> {
    const existing = await prisma.booking.findUnique({
        where: { slotId },
        select: {
            id: true,
            status: true,
            holdExpiresAt: true,
            payment: {
                select: {
                    stripePaymentIntentId: true,
                    status: true,
                },
            },
        },
    });

    if (
        !existing ||
        existing.status !== BookingStatus.pending_payment ||
        !existing.holdExpiresAt ||
        existing.holdExpiresAt > now
    ) {
        return;
    }

    await prisma.$transaction(async (tx) => {
        if (existing.payment) {
            await tx.payment.update({
                where: { bookingId: existing.id },
                data: {
                    status: PaymentIntentStatus.cancelled,
                    failedAt: now,
                },
            });
        }

        await tx.booking.update({
            where: { id: existing.id },
            data: {
                status: BookingStatus.cancelled,
                paymentStatus: PaymentStatus.failed,
                holdExpiresAt: null,
                cancellationReason: "Payment hold expired.",
                cancelledAt: now,
            },
        });

        await tx.availabilitySlot.update({
            where: { id: slotId },
            data: {
                isBooked: false,
            },
        });
    });

    if (
        existing.payment &&
        existing.payment.status !== PaymentIntentStatus.succeeded
    ) {
        await getStripeClient().paymentIntents.cancel(
            existing.payment.stripePaymentIntentId
        ).catch(() => null);
    }
}

async function ensureBookableContext(studentId: string, input: CreatePaymentIntentInput) {
    const [student, tutor, subject] = await Promise.all([
        prisma.user.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                role: true,
                deletedAt: true,
                isBanned: true,
                email: true,
                name: true,
                firstName: true,
                lastName: true,
            },
        }),
        prisma.tutorProfile.findFirst({
            where: {
                id: input.tutorId,
                deletedAt: null,
                user: {
                    deletedAt: null,
                    isBanned: false,
                    role: Role.tutor,
                },
            },
            select: {
                id: true,
                hourlyRate: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        }),
        prisma.subject.findFirst({
            where: {
                id: input.subjectId,
                isActive: true,
                tutors: {
                    some: {
                        tutorId: input.tutorId,
                    },
                },
            },
            select: {
                id: true,
                name: true,
            },
        }),
    ]);

    if (!student || student.deletedAt || student.isBanned) {
        throw new HttpError(403, "Student account is not allowed to book sessions.");
    }

    if (student.role !== Role.student) {
        throw new HttpError(403, "Only students can make payments for tutor sessions.");
    }

    if (!tutor) {
        throw new HttpError(404, "Tutor not found.");
    }

    if (!subject) {
        throw new HttpError(
            400,
            "Please choose an active tutoring subject offered by this tutor."
        );
    }

    if (studentId === tutor.user.id) {
        throw new HttpError(400, "Tutors cannot book their own slots.");
    }

    return { student, tutor, subject };
}

async function createPendingBookingHold(
    studentId: string,
    input: CreatePaymentIntentInput
): Promise<{
    bookingId: string;
    priceAtBooking: number;
    startTime: Date;
    endTime: Date;
    holdExpiresAt: Date;
}> {
    const now = new Date();
    await expirePendingBookingIfNeeded(input.slotId, now);

    const context = await ensureBookableContext(studentId, input);

    const existingBooking = await prisma.booking.findUnique({
        where: { slotId: input.slotId },
        select: {
            id: true,
            studentId: true,
            tutorId: true,
            subjectId: true,
            status: true,
            holdExpiresAt: true,
            priceAtBooking: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            paymentStatus: true,
            payment: {
                select: {
                    id: true,
                    stripePaymentIntentId: true,
                    status: true,
                },
            },
        },
    });

    if (
        existingBooking &&
        existingBooking.status === BookingStatus.pending_payment &&
        existingBooking.studentId === studentId &&
        existingBooking.subjectId === input.subjectId &&
        existingBooking.holdExpiresAt &&
        existingBooking.holdExpiresAt > now &&
        existingBooking.payment
    ) {
        return {
            bookingId: existingBooking.id,
            priceAtBooking: existingBooking.priceAtBooking,
            startTime: existingBooking.startTime,
            endTime: existingBooking.endTime,
            holdExpiresAt: existingBooking.holdExpiresAt,
        };
    }

    if (
        existingBooking &&
        existingBooking.status !== BookingStatus.cancelled
    ) {
        throw new HttpError(409, "This slot is no longer available for booking.");
    }

    return prisma.$transaction(async (tx) => {
        const slot = await tx.availabilitySlot.findFirst({
            where: {
                id: input.slotId,
                tutorId: context.tutor.id,
                deletedAt: null,
            },
            select: {
                id: true,
                startAt: true,
                endAt: true,
                isBooked: true,
            },
        });

        if (!slot) {
            throw new HttpError(404, "Availability slot not found.");
        }

        if (slot.startAt <= now) {
            throw new HttpError(400, "This slot is no longer available for booking.");
        }

        const lockResult = await tx.availabilitySlot.updateMany({
            where: {
                id: slot.id,
                isBooked: false,
                deletedAt: null,
            },
            data: {
                isBooked: true,
            },
        });

        if (lockResult.count === 0) {
            throw new HttpError(409, "This slot has already been booked.");
        }

        const priceAtBooking = calculatePrice(
            context.tutor.hourlyRate,
            slot.startAt,
            slot.endAt
        );

        if (toAmountInCents(priceAtBooking) < DEFAULT_MINIMUM_PAYMENT_AMOUNT_IN_CENTS) {
            throw new HttpError(
                400,
                "This tutoring session amount is too low for online payment. Please update the tutor's hourly rate first."
            );
        }

        const holdExpiresAt = getHoldExpiry(now);
        const currentBookingForSlot = await tx.booking.findUnique({
            where: { slotId: slot.id },
            select: {
                id: true,
            },
        });

        const booking = currentBookingForSlot
            ? await tx.booking.update({
                  where: { id: currentBookingForSlot.id },
                  data: {
                      studentId,
                      tutorId: context.tutor.id,
                      subjectId: context.subject.id,
                      status: BookingStatus.pending_payment,
                      holdExpiresAt,
                      sessionDate: slot.startAt,
                      startTime: slot.startAt,
                      endTime: slot.endAt,
                      priceAtBooking,
                      paymentStatus: PaymentStatus.pending,
                      paymentMethod: null,
                      paymentReference: null,
                      paidAt: null,
                      cancelledAt: null,
                      cancelledByUserId: null,
                      cancellationReason: null,
                      completedAt: null,
                      deletedAt: null,
                  },
                  select: {
                      id: true,
                      priceAtBooking: true,
                      startTime: true,
                      endTime: true,
                      holdExpiresAt: true,
                  },
              })
            : await tx.booking.create({
                  data: {
                      studentId,
                      tutorId: context.tutor.id,
                      subjectId: context.subject.id,
                      slotId: slot.id,
                      status: BookingStatus.pending_payment,
                      holdExpiresAt,
                      sessionDate: slot.startAt,
                      startTime: slot.startAt,
                      endTime: slot.endAt,
                      priceAtBooking,
                      paymentStatus: PaymentStatus.pending,
                  },
                  select: {
                      id: true,
                      priceAtBooking: true,
                      startTime: true,
                      endTime: true,
                      holdExpiresAt: true,
                  },
              });

        return {
            bookingId: booking.id,
            priceAtBooking: booking.priceAtBooking,
            startTime: booking.startTime,
            endTime: booking.endTime,
            holdExpiresAt: booking.holdExpiresAt ?? holdExpiresAt,
        };
    });
}

async function ensurePaymentIntentForBooking(
    studentId: string,
    input: CreatePaymentIntentInput
): Promise<CreatePaymentIntentResponse> {
    const context = await ensureBookableContext(studentId, input);
    const hold = await createPendingBookingHold(studentId, input);

    const existingPayment = await prisma.payment.findUnique({
        where: { bookingId: hold.bookingId },
        select: {
            id: true,
            stripePaymentIntentId: true,
            amountInCents: true,
            currency: true,
            status: true,
        },
    });

    const stripe = getStripeClient();

    if (
        existingPayment &&
        existingPayment.status !== PaymentIntentStatus.succeeded &&
        existingPayment.status !== PaymentIntentStatus.cancelled
    ) {
        const intent = await stripe.paymentIntents.retrieve(
            existingPayment.stripePaymentIntentId
        );

        if (!intent.client_secret) {
            throw new HttpError(
                409,
                "Unable to continue the existing payment attempt. Please try again."
            );
        }

        return {
            bookingId: hold.bookingId,
            paymentId: existingPayment.id,
            paymentIntentId: intent.id,
            clientSecret: intent.client_secret,
            amountInCents: existingPayment.amountInCents,
            currency: existingPayment.currency,
            status: toPaymentIntentStatus(intent.status),
            holdExpiresAt: hold.holdExpiresAt.toISOString(),
        };
    }

    const amountInCents = toAmountInCents(hold.priceAtBooking);
    const currency = env.PAYMENT_CURRENCY || DEFAULT_PAYMENT_CURRENCY;

    let intent: Stripe.PaymentIntent;

    try {
        intent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never",
            },
            metadata: {
                bookingId: hold.bookingId,
                tutorId: context.tutor.id,
                subjectId: context.subject.id,
                slotId: input.slotId,
                studentId,
            },
        });
    } catch (error) {
        await prisma.$transaction(async (tx) => {
            await tx.booking.update({
                where: { id: hold.bookingId },
                data: {
                    status: BookingStatus.cancelled,
                    paymentStatus: PaymentStatus.failed,
                    holdExpiresAt: null,
                    cancellationReason: "Payment intent could not be created.",
                    cancelledAt: new Date(),
                },
            });

            await tx.availabilitySlot.update({
                where: { id: input.slotId },
                data: {
                    isBooked: false,
                },
            });
        });

        throw new HttpError(
            502,
            "Unable to start the payment right now. Please try again."
        );
    }

    if (!intent.client_secret) {
        throw new HttpError(
            502,
            "Stripe did not return a usable payment client secret."
        );
    }

    const payment = existingPayment
        ? await prisma.payment.update({
              where: { bookingId: hold.bookingId },
              data: {
                  stripePaymentIntentId: intent.id,
                  amountInCents,
                  currency,
                  status: toPaymentIntentStatus(intent.status),
                  stripeCustomerId:
                      typeof intent.customer === "string" ? intent.customer : null,
                  paymentMethod: null,
                  last4Digits: null,
                  cardBrand: null,
                  confirmedAt: null,
                  failedAt: null,
              },
              select: {
                  id: true,
              },
          })
        : await prisma.payment.create({
              data: {
                  bookingId: hold.bookingId,
                  stripePaymentIntentId: intent.id,
                  amountInCents,
                  currency,
                  status: toPaymentIntentStatus(intent.status),
                  stripeCustomerId:
                      typeof intent.customer === "string" ? intent.customer : null,
              },
              select: {
                  id: true,
              },
          });

    await prisma.booking.update({
        where: { id: hold.bookingId },
        data: {
            paymentReference: intent.id,
        },
    });

    return {
        bookingId: hold.bookingId,
        paymentId: payment.id,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        amountInCents,
        currency,
        status: toPaymentIntentStatus(intent.status),
        holdExpiresAt: hold.holdExpiresAt.toISOString(),
    };
}

async function confirmBookingAfterSuccessfulPayment(
    paymentIntent: Stripe.PaymentIntent
): Promise<void> {
    const stripe = getStripeClient();
    const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: {
            booking: {
                include: {
                    student: true,
                    tutor: {
                        include: {
                            user: true,
                        },
                    },
                    session: true,
                },
            },
        },
    });

    if (!payment) {
        throw new HttpError(404, "Payment record not found for Stripe event.");
    }

    if (
        payment.status === PaymentIntentStatus.succeeded &&
        payment.booking.status === BookingStatus.confirmed
    ) {
        return;
    }

    if (
        payment.booking.status === BookingStatus.cancelled ||
        (payment.booking.holdExpiresAt &&
            payment.booking.holdExpiresAt < new Date())
    ) {
        await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => null);
        throw new HttpError(
            409,
            "This booking hold expired before the payment could be confirmed."
        );
    }

    let paymentMethodDetails:
        | Stripe.Charge.PaymentMethodDetails.Card
        | null = null;

    if (paymentIntent.latest_charge) {
        if (typeof paymentIntent.latest_charge === "string") {
            const charge = await stripe.charges
                .retrieve(paymentIntent.latest_charge)
                .catch(() => null);
            paymentMethodDetails = charge?.payment_method_details?.card ?? null;
        } else {
            paymentMethodDetails =
                paymentIntent.latest_charge.payment_method_details?.card ?? null;
        }
    }

    const session = await prisma.$transaction(async (tx) => {
        const ensuredSession =
            payment.booking.session ??
            (await tx.session.create({
                data: {
                    bookingId: payment.booking.id,
                    status: SessionStatus.scheduled,
                },
            }));

        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentIntentStatus.succeeded,
                confirmedAt: new Date(),
                paymentMethod:
                    paymentIntent.payment_method_types[0] ?? payment.paymentMethod,
                last4Digits: paymentMethodDetails?.last4 ?? payment.last4Digits,
                cardBrand: paymentMethodDetails?.brand ?? payment.cardBrand,
            },
        });

        await tx.booking.update({
            where: { id: payment.booking.id },
            data: {
                status: BookingStatus.confirmed,
                paymentStatus: PaymentStatus.paid,
                paymentMethod:
                    paymentIntent.payment_method_types[0] ?? payment.booking.paymentMethod,
                paymentReference: paymentIntent.id,
                paidAt: new Date(),
                holdExpiresAt: null,
            },
        });

        await createPaymentBookingNotifications(
            payment.booking.id,
            payment.booking.student,
            payment.booking.tutor.user,
            payment.booking.startTime,
            payment.booking.endTime,
            formatMoney(payment.booking.priceAtBooking)
        );

        return ensuredSession;
    });

    if (!session.meetingJoinUrl) {
        const zoomMeeting = await createZoomMeeting({
            topic: `SkillBridge Session: ${toDisplayName(payment.booking.student)} with ${toDisplayName(payment.booking.tutor.user)}`,
            startAt: payment.booking.startTime,
            endAt: payment.booking.endTime,
        }).catch(() => null);

        if (zoomMeeting) {
            await prisma.session.update({
                where: { bookingId: payment.booking.id },
                data: {
                    meetingProvider: zoomMeeting.meetingProvider,
                    meetingId: zoomMeeting.meetingId,
                    meetingJoinUrl: zoomMeeting.meetingJoinUrl,
                    meetingHostUrl: zoomMeeting.meetingHostUrl,
                    meetingPassword: zoomMeeting.meetingPassword,
                },
            });
        }
    }
}

async function syncPaymentFailureFromIntent(
    paymentIntent: Stripe.PaymentIntent
): Promise<void> {
    const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: {
            booking: true,
        },
    });

    if (!payment) {
        return;
    }

    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: toPaymentIntentStatus(paymentIntent.status),
            failedAt: new Date(),
        },
    });

    await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
            paymentStatus: toBookingPaymentStatus(paymentIntent.status),
            paymentMethod:
                paymentIntent.payment_method_types[0] ?? payment.booking.paymentMethod,
            paymentReference: paymentIntent.id,
        },
    });
}

async function cancelPaymentAndReleaseBooking(
    paymentIntent: Stripe.PaymentIntent
): Promise<void> {
    const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: {
            booking: true,
        },
    });

    if (!payment) {
        return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentIntentStatus.cancelled,
                failedAt: new Date(),
            },
        });

        await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
                status: BookingStatus.cancelled,
                paymentStatus: PaymentStatus.failed,
                holdExpiresAt: null,
                cancellationReason: "Stripe payment was cancelled.",
                cancelledAt: new Date(),
            },
        });

        await tx.availabilitySlot.update({
            where: { id: payment.booking.slotId },
            data: {
                isBooked: false,
            },
        });
    });
}

export async function createPaymentIntentForBooking(
    studentId: string,
    input: CreatePaymentIntentInput
): Promise<CreatePaymentIntentResponse> {
    return ensurePaymentIntentForBooking(studentId, input);
}

export async function getPaymentStatusForStudent(
    userId: string,
    role: "student" | "tutor" | "admin",
    paymentIntentId: string
): Promise<PaymentStatusResponse> {
    const paymentForExpiryCheck = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        select: {
            bookingId: true,
            booking: {
                select: {
                    studentId: true,
                    status: true,
                    holdExpiresAt: true,
                },
            },
        },
    });

    if (!paymentForExpiryCheck) {
        throw new HttpError(404, "Payment not found.");
    }

    if (role !== Role.admin && paymentForExpiryCheck.booking.studentId !== userId) {
        throw new HttpError(403, "You are not allowed to view this payment.");
    }

    await expirePendingBookingHoldById(paymentForExpiryCheck.bookingId);

    const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        include: {
            booking: true,
        },
    });

    if (!payment) {
        throw new HttpError(404, "Payment not found.");
    }

    if (role !== Role.admin && payment.booking.studentId !== userId) {
        throw new HttpError(403, "You are not allowed to view this payment.");
    }

    return {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        paymentIntentId: payment.stripePaymentIntentId,
        amountInCents: payment.amountInCents,
        currency: payment.currency,
        status: payment.status,
        paymentStatus: payment.booking.paymentStatus,
        bookingStatus: payment.booking.status,
        paymentMethod: payment.paymentMethod ?? null,
        last4Digits: payment.last4Digits ?? null,
        cardBrand: payment.cardBrand ?? null,
        confirmedAt: payment.confirmedAt?.toISOString() ?? null,
        failedAt: payment.failedAt?.toISOString() ?? null,
        holdExpiresAt: payment.booking.holdExpiresAt?.toISOString() ?? null,
    };
}


export async function handleStripeWebhookEvent(
    signature: string | string[] | undefined,
    rawBody: Buffer
): Promise<void> {
    if (!signature || Array.isArray(signature)) {
        throw new HttpError(400, "Stripe signature header is missing.");
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        getStripeWebhookSecret()
    );

    switch (event.type) {
        case "payment_intent.succeeded":
            await confirmBookingAfterSuccessfulPayment(
                event.data.object as Stripe.PaymentIntent
            );
            break;
        case "payment_intent.payment_failed":
            await syncPaymentFailureFromIntent(
                event.data.object as Stripe.PaymentIntent
            );
            break;
        case "payment_intent.canceled":
            await cancelPaymentAndReleaseBooking(
                event.data.object as Stripe.PaymentIntent
            );
            break;
        case "checkout.session.completed":
            break;
        default:
            break;
    }
}
