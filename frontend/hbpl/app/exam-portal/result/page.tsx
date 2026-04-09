import type { Metadata } from "next";
import { Suspense } from "react";
import ExamResult from "../../../src/screens/ExamResult";

export const metadata: Metadata = {
  title: "Check Exam Result | HBPL Exam Portal",
  description:
    "Check your HBPL exam result instantly. Enter your roll number and date of birth to view your score, rank, and download your participation certificate.",
  keywords: [
    "exam result",
    "HBPL result",
    "check result",
    "exam score",
    "certificate download",
  ],
  openGraph: {
    title: "Check Exam Result - HBPL Portal",
    description: "View your HBPL exam result and download your certificate.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function ExamResultPage() {
  return (
    <Suspense>
      <ExamResult />
    </Suspense>
  );
}
