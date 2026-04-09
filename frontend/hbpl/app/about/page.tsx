import type { Metadata } from "next";
import About from "../../src/screens/About";

export const metadata: Metadata = {
  title: "About HBPL | Harpur Belahi Premier League Organization",
  description:
    "Learn about the Harpur Belahi Premier League (HBPL), its mission, vision, and commitment to promoting cricket excellence. Discover our organizational values and goals.",
  keywords: ["about HBPL", "cricket organization", "Harpur Belahi", "cricket mission"],
  openGraph: {
    title: "About HBPL - Our Mission & Vision",
    description: "Discover HBPL's commitment to cricket excellence and community growth.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function AboutPage() {
  return <About />;
}
