import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reviodigital.uk"),
  title: {
    default: "Revio — AI-powered Google review replies for UK businesses",
    template: "%s · Revio",
  },
  description:
    "Revio manages and replies to your Google reviews automatically using AI. Approve, edit or auto-post replies in seconds. Built for small UK businesses.",
  openGraph: {
    title: "Revio — AI-powered Google review replies",
    description:
      "Automatically manage and reply to your Google reviews. Built for small UK businesses.",
    url: "https://reviodigital.uk",
    siteName: "Revio",
    locale: "en_GB",
    type: "website",
  },
  icons: {
    icon: [{ url: "/revio-icon.png", type: "image/png" }],
    apple: "/revio-icon.png",
    shortcut: "/revio-icon.png",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}