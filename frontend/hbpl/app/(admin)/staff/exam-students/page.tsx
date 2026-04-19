'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
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
import {
	adminExportStudentsCSV,
	adminFetchStudents,
	adminImportStudents,
	adminScanStudentImport,
	adminUpdateStudent,
	type AdminExamRegistration,
	type AdminStudentImportResult,
	type AdminStudentImportScanResult,
} from '@/lib/api';
import { useAdmin } from '../_components/admin-shell';
import { LoadingBlock, SectionHeader } from '../_components/admin-ui';

export default function AdminExamStudentsPage() {
	const { token, can } = useAdmin();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const studentImageRef = useRef<HTMLInputElement>(null);
	const signatureImageRef = useRef<HTMLInputElement>(null);
	const testCopyRef = useRef<HTMLInputElement>(null);
	const resultFileRef = useRef<HTMLInputElement>(null);
	const importFileRef = useRef<HTMLInputElement>(null);
	const [search, setSearch] = useState('');
	const [isImportOpen, setIsImportOpen] = useState(false);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importScan, setImportScan] = useState<AdminStudentImportScanResult | null>(null);
	const [importMapping, setImportMapping] = useState<Record<string, string>>({});
	const [importResult, setImportResult] = useState<AdminStudentImportResult | null>(null);
	const [selected, setSelected] = useState<AdminExamRegistration | null>(null);
	const [rollNumber, setRollNumber] = useState('');
	const [fatherName, setFatherName] = useState('');
	const [motherName, setMotherName] = useState('');
	const [examinationCenter, setExaminationCenter] = useState('');
	const [centerAddress, setCenterAddress] = useState('');
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
		setRollNumber(student.roll_number);
		setFatherName(student.father_name ?? '');
		setMotherName(student.mother_name ?? '');
		setExaminationCenter(student.examination_center ?? '');
		setCenterAddress(student.center_address ?? '');
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
			setRollNumber(updated.roll_number);
			setFatherName(updated.father_name ?? '');
			setMotherName(updated.mother_name ?? '');
			setExaminationCenter(updated.examination_center ?? '');
			setCenterAddress(updated.center_address ?? '');
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

	const exportMutation = useMutation({
		mutationFn: () => adminExportStudentsCSV(token),
		onSuccess: (blob) => {
			const blobUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = blobUrl;
			link.download = `exam_students_${new Date().toISOString().split('T')[0]}.csv`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(blobUrl);
			toast({ title: 'CSV Exported', description: `${students.length} students exported.` });
		},
		onError: (error) => {
			toast({
				title: 'Export Failed',
				description: error instanceof Error ? error.message : 'CSV export failed',
				variant: 'destructive',
			});
		},
	});

	const scanImportMutation = useMutation({
		mutationFn: (file: File) => adminScanStudentImport(token, file),
		onSuccess: (scan) => {
			setImportScan(scan);
			setImportResult(null);
			setImportMapping(scan.suggested_mapping ?? {});
			toast({ title: 'File scanned', description: `${scan.row_count} row(s) detected.` });
		},
		onError: (error) => {
			toast({
				title: 'Scan Failed',
				description: error instanceof Error ? error.message : 'Scan failed',
				variant: 'destructive',
			});
		},
	});

	const importMutation = useMutation({
		mutationFn: () => {
			if (!importFile) {
				throw new Error('Select a file first.');
			}
			return adminImportStudents(token, importFile, importMapping);
		},
		onSuccess: (result) => {
			setImportResult(result);
			void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
			toast({
				title: 'Import completed',
				description: `Imported ${result.imported}, Updated ${result.updated}, Skipped ${result.skipped}`,
			});
		},
		onError: (error) => {
			toast({
				title: 'Import Failed',
				description: error instanceof Error ? error.message : 'Import failed',
				variant: 'destructive',
			});
		},
	});

	const buildFormData = (extra: Record<string, string | File>) => {
		const formData = new FormData();
		formData.append('roll_number', rollNumber);
		formData.append('father_name', fatherName);
		formData.append('mother_name', motherName);
		formData.append('examination_center', examinationCenter);
		formData.append('center_address', centerAddress);
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
		student.father_name.toLowerCase().includes(search.toLowerCase()) ||
		student.mother_name.toLowerCase().includes(search.toLowerCase()) ||
		student.roll_number.toLowerCase().includes(search.toLowerCase()) ||
		student.school_name.toLowerCase().includes(search.toLowerCase()) ||
		student.phone.toLowerCase().includes(search.toLowerCase()) ||
		student.class_name.toLowerCase().includes(search.toLowerCase())
	);

	const mappingTargets = [
		'full_name',
		'father_name',
		'mother_name',
		'roll_number',
		'date_of_birth',
		'phone',
		'email',
		'school_name',
		'class_name',
		'examination_center',
		'center_address',
		'address',
		'notes',
	];

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
				<div className="p-4 border-b dark:border-gray-800 flex items-center justify-between gap-3">
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by name, roll number or school..."
						className="max-w-sm"
					/>
					<div className="flex items-center gap-2">
						<input
							ref={importFileRef}
							type="file"
							accept=".csv,.xlsx,.xlsm"
							className="hidden"
							onChange={(event) => {
								const file = event.target.files?.[0] ?? null;
								setImportFile(file);
								setImportScan(null);
								setImportResult(null);
								if (file) {
									setIsImportOpen(true);
									void scanImportMutation.mutate(file);
								}
							}}
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={() => importFileRef.current?.click()}
							disabled={!can('api.change_examregistration') || scanImportMutation.isPending || importMutation.isPending}
						>
							<FileSpreadsheet className="w-4 h-4 mr-2" /> Import Students
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => exportMutation.mutate()}
							disabled={exportMutation.isPending || students.length === 0 || !can('api.view_examregistration')}
						>
							{exportMutation.isPending ? (
								<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
							) : (
								<><Download className="w-4 h-4 mr-2" />Export CSV</>
							)}
						</Button>
					</div>
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
			<Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Import Students from Excel/CSV</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-gray-600 dark:text-gray-300">
							{importFile ? `Selected: ${importFile.name}` : 'Choose a file to start mapping.'}
						</p>

						{scanImportMutation.isPending ? (
							<div className="text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Scanning file...</div>
						) : null}

						{importScan ? (
							<>
								<div className="rounded-lg border p-3 text-sm">
									Detected <strong>{importScan.row_count}</strong> row(s) and <strong>{importScan.headers.length}</strong> column(s).
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{mappingTargets.map((field) => (
										<div key={field} className="space-y-1">
											<label className="text-sm font-medium">{field}</label>
											<select
												value={Object.entries(importMapping).find(([, target]) => target === field)?.[0] ?? ''}
												onChange={(event) => {
													const selectedHeader = event.target.value;
													setImportMapping((prev) => {
														const next = { ...prev };
														Object.keys(next).forEach((key) => {
															if (next[key] === field) delete next[key];
														});
														if (selectedHeader) next[selectedHeader] = field;
														return next;
													});
												}}
												className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
											>
												<option value="">-- Not mapped --</option>
												{importScan.headers.map((header, idx) => (
													<option key={`${field}-option-${idx}`} value={header}>{header}</option>
												))}
											</select>
										</div>
									))}
								</div>

								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										onClick={() => importFile && scanImportMutation.mutate(importFile)}
										disabled={!importFile || scanImportMutation.isPending || importMutation.isPending}
									>
										Rescan
									</Button>
									<Button
										onClick={() => importMutation.mutate()}
										disabled={!importFile || importMutation.isPending || scanImportMutation.isPending}
									>
										{importMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : 'Import Data'}
									</Button>
								</div>
							</>
						) : null}

						{importResult ? (
							<div className="rounded-lg border p-3 text-sm space-y-1">
								<div>Imported: <strong>{importResult.imported}</strong></div>
								<div>Updated: <strong>{importResult.updated}</strong></div>
								<div>Skipped: <strong>{importResult.skipped}</strong></div>
								<div>Errors: <strong>{importResult.error_count}</strong></div>
								{importResult.errors.length > 0 ? (
									<div className="mt-2 max-h-40 overflow-auto border rounded p-2 text-xs">
										{importResult.errors.map((err, idx) => (
											<div key={`${err.row}-${idx}`}>Row {err.row}: {err.error}</div>
										))}
									</div>
								) : null}
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
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
								<Button size="sm" variant="outline" onClick={() => studentImageRef.current?.click()} disabled={mutation.isPending || !can('api.change_examregistration')}>Upload</Button>
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
								<Button size="sm" variant="outline" onClick={() => signatureImageRef.current?.click()} disabled={mutation.isPending || !can('api.change_examregistration')}>Upload</Button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
							<div className="text-gray-500">Roll No.</div>
							<div className="font-medium">{selected.roll_number}</div>
							<div className="text-gray-500">Father Name</div>
							<div className="font-medium">{selected.father_name || '—'}</div>
							<div className="text-gray-500">Mother Name</div>
							<div className="font-medium">{selected.mother_name || '—'}</div>
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
							<div className="text-gray-500">Exam Center</div>
							<div className="font-medium">{selected.examination_center || '—'}</div>
							<div className="text-gray-500">Center Address</div>
							<div className="font-medium">{selected.center_address || '—'}</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-1">Father Name</label>
								<Input value={fatherName} onChange={(event) => setFatherName(event.target.value)} placeholder="Optional" />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Mother Name</label>
								<Input value={motherName} onChange={(event) => setMotherName(event.target.value)} placeholder="Optional" />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Roll No.</label>
								<Input className="font-mono" value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} placeholder="e.g. HBPL00001" />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Examination Center (Admin Only)</label>
								<Input value={examinationCenter} onChange={(event) => setExaminationCenter(event.target.value)} placeholder="Center name" />
							</div>
							<div className="col-span-2">
								<label className="block text-sm font-medium mb-1">Center Address (Admin Only)</label>
								<textarea
									value={centerAddress}
									onChange={(event) => setCenterAddress(event.target.value)}
									placeholder="Full center address"
									rows={2}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>
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
								<Button size="sm" variant="outline" className="w-full" onClick={() => testCopyRef.current?.click()} disabled={mutation.isPending || !can('api.change_examregistration')}>
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
								<Button size="sm" variant="outline" className="w-full" onClick={() => resultFileRef.current?.click()} disabled={mutation.isPending || !can('api.change_examregistration')}>
									<Upload className="w-3 h-3 mr-1" />
									{selected.result_file_url ? 'Replace' : 'Upload'}
								</Button>
							</div>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button onClick={() => mutation.mutate(buildFormData({}))} disabled={mutation.isPending || !can('api.change_examregistration')}>
								{mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
								Save Changes
							</Button>
							<Button
								className={selected.result_status === 'published' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
								onClick={() => mutation.mutate(buildFormData({ result_status: selected.result_status === 'published' ? 'pending' : 'published' }))}
								disabled={mutation.isPending || !can('api.change_examregistration')}
							>
								{selected.result_status === 'published' ? <Clock className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
								{selected.result_status === 'published' ? 'Unpublish Result' : 'Publish Result'}
							</Button>
							<Button
								variant="outline"
								onClick={() => mutation.mutate(buildFormData({ publish_admit_card: selected.publish_admit_card ? 'false' : 'true' }))}
								disabled={mutation.isPending || !can('api.change_examregistration')}
							>
								{selected.publish_admit_card ? 'Unpublish Admit Card' : 'Publish Admit Card'}
							</Button>
							<Button
								variant="outline"
								onClick={() => mutation.mutate(buildFormData({ publish_participation_certificate: selected.publish_participation_certificate ? 'false' : 'true' }))}
								disabled={mutation.isPending || !can('api.change_examregistration')}
							>
								{selected.publish_participation_certificate ? 'Unpublish Certificate' : 'Publish Certificate'}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			) : null}
		</div>
	);
}
