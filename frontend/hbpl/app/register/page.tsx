import type { Metadata } from "next";
import Register from "../../src/screens/Register";

export const metadata: Metadata = {
  title: "Register Team | HBPL Team Registration",
  description:
    "Register your cricket team for HBPL (Harpur Belahi Premier League). Complete the registration form and join the exciting tournament with teams from across the region.",
  keywords: [
    "team registration",
    "HBPL registration",
    "cricket team signup",
    "register for HBPL",
    "tournament registration",
  ],
  openGraph: {
    title: "Register Your Team - HBPL Registration",
    description: "Join HBPL by registering your cricket team today!",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function RegisterPage() {
  return <Register />;
}
