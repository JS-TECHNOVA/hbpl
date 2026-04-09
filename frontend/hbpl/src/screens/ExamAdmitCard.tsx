'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Download } from 'lucide-react';
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
import { downloadExamAdmitCard } from '@/lib/api';

const schema = z.object({
  roll_number: z.string().trim().min(2, 'Enter the roll number').max(50),
  date_of_birth: z.string().min(1, 'Select the date of birth'),
});

type FormValues = z.infer<typeof schema>;

const ExamAdmitCard = () => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
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
    setIsDownloading(true);
    try {
      const blob = await downloadExamAdmitCard(values);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `admit_card_${values.roll_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast({ title: 'Admit Card Downloaded' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Admit card download failed.';
      toast({ title: 'Download Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Download Admit Card</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Enter your roll number and date of birth to download your admit card.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="roll_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Number <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. HBPL20260001" {...field} /></FormControl>
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

              <Button type="submit" className="w-full" disabled={isDownloading}>
                {isDownloading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />Download Admit Card</>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ExamAdmitCard;
