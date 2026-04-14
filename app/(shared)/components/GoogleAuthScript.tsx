"use client";

import Script from "next/script";

export function GoogleAuthScript() {
    return (
        <Script
            src="https://accounts.google.com/gsi/client"
            strategy="lazyOnload"
            onLoad={() => {
                window.dispatchEvent(new Event("gis-loaded"));
            }}
        />
    );
}
