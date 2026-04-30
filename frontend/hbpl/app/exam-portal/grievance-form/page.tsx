import type { Metadata } from "next";
import { Suspense } from "react";
import GrievanceForm from "../../../src/screens/GrievanceForm";

export const metadata: Metadata = {
  title: "Raise Grievance | HBPL Exam Portal",
  description: "Submit a complaint or grievance about your HBPL exam result.",
};

export default function GrievanceFormPage() {
  return (
    <Suspense>
      <GrievanceForm />
    </Suspense>
  );
}
