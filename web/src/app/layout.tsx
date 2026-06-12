import type { Metadata } from "next";
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://neon-image-studio.vercel.app"),
  title: "Neon Image Studio — cast anyone into any scene",
  description:
    "Upload photos of people, @-mention them in a prompt, and generate AI images that use their faces as a starting point. Shared team workspaces, built on Neon.",
  openGraph: {
    title: "Neon Image Studio",
    description:
      "Cast anyone into any scene. Upload people, @-mention them, and generate together.",
    type: "website",
    url: "https://neon-image-studio.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neon Image Studio",
    description: "Cast anyone into any scene — AI image studio for teams, built on Neon.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
