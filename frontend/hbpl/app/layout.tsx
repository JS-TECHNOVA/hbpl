import type { Metadata } from "next";
import "../src/index.css";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://myhbpl.org"),
  title: {
    default: "HBPL Gorakhpur | Harpur Belahi Premier League",
    template: "%s | HBPL Gorakhpur",
  },
  description:
    "HBPL (Harpur Belahi Premier League) Gorakhpur is a leading local cricket and exam-event platform. Get tournament updates, team registrations, schedules, results, and HBPL exam portal services.",
  keywords: [
    "hbpl",
    "hbpl gorakhpur",
    "harpur belahi premier league",
    "hbpl cricket",
    "gorakhpur cricket tournament",
    "hbpl exam portal",
    "hbpl registration",
    "hbpl result",
    "hbpl admit card",
    "cricket",
    "tournament",
    "gorakhpur",
    "sports",
    "cricket matches",
  ],
  applicationName: "HBPL",
  category: "sports",
  alternates: {
    canonical: "/",
  },
  authors: [{ name: "HBPL" }],
  publisher: "HBPL",
  referrer: "origin-when-cross-origin",
  openGraph: {
    title: "HBPL Gorakhpur | Harpur Belahi Premier League",
    description:
      "Search HBPL or HBPL Gorakhpur to find official updates, tournament details, and exam portal services.",
    url: "https://myhbpl.org",
    siteName: "HBPL",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/hbpl_logo-removebg-preview.png",
        width: 1200,
        height: 630,
        alt: "HBPL Gorakhpur",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HBPL Gorakhpur | Harpur Belahi Premier League",
    description:
      "Official HBPL website for Gorakhpur tournament updates, registrations, schedules, and exam portal.",
    images: ["/hbpl_logo-removebg-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "mN3iAgplUqf6J3-BW9HYqgPq6ofkf0B0rsgoTJHEdyE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
