'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  adminCreateExamCenter,
  adminCreateExamFaq,
  adminCreateExamImportantDate,
  adminCreateExamSamplePaper,
  adminCreateExamSupportSchool,
  adminCreateExamSyllabus,
  adminCreateExamTopper,
  adminDeleteExamCenter,
  adminDeleteExamFaq,
  adminDeleteExamImportantDate,
  adminDeleteExamSamplePaper,
  adminDeleteExamSupportSchool,
  adminDeleteExamSyllabus,
  adminDeleteExamTopper,
  adminFetchExamCenters,
  adminFetchExamFaqs,
  adminFetchExamImportantDates,
  adminFetchExamSamplePapers,
  adminFetchExamSupportSchools,
  adminFetchExamSyllabus,
  adminFetchExamToppers,
  adminFetchStudents,
} from '@/lib/api';
import { useAdmin } from '../_components/admin-shell';
import { LoadingBlock, SectionHeader } from '../_components/admin-ui';

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-4 space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export default function AdminExamPortalPage() {
  const { token, can } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dates = [], isLoading: datesLoading } = useQuery({ queryKey: ['admin-exam-dates', token], queryFn: () => adminFetchExamImportantDates(token) });
  const { data: schools = [], isLoading: schoolsLoading } = useQuery({ queryKey: ['admin-exam-schools', token], queryFn: () => adminFetchExamSupportSchools(token) });
  const { data: syllabus = [], isLoading: syllabusLoading } = useQuery({ queryKey: ['admin-exam-syllabus', token], queryFn: () => adminFetchExamSyllabus(token) });
  const { data: samplePapers = [], isLoading: sampleLoading } = useQuery({ queryKey: ['admin-exam-sample-papers', token], queryFn: () => adminFetchExamSamplePapers(token) });
  const { data: centers = [], isLoading: centersLoading } = useQuery({ queryKey: ['admin-exam-centers', token], queryFn: () => adminFetchExamCenters(token) });
  const { data: faqs = [], isLoading: faqsLoading } = useQuery({ queryKey: ['admin-exam-faqs', token], queryFn: () => adminFetchExamFaqs(token) });
  const { data: toppers = [], isLoading: toppersLoading } = useQuery({ queryKey: ['admin-exam-toppers', token], queryFn: () => adminFetchExamToppers(token) });
  const { data: students = [] } = useQuery({ queryKey: ['admin-students', token], queryFn: () => adminFetchStudents(token) });

  const [dateForm, setDateForm] = useState({ title: '', date: '', order: '0' });
  const [schoolForm, setSchoolForm] = useState({ name: '', address: '', principal_name: '', contact_info: '', order: '0' });
  const [schoolImage, setSchoolImage] = useState<File | null>(null);
  const [syllabusForm, setSyllabusForm] = useState({ class_name: '', title: '', description: '', order: '0' });
  const [syllabusPdf, setSyllabusPdf] = useState<File | null>(null);
  const [paperForm, setPaperForm] = useState({ class_name: '', title: '', description: '', external_url: '', order: '0' });
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [centerForm, setCenterForm] = useState({ center_name: '', form_range: '', roll_range: '', extra_details: '', order: '0' });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', order: '0' });
  const [topperForm, setTopperForm] = useState({ student: '', rank: '1', highlight_text: '', order: '0' });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-dates'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-schools'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-syllabus'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-sample-papers'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-centers'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-faqs'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-toppers'] });
    void queryClient.invalidateQueries({ queryKey: ['exam-portal-content'] });
  };

  const createDate = useMutation({
    mutationFn: () => adminCreateExamImportantDate(token, { ...dateForm, order: Number(dateForm.order) }),
    onSuccess: () => {
      setDateForm({ title: '', date: '', order: '0' });
      invalidateAll();
      toast({ title: 'Date added' });
    },
  });

  const createSchool = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('name', schoolForm.name);
      formData.append('address', schoolForm.address);
      formData.append('principal_name', schoolForm.principal_name);
      formData.append('contact_info', schoolForm.contact_info);
      formData.append('order', schoolForm.order);
      if (schoolImage) formData.append('principal_image', schoolImage);
      return adminCreateExamSupportSchool(token, formData);
    },
    onSuccess: () => {
      setSchoolForm({ name: '', address: '', principal_name: '', contact_info: '', order: '0' });
      setSchoolImage(null);
      invalidateAll();
      toast({ title: 'School added' });
    },
  });

  const createSyllabus = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('class_name', syllabusForm.class_name);
      formData.append('title', syllabusForm.title);
      formData.append('description', syllabusForm.description);
      formData.append('order', syllabusForm.order);
      if (syllabusPdf) formData.append('pdf_file', syllabusPdf);
      return adminCreateExamSyllabus(token, formData);
    },
    onSuccess: () => {
      setSyllabusForm({ class_name: '', title: '', description: '', order: '0' });
      setSyllabusPdf(null);
      invalidateAll();
      toast({ title: 'Syllabus item added' });
    },
  });

  const createPaper = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('class_name', paperForm.class_name);
      formData.append('title', paperForm.title);
      formData.append('description', paperForm.description);
      formData.append('external_url', paperForm.external_url);
      formData.append('order', paperForm.order);
      if (paperFile) formData.append('file', paperFile);
      return adminCreateExamSamplePaper(token, formData);
    },
    onSuccess: () => {
      setPaperForm({ class_name: '', title: '', description: '', external_url: '', order: '0' });
      setPaperFile(null);
      invalidateAll();
      toast({ title: 'Sample paper added' });
    },
  });

  const createCenter = useMutation({
    mutationFn: () => adminCreateExamCenter(token, { ...centerForm, order: Number(centerForm.order) }),
    onSuccess: () => {
      setCenterForm({ center_name: '', form_range: '', roll_range: '', extra_details: '', order: '0' });
      invalidateAll();
      toast({ title: 'Center added' });
    },
  });

  const createFaq = useMutation({
    mutationFn: () => adminCreateExamFaq(token, { ...faqForm, order: Number(faqForm.order) }),
    onSuccess: () => {
      setFaqForm({ question: '', answer: '', order: '0' });
      invalidateAll();
      toast({ title: 'FAQ added' });
    },
  });

  const createTopper = useMutation({
    mutationFn: () => adminCreateExamTopper(token, {
      student: Number(topperForm.student),
      rank: Number(topperForm.rank),
      highlight_text: topperForm.highlight_text,
      order: Number(topperForm.order),
    }),
    onSuccess: () => {
      setTopperForm({ student: '', rank: '1', highlight_text: '', order: '0' });
      invalidateAll();
      toast({ title: 'Topper added' });
    },
  });

  const removeDate = useMutation({ mutationFn: (id: number) => adminDeleteExamImportantDate(token, id), onSuccess: invalidateAll });
  const removeSchool = useMutation({ mutationFn: (id: number) => adminDeleteExamSupportSchool(token, id), onSuccess: invalidateAll });
  const removeSyllabus = useMutation({ mutationFn: (id: number) => adminDeleteExamSyllabus(token, id), onSuccess: invalidateAll });
  const removePaper = useMutation({ mutationFn: (id: number) => adminDeleteExamSamplePaper(token, id), onSuccess: invalidateAll });
  const removeCenter = useMutation({ mutationFn: (id: number) => adminDeleteExamCenter(token, id), onSuccess: invalidateAll });
  const removeFaq = useMutation({ mutationFn: (id: number) => adminDeleteExamFaq(token, id), onSuccess: invalidateAll });
  const removeTopper = useMutation({ mutationFn: (id: number) => adminDeleteExamTopper(token, id), onSuccess: invalidateAll });

  if (datesLoading || schoolsLoading || syllabusLoading || sampleLoading || centersLoading || faqsLoading || toppersLoading) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Exam Portal Content" />

      <Panel title="Important Dates">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Title" value={dateForm.title} onChange={(e) => setDateForm({ ...dateForm, title: e.target.value })} />
          <Input type="date" value={dateForm.date} onChange={(e) => setDateForm({ ...dateForm, date: e.target.value })} />
          <Input type="number" value={dateForm.order} onChange={(e) => setDateForm({ ...dateForm, order: e.target.value })} />
          <Button onClick={() => createDate.mutate()} disabled={createDate.isPending || !can('api.add_examimportantdate')}>Add</Button>
        </div>
        <div className="space-y-2">
          {dates.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
              <span>{item.title} - {item.date}</span>
              <Button size="sm" variant="outline" onClick={() => removeDate.mutate(item.id)} disabled={!can('api.delete_examimportantdate')}>Delete</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Exam Support Schools">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="School name" value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} />
          <Input placeholder="Principal name" value={schoolForm.principal_name} onChange={(e) => setSchoolForm({ ...schoolForm, principal_name: e.target.value })} />
          <Input placeholder="Contact" value={schoolForm.contact_info} onChange={(e) => setSchoolForm({ ...schoolForm, contact_info: e.target.value })} />
          <Input className="md:col-span-2" placeholder="Address" value={schoolForm.address} onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })} />
          <Input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setSchoolImage(e.target.files?.[0] ?? null)} />
          <Input type="number" value={schoolForm.order} onChange={(e) => setSchoolForm({ ...schoolForm, order: e.target.value })} />
          <Button onClick={() => createSchool.mutate()} disabled={createSchool.isPending || !can('api.add_examsupportschool')}>Add</Button>
        </div>
        <div className="space-y-2">
          {schools.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
              <span>{item.name}</span>
              <Button size="sm" variant="outline" onClick={() => removeSchool.mutate(item.id)} disabled={!can('api.delete_examsupportschool')}>Delete</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Detailed Syllabus">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Class" value={syllabusForm.class_name} onChange={(e) => setSyllabusForm({ ...syllabusForm, class_name: e.target.value })} />
          <Input placeholder="Title" value={syllabusForm.title} onChange={(e) => setSyllabusForm({ ...syllabusForm, title: e.target.value })} />
          <Input type="number" value={syllabusForm.order} onChange={(e) => setSyllabusForm({ ...syllabusForm, order: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Description text" value={syllabusForm.description} onChange={(e) => setSyllabusForm({ ...syllabusForm, description: e.target.value })} />
          <Input type="file" accept=".pdf" onChange={(e) => setSyllabusPdf(e.target.files?.[0] ?? null)} />
          <Button onClick={() => createSyllabus.mutate()} disabled={createSyllabus.isPending || !can('api.add_examsyllabusitem')}>Add</Button>
        </div>
        <div className="space-y-2">
          {syllabus.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
              <span>{item.class_name} - {item.title}</span>
              <Button size="sm" variant="outline" onClick={() => removeSyllabus.mutate(item.id)} disabled={!can('api.delete_examsyllabusitem')}>Delete</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Sample Papers">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Class" value={paperForm.class_name} onChange={(e) => setPaperForm({ ...paperForm, class_name: e.target.value })} />
          <Input placeholder="Title" value={paperForm.title} onChange={(e) => setPaperForm({ ...paperForm, title: e.target.value })} />
          <Input type="number" value={paperForm.order} onChange={(e) => setPaperForm({ ...paperForm, order: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Description" value={paperForm.description} onChange={(e) => setPaperForm({ ...paperForm, description: e.target.value })} />
          <Input placeholder="External URL (optional)" value={paperForm.external_url} onChange={(e) => setPaperForm({ ...paperForm, external_url: e.target.value })} />
          <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPaperFile(e.target.files?.[0] ?? null)} />
          <Button onClick={() => createPaper.mutate()} disabled={createPaper.isPending || !can('api.add_examsamplepaper')}>Add</Button>
        </div>
        <div className="space-y-2">
          {samplePapers.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
              <span>{item.class_name} - {item.title}</span>
              <Button size="sm" variant="outline" onClick={() => removePaper.mutate(item.id)} disabled={!can('api.delete_examsamplepaper')}>Delete</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Exam Center Details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Center name" value={centerForm.center_name} onChange={(e) => setCenterForm({ ...centerForm, center_name: e.target.value })} />
          <Input placeholder="Form range" value={centerForm.form_range} onChange={(e) => setCenterForm({ ...centerForm, form_range: e.target.value })} />
          <Input placeholder="Roll range" value={centerForm.roll_range} onChange={(e) => setCenterForm({ ...centerForm, roll_range: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Extra details" value={centerForm.extra_details} onChange={(e) => setCenterForm({ ...centerForm, extra_details: e.target.value })} />
          <Input type="number" value={centerForm.order} onChange={(e) => setCenterForm({ ...centerForm, order: e.target.value })} />
          <Button onClick={() => createCenter.mutate()} disabled={createCenter.isPending || !can('api.add_examcenterdetail')}>Add</Button>
        </div>
        <div className="space-y-2">
          {centers.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
              <span>{item.center_name}</span>
              <Button size="sm" variant="outline" onClick={() => removeCenter.mutate(item.id)} disabled={!can('api.delete_examcenterdetail')}>Delete</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Top 20 Toppers">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select className="border rounded-md px-3 py-2 text-sm" value={topperForm.student} onChange={(e) => setTopperForm({ ...topperForm, student: e.target.value })}>
            <option value="">Select student</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.full_name} ({student.roll_number})</option>)}
          </select>
          <Input type="number" placeholder="Rank" value={topperForm.rank} onChange={(e) => setTopperForm({ ...topperForm, rank: e.target.value })} />
          <Input placeholder="Highlight" value={topperForm.highlight_text} onChange={(e) => setTopperForm({ ...topperForm, highlight_text: e.target.value })} />
          <Input type="number" placeholder="Order" value={topperForm.order} onChange={(e) => setTopperForm({ ...topperForm, order: e.target.value })} />
          <Button onClick={() => createTopper.mutate()} disabled={createTopper.isPending || !can('api.add_examtopper')}>Add</Button>
        </div>
        <div className="space-y-2">
          {toppers.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
              <span>Rank {item.rank} - {item.student_name}</span>
              <Button size="sm" variant="outline" onClick={() => removeTopper.mutate(item.id)} disabled={!can('api.delete_examtopper')}>Delete</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="FAQs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input className="md:col-span-2" placeholder="Question" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} />
          <Input type="number" placeholder="Order" value={faqForm.order} onChange={(e) => setFaqForm({ ...faqForm, order: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Answer" value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} />
          <Button onClick={() => createFaq.mutate()} disabled={createFaq.isPending || !can('api.add_examfaq')}>Add</Button>
        </div>
        <div className="space-y-2">
          {faqs.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-2">
              <span>{item.question}</span>
              <Button size="sm" variant="outline" onClick={() => removeFaq.mutate(item.id)} disabled={!can('api.delete_examfaq')}>Delete</Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
