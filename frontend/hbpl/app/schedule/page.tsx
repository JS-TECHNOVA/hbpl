import type { Metadata } from "next";
import Schedule from "../../src/screens/Schedule";

export const metadata: Metadata = {
  title: "HBPL Schedule | Cricket Match Timetable & Fixture",
  description:
    "View the complete HBPL cricket match schedule. Check dates, times, venues, and upcoming fixtures for Harpur Belahi Premier League matches.",
  keywords: ["HBPL schedule", "cricket fixtures", "match timetable", "HBPL matches", "cricket upcoming"],
  openGraph: {
    title: "HBPL Schedule - Match Fixtures & Timetable",
    description: "Stay updated with the latest HBPL cricket match schedule and fixtures.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function SchedulePage() {
  return <Schedule />;
}
