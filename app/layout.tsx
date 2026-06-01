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
    // 키보드가 올라오면 레이아웃 뷰포트(100dvh)도 함께 줄여서
    // 하단 입력칸/탭이 키보드 뒤로 가려지지 않도록 함
    interactiveWidget: "resizes-content",
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
                        <DevInspector />
                        {children}
                    </TranslationProvider>
                </ThemeProvider>
                <GoogleAuthScript />
            </body>
        </html>
    );
}
