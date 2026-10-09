import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Readiness probe: verifies the app can actually talk to its DB.
 * Wire this up to Vercel's monitoring or an external uptime checker —
 * previously there was no endpoint confirming the app is more than "the
 * Node process didn\'t crash."
 */
export async function GET() {
    const checks: Record<string, "ok" | "fail"> = {};
    let healthy = true;

    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = "ok";
    } catch {
        checks.database = "fail";
        healthy = false;
    }

    checks.r2 = (process.env.R2_ENDPOINT && process.env.R2_BUCKET_NAME) ? "ok" : "fail";
    if (checks.r2 === "fail") healthy = false;

    return NextResponse.json(
        { status: healthy ? "healthy" : "unhealthy", checks, timestamp: new Date().toISOString() },
        { status: healthy ? 200 : 503 }
    );
}
