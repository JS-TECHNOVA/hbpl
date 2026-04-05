'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Loader2, Upload } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { adminFetchStudents, adminGenerateStudentDocs, adminUpdateStudent, type AdminExamRegistration } from '@/lib/api';
import { useAdmin } from '../_components/admin-shell';
import { LoadingBlock, SectionHeader } from '../_components/admin-ui';

export default function AdminExamStudentsPage() {
	const { token } = useAdmin();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const studentImageRef = useRef<HTMLInputElement>(null);
	const signatureImageRef = useRef<HTMLInputElement>(null);
	const testCopyRef = useRef<HTMLInputElement>(null);
	const resultFileRef = useRef<HTMLInputElement>(null);
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<AdminExamRegistration | null>(null);
	const [marks, setMarks] = useState('');
	const [totalMarks, setTotalMarks] = useState('100');
	const [rank, setRank] = useState('');
	const [remarks, setRemarks] = useState('');

	const { data: students = [], isLoading } = useQuery({
		queryKey: ['admin-students', token],
		queryFn: () => adminFetchStudents(token),
	});

	const openStudent = (student: AdminExamRegistration) => {
		setSelected(student);
		setMarks(student.marks_obtained ?? '');
		setTotalMarks(student.total_marks ?? '100');
		setRank(student.rank != null ? String(student.rank) : '');
		setRemarks(student.remarks ?? '');
	};

	const mutation = useMutation({
		mutationFn: (data: FormData) => adminUpdateStudent(token, selected!.id, data),
		onSuccess: (updated) => {
			void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
			setSelected(updated);
			setMarks(updated.marks_obtained ?? '');
			setTotalMarks(updated.total_marks ?? '100');
			setRank(updated.rank != null ? String(updated.rank) : '');
			setRemarks(updated.remarks ?? '');
			toast({ title: 'Saved' });
		},
		onError: (error) => {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Save failed',
				variant: 'destructive',
			});
		},
	});

	const docsMutation = useMutation({
		mutationFn: (docType: 'admit' | 'certificate' | 'both') => adminGenerateStudentDocs(token, selected!.id, docType),
		onSuccess: (updated) => {
			void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
			setSelected(updated);
			toast({ title: 'Document generated' });
		},
		onError: (error) => {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Document generation failed',
				variant: 'destructive',
			});
		},
	});

	const buildFormData = (extra: Record<string, string | File>) => {
		const formData = new FormData();
		if (marks !== '') formData.append('marks_obtained', marks);
		if (totalMarks !== '') formData.append('total_marks', totalMarks);
		if (rank !== '') formData.append('rank', rank);
		formData.append('remarks', remarks);

		for (const [key, value] of Object.entries(extra)) {
			if (!value) continue;
			if (value instanceof File) {
				formData.append(key, value);
			} else {
				formData.append(key, value);
			}
		}

		return formData;
	};

	const filteredStudents = students.filter((student) =>
		student.full_name.toLowerCase().includes(search.toLowerCase()) ||
		student.roll_number.toLowerCase().includes(search.toLowerCase()) ||
		student.school_name.toLowerCase().includes(search.toLowerCase()) ||
		student.phone.toLowerCase().includes(search.toLowerCase()),
	);

	const publishedCount = students.filter((student) => student.result_status === 'published').length;

	return (
		<div className="space-y-6">
			<SectionHeader title="Exam Students" />
			<div className="grid grid-cols-3 gap-4">
				{[
					{ label: 'Total', value: students.length, color: 'text-blue-600' },
					{ label: 'Published', value: publishedCount, color: 'text-green-600' },
					{ label: 'Pending', value: students.length - publishedCount, color: 'text-yellow-600' },
				].map((stat) => (
					<div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-800">
						<p className="text-sm text-gray-500">{stat.label}</p>
						<p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
					</div>
				))}
			</div>
			<div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800">
				<div className="p-4 border-b dark:border-gray-800">
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by name, roll number or school..."
						className="max-w-sm"
					/>
				</div>
				{isLoading ? (
					<LoadingBlock />
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Photo</TableHead>
									<TableHead>Roll No.</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>School</TableHead>
									<TableHead>Marks</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredStudents.map((student) => (
									<TableRow
										key={student.id}
										className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
										onClick={() => openStudent(student)}
									>
										<TableCell>
											{student.student_image_url ? (
												<Image src={student.student_image_url} alt={student.full_name} width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
											) : (
												<div className="w-9 h-9 rounded-full bg-gray-200" />
											)}
										</TableCell>
										<TableCell className="font-mono text-sm">{student.roll_number}</TableCell>
										<TableCell className="font-medium">{student.full_name}</TableCell>
										<TableCell className="text-gray-500">{student.school_name || '—'}</TableCell>
										<TableCell>
											{student.marks_obtained != null ? `${student.marks_obtained}/${student.total_marks}` : <span className="text-gray-400">—</span>}
										</TableCell>
										<TableCell>
											<Badge variant={student.result_status === 'published' ? 'default' : 'secondary'}>
												{student.result_status === 'published' ? (
													<>
														<CheckCircle className="w-3 h-3 mr-1" />
														Published
													</>
												) : (
													<>
														<Clock className="w-3 h-3 mr-1" />
														Pending
													</>
												)}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
			{selected ? (
				<Dialog open onOpenChange={() => setSelected(null)}>
					<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-3">
								<span>{selected.full_name}</span>
								<Badge variant={selected.result_status === 'published' ? 'default' : 'secondary'}>
									{selected.result_status === 'published' ? 'Published' : 'Pending'}
								</Badge>
							</DialogTitle>
						</DialogHeader>
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border p-3 space-y-2">
								<p className="text-sm font-medium">Student Photo</p>
								{selected.student_image_url ? (
									<Image src={selected.student_image_url} alt={selected.full_name} width={120} height={120} className="w-24 h-24 rounded-lg object-cover" />
								) : <div className="w-24 h-24 rounded-lg bg-gray-200" />}
								<input
									ref={studentImageRef}
									type="file"
									accept=".jpg,.jpeg,.png,.webp"
									className="hidden"
									onChange={() => {
										const file = studentImageRef.current?.files?.[0];
										if (file) mutation.mutate(buildFormData({ student_image: file }));
									}}
								/>
								<Button size="sm" variant="outline" onClick={() => studentImageRef.current?.click()} disabled={mutation.isPending}>Upload</Button>
							</div>
							<div className="rounded-xl border p-3 space-y-2">
								<p className="text-sm font-medium">Signature</p>
								{selected.signature_image_url ? (
									<Image src={selected.signature_image_url} alt="Signature" width={180} height={90} className="w-36 h-20 rounded-lg object-contain bg-white" />
								) : <div className="w-36 h-20 rounded-lg bg-gray-200" />}
								<input
									ref={signatureImageRef}
									type="file"
									accept=".jpg,.jpeg,.png,.webp"
									className="hidden"
									onChange={() => {
										const file = signatureImageRef.current?.files?.[0];
										if (file) mutation.mutate(buildFormData({ signature_image: file }));
									}}
								/>
								<Button size="sm" variant="outline" onClick={() => signatureImageRef.current?.click()} disabled={mutation.isPending}>Upload</Button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
							<div className="text-gray-500">Roll No.</div>
							<div className="font-medium">{selected.roll_number}</div>
							<div className="text-gray-500">DOB</div>
							<div className="font-medium">{selected.date_of_birth}</div>
							<div className="text-gray-500">Phone</div>
							<div className="font-medium">{selected.phone}</div>
							<div className="text-gray-500">Email</div>
							<div className="font-medium">{selected.email || '—'}</div>
							<div className="text-gray-500">School</div>
							<div className="font-medium">{selected.school_name || '—'}</div>
							<div className="text-gray-500">Class</div>
							<div className="font-medium">{selected.class_name || '—'}</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-1">Marks Obtained</label>
								<Input type="number" value={marks} onChange={(event) => setMarks(event.target.value)} placeholder="85" />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Total Marks</label>
								<Input type="number" value={totalMarks} onChange={(event) => setTotalMarks(event.target.value)} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Rank</label>
								<Input type="number" value={rank} onChange={(event) => setRank(event.target.value)} placeholder="Optional" />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Remarks</label>
								<Input value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Pass / Fail" />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="border-2 border-dashed rounded-xl p-3 space-y-2">
								<p className="text-sm font-medium">Test Copy</p>
								{selected.test_copy_url ? (
									<a href={selected.test_copy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
										View ↗
									</a>
								) : null}
								<input
									ref={testCopyRef}
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									className="hidden"
									onChange={() => {
										const file = testCopyRef.current?.files?.[0];
										if (file) {
											mutation.mutate(buildFormData({ test_copy: file }));
										}
									}}
								/>
								<Button size="sm" variant="outline" className="w-full" onClick={() => testCopyRef.current?.click()} disabled={mutation.isPending}>
									<Upload className="w-3 h-3 mr-1" />
									{selected.test_copy_url ? 'Replace' : 'Upload'}
								</Button>
							</div>
							<div className="border-2 border-dashed rounded-xl p-3 space-y-2">
								<p className="text-sm font-medium">Result File</p>
								{selected.result_file_url ? (
									<a href={selected.result_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
										View ↗
									</a>
								) : null}
								<input
									ref={resultFileRef}
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									className="hidden"
									onChange={() => {
										const file = resultFileRef.current?.files?.[0];
										if (file) {
											mutation.mutate(buildFormData({ result_file: file }));
										}
									}}
								/>
								<Button size="sm" variant="outline" className="w-full" onClick={() => resultFileRef.current?.click()} disabled={mutation.isPending}>
									<Upload className="w-3 h-3 mr-1" />
									{selected.result_file_url ? 'Replace' : 'Upload'}
								</Button>
							</div>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button onClick={() => mutation.mutate(buildFormData({}))} disabled={mutation.isPending}>
								{mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
								Save Changes
							</Button>
							{selected.result_status === 'published' ? (
								<Button variant="outline" onClick={() => mutation.mutate(buildFormData({ result_status: 'pending' }))} disabled={mutation.isPending}>
									<Clock className="w-4 h-4 mr-2" />
									Unpublish
								</Button>
							) : (
								<Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => mutation.mutate(buildFormData({ result_status: 'published' }))} disabled={mutation.isPending}>
									<CheckCircle className="w-4 h-4 mr-2" />
									Publish Result
								</Button>
							)}
							<Button variant="outline" onClick={() => docsMutation.mutate('admit')} disabled={docsMutation.isPending}>Generate Admit Card</Button>
							<Button variant="outline" onClick={() => docsMutation.mutate('certificate')} disabled={docsMutation.isPending}>Generate Certificate</Button>
							{selected.publish_admit_card ? (
								<Button variant="outline" onClick={() => mutation.mutate(buildFormData({ publish_admit_card: 'false' }))}>Unpublish Admit Card</Button>
							) : (
								<Button variant="outline" onClick={() => mutation.mutate(buildFormData({ publish_admit_card: 'true' }))}>Publish Admit Card</Button>
							)}
							{selected.publish_participation_certificate ? (
								<Button variant="outline" onClick={() => mutation.mutate(buildFormData({ publish_participation_certificate: 'false' }))}>Unpublish Certificate</Button>
							) : (
								<Button variant="outline" onClick={() => mutation.mutate(buildFormData({ publish_participation_certificate: 'true' }))}>Publish Certificate</Button>
							)}
							{selected.admit_card_url ? <a href={selected.admit_card_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">View Admit Card</a> : null}
							{selected.participation_certificate_url ? <a href={selected.participation_certificate_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">View Certificate</a> : null}
						</div>
					</DialogContent>
				</Dialog>
			) : null}
		</div>
	);
}
