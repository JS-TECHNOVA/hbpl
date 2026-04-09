import type { Metadata } from "next";
import ExamRegister from "../../../src/screens/ExamRegister";

export const metadata: Metadata = {
  title: "Register for Exam | HBPL Exam Portal",
  description:
    "Register for the HBPL examination. Fill out the form to register yourself for the exam and receive your roll number and admit card.",
  keywords: [
    "exam registration",
    "register for exam",
    "HBPL registration",
    "student registration",
    "exam signup",
  ],
  openGraph: {
    title: "Register for HBPL Exam",
    description: "Complete your HBPL exam registration and get your roll number.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function ExamRegisterPage() {
  return <ExamRegister />;
}
