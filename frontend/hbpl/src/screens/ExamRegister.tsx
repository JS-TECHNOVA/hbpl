'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import { submitExamRegistration, fetchExamPortalContent } from '@/lib/api';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter the student name').max(200),
  father_name: z.string().trim().max(200).optional(),
  mother_name: z.string().trim().max(200).optional(),
  date_of_birth: z.string().min(1, 'Select the date of birth'),
  phone: z.string().trim().min(10, 'Enter a valid phone number').max(15),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
  school_name: z.string().trim().max(255).optional(),
  class_name: z.string().trim().max(50).optional(),
  roll_number: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

async function compressImage(file: File, maxWidth: number, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          const outName = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob!], outName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as Record<string, string[] | string>;
      const first = Object.values(parsed)[0];
      return Array.isArray(first) ? first[0] : typeof first === 'string' ? first : error.message;
    } catch {
      return error.message;
    }
  }
  return 'Something went wrong. Please try again.';
}

const ExamRegister = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentImage, setStudentImage] = useState<File | null>(null);
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [rollNumber, setRollNumber] = useState<string>('');

  const { data: portalData } = useQuery({
    queryKey: ['exam-portal-content'],
    queryFn: fetchExamPortalContent,
  });

  const registrationClosed = portalData?.registration_closed ?? false;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      father_name: '',
      mother_name: '',
      date_of_birth: '',
      phone: '',
      email: '',
      school_name: '',
      class_name: '',
      roll_number: '',
      address: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const [compressedStudent, compressedSignature] = await Promise.all([
        studentImage ? compressImage(studentImage, 800) : Promise.resolve(null),
        signatureImage ? compressImage(signatureImage, 600) : Promise.resolve(null),
      ]);
      const result = await submitExamRegistration({
        ...values,
        father_name: values.father_name || '',
        mother_name: values.mother_name || '',
        email: values.email || '',
        school_name: values.school_name || '',
        class_name: values.class_name || '',
        roll_number: values.roll_number || '',
        address: values.address || '',
        student_image: compressedStudent,
        signature_image: compressedSignature,
      });
      setRollNumber(result.roll_number || '');
      setSubmitted(true);
      toast({
        title: 'Registration Successful',
        description: result.roll_number
          ? `Your Roll Number is ${result.roll_number}. Please save it.`
          : 'Your details have been submitted.',
      });
    } catch (err) {
      toast({ title: 'Registration Failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registration Complete!</h2>
          {rollNumber && (
            <div className="my-4 px-4 py-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Your Roll Number</p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400 tracking-widest">{rollNumber}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please save this for future reference</p>
            </div>
          )}
          <p className="text-gray-600 dark:text-gray-300">
            Your details have been submitted. Results will be available once published.
          </p>
        </div>
      </div>
    );
  }

  if (registrationClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registration Closed</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Exam registration is currently closed. Please check back later or contact the organizers for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exam Registration</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Fill in your details to register for the exam.</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="Student full name" {...field} /></FormControl>
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
                <FormField control={form.control} name="father_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father Name (optional)</FormLabel>
                    <FormControl><Input placeholder="Father's name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mother_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother Name (optional)</FormLabel>
                    <FormControl><Input placeholder="Mother's name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="10-digit mobile number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="school_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>School / Institution</FormLabel>
                    <FormControl><Input placeholder="School name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="class_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select class</option>
                        <option value="5">Class 5</option>
                        <option value="6">Class 6</option>
                        <option value="7">Class 7</option>
                        <option value="8">Class 8</option>
                        <option value="9">Class 9</option>
                        <option value="10">Class 10</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="roll_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll No. (optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. HBPL0001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="student@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address (optional)</FormLabel>
                    <FormControl><Textarea placeholder="Full address" rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormItem>
                    <FormLabel>Student Photo</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(event) => setStudentImage(event.target.files?.[0] ?? null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  <FormItem>
                    <FormLabel>Signature Image</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(event) => setSignatureImage(event.target.files?.[0] ?? null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : 'Submit Registration'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ExamRegister;
