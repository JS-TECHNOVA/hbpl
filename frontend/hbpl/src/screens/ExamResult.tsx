'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { downloadExamCertificate, fetchGrievanceStatus, lookupExamResult, type ExamResult, type GrievanceStatus } from '@/lib/api';

const schema = z.object({
  roll_number: z.string().trim().min(2, 'Enter the roll number').max(50),
  date_of_birth: z.string().min(1, 'Select the date of birth'),
});

type FormValues = z.infer<typeof schema>;

const ExamResult = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [grievances, setGrievances] = useState<GrievanceStatus[]>([]);
  const searchParams = useSearchParams();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { roll_number: '', date_of_birth: '' },
  });

  useEffect(() => {
    const rollFromUrl = searchParams?.get('roll_number');
    if (rollFromUrl) {
      form.setValue('roll_number', rollFromUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const onSubmit = async (values: FormValues) => {
    setIsLookingUp(true);
    setResult(null);
    try {
      const data = await lookupExamResult(values);
      setResult(data);
      const g = await fetchGrievanceStatus(values.roll_number).catch(() => []);
      setGrievances(g);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No record found.';
      toast({ title: 'Not Found', description: msg, variant: 'destructive' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCertificateDownload = async () => {
    if (!result) return;

    setIsDownloadingCertificate(true);
    try {
      const blob = await downloadExamCertificate({
        roll_number: result.roll_number,
        date_of_birth: result.date_of_birth,
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `certificate_${result.roll_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Certificate download failed.';
      toast({ title: 'Download Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Check Result</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Enter your roll number and date of birth to view your result.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="roll_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. HBPL-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isLookingUp}>
                {isLookingUp ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching…</> : 'Check Result'}
              </Button>
            </form>
          </Form>

          {result && (
            <div className="mt-8 border-t pt-8 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Result Details</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">Name</div>
                <div className="font-medium text-gray-900 dark:text-white">{result.full_name}</div>
                <div className="text-gray-500">Roll Number</div>
                <div className="font-medium text-gray-900 dark:text-white">{result.roll_number}</div>
                <div className="text-gray-500">School</div>
                <div className="font-medium text-gray-900 dark:text-white">{result.school_name || '—'}</div>
                <div className="text-gray-500">Class</div>
                <div className="font-medium text-gray-900 dark:text-white">{result.class_name || '—'}</div>
                <div className="text-gray-500">Status</div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    result.result_status === 'published'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {result.result_status === 'published' ? 'Published' : 'Pending'}
                  </span>
                </div>
              </div>

              {result.result_status === 'published' && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-gray-500">Marks Obtained</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">
                      {result.marks_obtained ?? '—'} / {result.total_marks}
                    </div>
                    {result.rank != null && (
                      <>
                        <div className="text-gray-500">Rank</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{result.rank}</div>
                      </>
                    )}
                    {result.remarks && (
                      <>
                        <div className="text-gray-500">Remarks</div>
                        <div className="text-gray-700 dark:text-gray-300">{result.remarks}</div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {result.test_copy_url && (
                      <a
                        href={result.test_copy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" /> View Result Copy
                      </a>
                    )}
                    {result.result_file_url && (
                      <a
                        href={result.result_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" /> Download Result
                      </a>
                    )}
                    <Button
                      type="button"
                      onClick={handleCertificateDownload}
                      disabled={isDownloadingCertificate}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {isDownloadingCertificate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Generating Certificate...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" /> Download Certificate
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {result.result_status === 'pending' && (
                <p className="text-yellow-700 dark:text-yellow-400 text-sm bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  Your result has not been published yet. Please check back later.
                </p>
              )}

              {/* ── Previous grievances ── */}
              {grievances.length > 0 && (
                <div className="border-t pt-6 space-y-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Your Grievances</h3>
                  {grievances.map((g) => (
                    <div key={g.id} className="rounded-lg border dark:border-gray-700 p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 text-xs">
                          {new Date(g.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.status === 'resolved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : g.status === 'under_review'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {g.status === 'resolved' ? 'Resolved' : g.status === 'under_review' ? 'Under Review' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">{g.message}</p>
                      {g.admin_note && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 border-l-4 border-blue-400">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Response from examination team:</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 whitespace-pre-wrap">{g.admin_note}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Not satisfied with your result or facing an issue?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="inline-flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  onClick={() => {
                    const params = new URLSearchParams({
                      roll_number: result.roll_number,
                      name: result.full_name,
                    });
                    router.push(`/exam-portal/grievance-form?${params.toString()}`);
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  Raise Grievance
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamResult;
