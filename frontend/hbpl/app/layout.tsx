import type { Metadata } from "next";
import "../src/index.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "HBPL - Harpur Belahi Premier League | Cricket Tournament",
  description:
    "Harpur Belahi Premier League (HBPL) - Where cricket passion meets excellence. Join the most exciting cricket tournament with elite teams, live scores, and unforgettable matches.",
  keywords: [
    "cricket",
    "tournament",
    "HBPL",
    "Harpur Belahi",
    "premier league",
    "sports",
    "cricket matches",
    "live scores",
  ],
  authors: [{ name: "HBPL" }],
  openGraph: {
    title: "HBPL - Harpur Belahi Premier League",
    description:
      "Experience the thrill of cricket excellence at HBPL. Register your team today!",
    type: "website",
    images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@lovable_dev",
    images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
