import { Suspense } from 'react';
import ExamAdmitCard from '../../../src/screens/ExamAdmitCard';

export const metadata = { title: 'Download Admit Card — HBPL Exam Portal' };

export default function AdmitCardPage() {
  return (
    <Suspense>
      <ExamAdmitCard />
    </Suspense>
  );
}
