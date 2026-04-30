'use client';

import { useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle, Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { submitComplaint } from '@/lib/api';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  roll_number: z.string().trim().min(2, 'Enter your roll number'),
  message: z.string().trim().min(10, 'Please describe your grievance in at least 10 characters'),
});

type FormValues = z.infer<typeof schema>;

const GrievanceForm = () => {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: searchParams?.get('name') ?? '',
      roll_number: searchParams?.get('roll_number') ?? '',
      message: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await submitComplaint({ ...values, screenshot });
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Grievance Submitted</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your complaint has been received. The examination team will review it and respond.
              Go back to the result page and look up your result to see the response.
            </p>
            <Button onClick={() => router.push('/exam-portal/result')}>
              Back to Results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Raise Grievance</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Not satisfied with your result? Submit a complaint and our team will review it.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="roll_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. HBPL2026001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grievance Details <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your complaint in detail — e.g. marks appear incorrect, result not updated, etc."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Screenshot / attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attachment <span className="text-gray-400 text-xs">(optional — screenshot of your result)</span>
                </label>
                {screenshot ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-sm">
                    <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{screenshot.name}</span>
                    <button
                      type="button"
                      onClick={() => { setScreenshot(null); if (fileRef.current) fileRef.current.value = ''; }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4 mr-2" /> Attach Screenshot
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : 'Submit Grievance'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default GrievanceForm;
