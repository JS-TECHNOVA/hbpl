import { redirect } from "next/navigation";

// Legacy student-only records cannot own exam documents. The current portal
// manages centre allocation and documents on each student–exam enrollment.
export default function LegacyExamStudentsPage(): never {
  redirect("/staff/applications");
}
