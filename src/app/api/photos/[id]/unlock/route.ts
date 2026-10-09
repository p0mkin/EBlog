/* eslint-disable */
import { NextResponse } from "next/server";

/**
 * POST /api/photos/[id]/unlock
 *
 * ⚠️ DISABLED: this endpoint previously created a PhotoUnlock record
 * for the calling user with ZERO payment verification — no Stripe
 * session, no webhook, no payment_intent check. A full-repo scan
 * confirmed there is no payment processor integrated anywhere, so
 * any authenticated user could unlock any Pay-As-You-Go photo for
 * free via a single POST request.
 *
 * Returning 501 until a real payment verification step is added here
 * (e.g. confirm a completed Stripe PaymentIntent/Checkout Session tied
 * to this exact photoId + userId before calling prisma.photoUnlock.create).
 */
export async function POST() {
    return NextResponse.json(
        { error: "Photo unlock is not yet available — payment verification is not implemented." },
        { status: 501 }
    );
}
