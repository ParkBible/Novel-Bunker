import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DevInspector } from "./(shared)/components/DevInspector";
import { GoogleAuthScript } from "./(shared)/components/GoogleAuthScript";
import { ThemeProvider } from "./(shared)/components/ThemeProvider";
import { TranslationProvider } from "./(shared)/i18n/TranslationProvider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Novel Bunker",
    description: "Local-first novel writing editor",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider>
                    <TranslationProvider>
                        <GoogleAuthScript />
                        <DevInspector />
                        {children}
                    </TranslationProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
