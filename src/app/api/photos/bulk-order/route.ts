/* eslint-disable */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { isOwner } from "@/lib/auth-utils";
import { z } from "zod";

const bulkOrderSchema = z.object({
    updates: z.array(
        z.object({
            id: z.string().min(1),
            sortOrder: z.number().int(),
        })
    ).min(1),
});

// POST /api/photos/bulk-order
// Accepts: { updates: { id: string, sortOrder: number }[] }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwner(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const payload = await req.json();
        const parsed = bulkOrderSchema.safeParse(payload);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload details", details: parsed.error.format() }, { status: 400 });
        }

        const { updates } = parsed.data;

        // Perform updates in a transaction
        await prisma.$transaction(
            updates.map((u: { id: string, sortOrder: number }) =>
                prisma.photo.update({
                    where: { id: u.id },
                    data: { sortOrder: u.sortOrder },
                })
            )
        );

        // @ts-ignore
        revalidateTag('photos', { expire: 0 });
        // @ts-ignore
        revalidateTag('albums', { expire: 0 });
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("Bulk reorder error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
