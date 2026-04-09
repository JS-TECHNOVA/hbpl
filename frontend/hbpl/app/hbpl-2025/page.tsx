import type { Metadata } from "next";
import HBPL2025 from "../../src/screens/HBPL_2025";

export const metadata: Metadata = {
  title: "HBPL 2025 | Harpur Belahi Premier League Tournament",
  description:
    "HBPL 2025 - The latest edition of Harpur Belahi Premier League. Check tournament details, schedule, participating teams, and register for live action.",
  keywords: [
    "HBPL 2025",
    "cricket tournament",
    "Premier League",
    "HBPL tournament details",
    "cricket schedule",
  ],
  openGraph: {
    title: "HBPL 2025 - Premier League Tournament",
    description: "Join HBPL 2025 for an exciting cricket tournament with elite teams.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function HBPL2025Page() {
  return <HBPL2025 />;
}
