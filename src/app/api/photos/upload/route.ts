import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import r2 from "@/lib/r2";
import { putOracleObject } from "@/lib/oracle";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

function isOwnerCheck(session: any) {
    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const ownerUsername = process.env.OWNER_USERNAME?.toLowerCase().trim();
    const userEmail = session?.user?.email?.toLowerCase().trim();
    const userUsername = (session?.user as any)?.username?.toLowerCase().trim();
    const userName = session?.user?.name?.toLowerCase().trim();
    return (!!ownerEmail && !!userEmail && userEmail === ownerEmail) ||
        (!!ownerUsername && (userUsername === ownerUsername || userName === ownerUsername));
}

// Proxied upload — avoids CORS issues with direct R2/Oracle PUT
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!isOwnerCheck(session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const albumId = formData.get("albumId") as string;
        const provider = (formData.get("provider") as string) || "r2";

        if (!file || !albumId) {
            return NextResponse.json({ error: "Missing file or albumId" }, { status: 400 });
        }

        const key = `photos/${albumId}/${Date.now()}-${file.name}`;
        const arrayBuffer = await file.arrayBuffer();
        const body = new Uint8Array(arrayBuffer);

        if (provider === "oracle") {
            await putOracleObject(key, body, file.type);
        } else {
            const command = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
                Body: body,
                ContentType: file.type,
            });
            await r2.send(command);
        }

        // Save metadata
        const photo = await prisma.photo.create({
            data: {
                albumId,
                filename: file.name,
                r2Key: key,
                storageProvider: provider === "oracle" ? "oracle" : "r2",
                fileSize: file.size,
                visibility: 'visible',
            },
        });

        return NextResponse.json({ success: true, photo });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}
