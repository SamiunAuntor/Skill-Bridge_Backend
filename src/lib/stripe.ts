import Stripe from "stripe";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
    if (!env.STRIPE_SECRET_KEY) {
        throw new HttpError(
            503,
            "Payment processing is not configured yet. Please try again later."
        );
    }

    if (!stripeClient) {
        stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-08-27.basil",
        });
    }

    return stripeClient;
}

export function getStripeWebhookSecret(): string {
    if (!env.STRIPE_WEBHOOK_SECRET) {
        throw new HttpError(
            503,
            "Payment webhook handling is not configured yet."
        );
    }

    return env.STRIPE_WEBHOOK_SECRET;
}
