'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ExternalLink } from 'lucide-react';
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
import { downloadExamCertificate, lookupExamResult, type ExamResult } from '@/lib/api';

const schema = z.object({
  roll_number: z.string().trim().min(2, 'Enter the roll number').max(50),
  date_of_birth: z.string().min(1, 'Select the date of birth'),
});

type FormValues = z.infer<typeof schema>;

const ExamResult = () => {
  const { toast } = useToast();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
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
                        <ExternalLink className="w-4 h-4" /> View Test Copy
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamResult;
