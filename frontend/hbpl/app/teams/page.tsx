import type { Metadata } from "next";
import Teams from "../../src/screens/Teams";

export const metadata: Metadata = {
  title: "HBPL Teams | Participating Cricket Teams Directory",
  description:
    "Discover all participating teams in HBPL. View team profiles, rosters, captains, and details about each cricket team competing in Harpur Belahi Premier League.",
  keywords: [
    "HBPL teams",
    "cricket teams",
    "team directory",
    "HBPL teams list",
    "cricket rosters",
  ],
  openGraph: {
    title: "HBPL Teams - Cricket Team Directory",
    description: "Explore all the participating teams in the Harpur Belahi Premier League.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function TeamsPage() {
  return <Teams />;
}
