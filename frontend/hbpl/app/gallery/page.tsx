import type { Metadata } from "next";
import Gallery from "../../src/screens/Gallery";

export const metadata: Metadata = {
  title: "HBPL Gallery | Cricket Tournament Photos & Highlights",
  description:
    "Browse the HBPL photo gallery featuring exciting cricket moments, team photos, match highlights, and memorable tournament memories from Harpur Belahi Premier League.",
  keywords: [
    "HBPL gallery",
    "cricket photos",
    "tournament highlights",
    "cricket images",
    "match photos",
  ],
  openGraph: {
    title: "HBPL Gallery - Tournament Photos & Highlights",
    description: "View exciting cricket moments and match highlights from HBPL.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function GalleryPage() {
  return <Gallery />;
}
