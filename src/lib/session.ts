import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

/**
 * Deduplicated getServerSession — React `cache()` ensures that multiple
 * server components calling this in the same render tree only trigger
 * ONE actual session lookup (JWT decode + cookie parse).
 */
export const getSession = cache(() => getServerSession(authOptions));
