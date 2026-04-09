import type { Metadata } from "next";
import { Suspense } from "react";
import ExamAdmitCard from "../../../src/screens/ExamAdmitCard";

export const metadata: Metadata = {
  title: "Download Admit Card | HBPL Exam Portal",
  description:
    "Download your HBPL exam admit card. Enter your roll number and date of birth to access and download your official admit card for the examination.",
  keywords: [
    "admit card",
    "HBPL exam",
    "download admit card",
    "exam document",
  ],
  openGraph: {
    title: "Download Admit Card - HBPL Exam",
    description: "Access and download your HBPL exam admit card instantly.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function ExamAdmitCardPage() {
  return (
    <Suspense>
      <ExamAdmitCard />
    </Suspense>
  );
}
