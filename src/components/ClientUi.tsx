"use client";

import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";

export default function ClientUi() {
    return (
        <>
            <NextTopLoader color="#fff" showSpinner={false} shadow="0 0 10px #ffffff,0 0 5px #ffffff" />
            <Toaster theme="dark" position="bottom-right" />
        </>
    );
}
