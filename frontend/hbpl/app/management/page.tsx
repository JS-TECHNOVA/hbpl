import type { Metadata } from "next";
import Management from "../../src/screens/Management";

export const metadata: Metadata = {
  title: "HBPL Management Team | Leadership & Organization",
  description:
    "Meet the HBPL management team. Learn about the officials, organizers, and leaders behind Harpur Belahi Premier League organizing committee.",
  keywords: [
    "HBPL management",
    "organization team",
    "HBPL officials",
    "committee members",
    "cricket organization leadership",
  ],
  openGraph: {
    title: "HBPL Management - Organization Team",
    description: "Meet the leaders and organizers of Harpur Belahi Premier League.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function ManagementPage() {
  return <Management />;
}
