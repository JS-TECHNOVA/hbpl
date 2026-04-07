import { Suspense } from "react";
import ExamResult from "../../../src/screens/ExamResult";

export const metadata = { title: "Check Result — HBPL Exam Portal" };

export default function ExamResultPage() {
  return (
    <Suspense>
      <ExamResult />
    </Suspense>
  );
}
