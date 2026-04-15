import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Novel Bunker",
        short_name: "Novel Bunker",
        description: "로컬 우선 소설 작성 에디터",
        start_url: "/",
        display: "standalone",
        background_color: "#18181b",
        theme_color: "#18181b",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
    };
}
