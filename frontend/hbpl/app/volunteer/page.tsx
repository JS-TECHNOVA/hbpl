import type { Metadata } from "next";
import Volunteer from "../../src/screens/Volunteer";

export const metadata: Metadata = {
  title: "Volunteer | Join HBPL Team & Help Organize Cricket",
  description:
    "Become a volunteer for HBPL. Help organize and manage the Harpur Belahi Premier League cricket tournament. Join our dedicated team and contribute to cricket excellence.",
  keywords: [
    "volunteer HBPL",
    "cricket volunteer",
    "organize tournament",
    "join HBPL team",
    "volunteer opportunities",
  ],
  openGraph: {
    title: "Volunteer - Join HBPL Team",
    description: "Help organize HBPL and be part of an exciting cricket tournament.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function VolunteerPage() {
  return <Volunteer />;
}
