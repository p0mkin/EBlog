import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import r2 from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const ext = file.name.split('.').pop();
        const isVoice = file.type.startsWith('audio/') || file.type.includes('webm');
        const prefix = isVoice ? 'messages/voice' : 'messages/images';
        const key = `${prefix}/${Date.now()}-${session.user.email.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
        });

        await r2.send(command);

        return NextResponse.json({ key });
    } catch (error) {
        console.error("Upload message media error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
