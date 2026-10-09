import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const authMiddleware = withAuth({
    pages: { signIn: "/signin" },
});

export default function middleware(req: any) {
    const authResponse = authMiddleware(req, {} as any);
    const response = (authResponse instanceof NextResponse) ? authResponse : NextResponse.next();

    // ✅ Security headers applied to every gated response
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    response.headers.set(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "img-src 'self' blob: data:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
        ].join("; ")
    );

    return response;
}

export const config = {
    matcher: ["/gallery/:path*"],
};
