import type { Metadata } from "next";
import HBPL_Examportal from "../../src/screens/HBPL_Examportal";

export const metadata: Metadata = {
  title: "HBPL Exam Portal | Results, Admit Cards & Certificates",
  description:
    "Access the HBPL Exam Portal to check exam results, download admit cards, certificates, and important exam information. Register and manage your exam participation.",
  keywords: [
    "HBPL exam portal",
    "exam results",
    "admit card",
    "certificate download",
    "exam registration",
  ],
  openGraph: {
    title: "HBPL Exam Portal - Results & Documents",
    description: "Check your exam results and download admit cards and certificates from HBPL Exam Portal.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function ExamportalPage() {
  return <HBPL_Examportal />;
}
