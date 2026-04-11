import type { Metadata } from "next";
import Home from "@/screens/Home";

export const metadata: Metadata = {
  title: "HBPL Kushinagar - Official Website",
  description:
    "Official HBPL Kushinagar website for Harpur Belahi Premier League updates, team registration, match schedule, gallery, and exam portal services.",
  keywords: [
    "hbpl",
    "hbpl kushinagar",
    "harpur belahi premier league",
    "kushinagar premier league",
    "hbpl official website",
    "hbpl cricket tournament",
    "hbpl results",
    "hbpl schedule",
    "hbpl gallery",
    "hbpl exam portal",
    "kushinagar cricket",
    "sports in kushinagar",
  ],
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <Home />;
}
