'use client';

import { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart2, CheckCircle, Clock, Download, FileSpreadsheet, FolderOpen, Loader2, Search, Trash2, Upload, X } from 'lucide-react';
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
	adminImportMarks,
	adminImportStudents,
	adminScanMarksImport,
	adminScanStudentImport,
	adminUpdateStudent,
	adminUploadTestCopies,
	type AdminExamRegistration,
	type AdminMarksImportResult,
	type AdminMarksImportScanResult,
	type AdminStudentImportResult,
	type AdminStudentImportScanResult,
	type AdminTestCopyUploadResult,
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
	const marksImportFileRef = useRef<HTMLInputElement>(null);
	const testCopiesFolderRef = useRef<HTMLInputElement>(null);
	const [search, setSearch] = useState('');
	const [filterClass, setFilterClass] = useState('');
	const [filterSchool, setFilterSchool] = useState('');
	const [filterStatus, setFilterStatus] = useState('');
	const [quickQuery, setQuickQuery] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);
	const quickSearchRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (quickSearchRef.current && !quickSearchRef.current.contains(e.target as Node)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);
	const [isImportOpen, setIsImportOpen] = useState(false);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importScan, setImportScan] = useState<AdminStudentImportScanResult | null>(null);
	const [importMapping, setImportMapping] = useState<Record<string, string>>({});
	const [importResult, setImportResult] = useState<AdminStudentImportResult | null>(null);

	const [isMarksImportOpen, setIsMarksImportOpen] = useState(false);
	const [marksImportFile, setMarksImportFile] = useState<File | null>(null);
	const [marksImportScan, setMarksImportScan] = useState<AdminMarksImportScanResult | null>(null);
	const [marksImportMapping, setMarksImportMapping] = useState<Record<string, string>>({});
	const [marksImportResult, setMarksImportResult] = useState<AdminMarksImportResult | null>(null);

	const [isTestCopiesOpen, setIsTestCopiesOpen] = useState(false);
	const [testCopiesFiles, setTestCopiesFiles] = useState<File[]>([]);
	const [testCopiesResult, setTestCopiesResult] = useState<AdminTestCopyUploadResult | null>(null);
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

	const scanMarksMutation = useMutation({
		mutationFn: (file: File) => adminScanMarksImport(token, file),
		onSuccess: (scan) => {
			setMarksImportScan(scan);
			setMarksImportResult(null);
			setMarksImportMapping(scan.suggested_mapping ?? {});
			toast({ title: 'File scanned', description: `${scan.row_count} row(s) detected.` });
		},
		onError: (error) => {
			toast({ title: 'Scan Failed', description: error instanceof Error ? error.message : 'Scan failed', variant: 'destructive' });
		},
	});

	const importMarksMutation = useMutation({
		mutationFn: () => {
			if (!marksImportFile) throw new Error('Select a file first.');
			return adminImportMarks(token, marksImportFile, marksImportMapping);
		},
		onSuccess: (result) => {
			setMarksImportResult(result);
			void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
			toast({ title: 'Marks imported', description: `${result.updated} student(s) updated.` });
		},
		onError: (error) => {
			toast({ title: 'Import Failed', description: error instanceof Error ? error.message : 'Import failed', variant: 'destructive' });
		},
	});

	const uploadTestCopiesMutation = useMutation({
		mutationFn: () => adminUploadTestCopies(token, testCopiesFiles),
		onSuccess: (result) => {
			setTestCopiesResult(result);
			void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
			toast({ title: 'Upload complete', description: `${result.uploaded} file(s) uploaded.` });
		},
		onError: (error) => {
			toast({ title: 'Upload Failed', description: error instanceof Error ? error.message : 'Upload failed', variant: 'destructive' });
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

	const uniqueClasses = [...new Set(students.map((s) => s.class_name).filter(Boolean))].sort();
	const uniqueSchools = [...new Set(students.map((s) => s.school_name).filter(Boolean))].sort();

	const filteredStudents = students.filter((student) => {
		const q = search.toLowerCase();
		const matchesSearch =
			!q ||
			student.full_name.toLowerCase().includes(q) ||
			student.father_name.toLowerCase().includes(q) ||
			student.mother_name.toLowerCase().includes(q) ||
			student.roll_number.toLowerCase().includes(q) ||
			student.school_name.toLowerCase().includes(q) ||
			student.phone.toLowerCase().includes(q) ||
			student.class_name.toLowerCase().includes(q);
		const matchesClass = !filterClass || student.class_name === filterClass;
		const matchesSchool = !filterSchool || student.school_name === filterSchool;
		const matchesStatus = !filterStatus || student.result_status === filterStatus;
		return matchesSearch && matchesClass && matchesSchool && matchesStatus;
	});

	const hasActiveFilters = filterClass !== '' || filterSchool !== '' || filterStatus !== '';

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

	const marksImportTargets = ['roll_number', 'marks_obtained', 'total_marks', 'rank', 'remarks'];

	const publishedCount = students.filter((student) => student.result_status === 'published').length;

	const quickResults = quickQuery.trim().length >= 1
		? students.filter((s) => {
				const q = quickQuery.toLowerCase();
				return (
					s.full_name.toLowerCase().includes(q) ||
					s.roll_number.toLowerCase().includes(q) ||
					s.school_name.toLowerCase().includes(q) ||
					s.phone.includes(q) ||
					s.father_name.toLowerCase().includes(q)
				);
			}).slice(0, 10)
		: [];

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
			{/* ── Quick Find Student ── */}
			<div ref={quickSearchRef} className="relative">
				<div className="flex items-center gap-3 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm">
					<Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
					<input
						className="flex-1 bg-transparent outline-none text-base text-gray-900 dark:text-white placeholder:text-gray-400"
						placeholder="Quick find — type name, roll number, phone or father's name..."
						value={quickQuery}
						onChange={(e) => { setQuickQuery(e.target.value); setShowDropdown(true); }}
						onFocus={() => setShowDropdown(true)}
					/>
					{quickQuery && (
						<button onClick={() => { setQuickQuery(''); setShowDropdown(false); }} className="text-gray-400 hover:text-gray-600">
							<X className="w-4 h-4" />
						</button>
					)}
					{quickQuery && (
						<span className="text-xs text-gray-400 whitespace-nowrap">{quickResults.length} match{quickResults.length !== 1 ? 'es' : ''}</span>
					)}
				</div>

				{showDropdown && quickResults.length > 0 && (
					<div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
						{quickResults.map((student) => (
							<button
								key={student.id}
								className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors text-left border-b dark:border-gray-800 last:border-0"
								onClick={() => { openStudent(student); setShowDropdown(false); setQuickQuery(''); }}
							>
								{student.student_image_url ? (
									<Image src={student.student_image_url} alt={student.full_name} width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
								) : (
									<div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-sm font-bold text-gray-500">
										{student.full_name.charAt(0)}
									</div>
								)}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{student.full_name}</span>
										<span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${student.result_status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
											{student.result_status === 'published' ? 'Published' : 'Pending'}
										</span>
									</div>
									<div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
										<span className="font-mono">{student.roll_number || '—'}</span>
										{student.school_name && <><span>·</span><span className="truncate">{student.school_name}</span></>}
										{student.class_name && <><span>·</span><span>{student.class_name}</span></>}
										{student.marks_obtained != null && <><span>·</span><span className="text-blue-500 font-medium">{student.marks_obtained}/{student.total_marks}</span></>}
									</div>
								</div>
								<span className="text-xs text-blue-500 flex-shrink-0">Edit →</span>
							</button>
						))}
					</div>
				)}

				{showDropdown && quickQuery.trim().length >= 1 && quickResults.length === 0 && (
					<div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-xl px-4 py-6 text-center text-sm text-gray-400">
						No students found for &ldquo;{quickQuery}&rdquo;
					</div>
				)}
			</div>

			<div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800">
				<div className="p-4 border-b dark:border-gray-800 space-y-3">
				<div className="flex items-center justify-between gap-3">
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Filter table by name, roll number or school..."
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
						{/* ── Import Marks ── */}
						<input
							ref={marksImportFileRef}
							type="file"
							accept=".csv,.xlsx,.xlsm"
							className="hidden"
							onChange={(event) => {
								const file = event.target.files?.[0] ?? null;
								setMarksImportFile(file);
								setMarksImportScan(null);
								setMarksImportResult(null);
								if (file) {
									setIsMarksImportOpen(true);
									void scanMarksMutation.mutate(file);
								}
							}}
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={() => marksImportFileRef.current?.click()}
							disabled={!can('api.change_examregistration') || scanMarksMutation.isPending || importMarksMutation.isPending}
						>
							<BarChart2 className="w-4 h-4 mr-2" /> Import Marks
						</Button>
						{/* ── Upload Test Copies ── */}
						<input
							ref={testCopiesFolderRef}
							type="file"
							multiple
							accept=".pdf"
							className="hidden"
							onChange={(event) => {
								const all = Array.from(event.target.files ?? []).filter((f) =>
									f.name.toLowerCase().endsWith('.pdf'),
								);
								setTestCopiesFiles(all);
								setTestCopiesResult(null);
							}}
						/>
						<Button
							variant="outline"
							size="sm"
							disabled={!can('api.change_examregistration')}
							onClick={() => {
								const input = testCopiesFolderRef.current;
								if (!input) return;
								input.setAttribute('webkitdirectory', '');
								input.value = '';
								setTestCopiesFiles([]);
								setTestCopiesResult(null);
								setIsTestCopiesOpen(true);
								input.click();
							}}
						>
							<FolderOpen className="w-4 h-4 mr-2" /> Upload Test Copies
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
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={filterClass}
						onChange={(e) => setFilterClass(e.target.value)}
						className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
					>
						<option value="">All Classes</option>
						{uniqueClasses.map((c) => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
					<select
						value={filterSchool}
						onChange={(e) => setFilterSchool(e.target.value)}
						className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
					>
						<option value="">All Schools</option>
						{uniqueSchools.map((s) => (
							<option key={s} value={s}>{s}</option>
						))}
					</select>
					<select
						value={filterStatus}
						onChange={(e) => setFilterStatus(e.target.value)}
						className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
					>
						<option value="">All Statuses</option>
						<option value="pending">Pending</option>
						<option value="published">Published</option>
					</select>
					{hasActiveFilters && (
						<button
							onClick={() => { setFilterClass(''); setFilterSchool(''); setFilterStatus(''); }}
							className="text-xs text-blue-500 hover:underline"
						>
							Clear filters
						</button>
					)}
					{hasActiveFilters && (
						<span className="text-xs text-gray-400">{filteredStudents.length} of {students.length} shown</span>
					)}
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

			{/* ── Import Marks Dialog ── */}
			<Dialog open={isMarksImportOpen} onOpenChange={setIsMarksImportOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Import Marks from Excel/CSV</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Match your spreadsheet columns to the mark fields below. Results will <strong>not</strong> be published automatically.
					</p>
					<div className="space-y-4">
						<p className="text-sm text-gray-600 dark:text-gray-300">
							{marksImportFile ? `Selected: ${marksImportFile.name}` : 'Choose a file to start mapping.'}
						</p>
						{scanMarksMutation.isPending ? (
							<div className="text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Scanning file...</div>
						) : null}
						{marksImportScan ? (
							<>
								<div className="rounded-lg border p-3 text-sm">
									Detected <strong>{marksImportScan.row_count}</strong> row(s) and <strong>{marksImportScan.headers.length}</strong> column(s).
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{marksImportTargets.map((field) => (
										<div key={field} className="space-y-1">
											<label className="text-sm font-medium">
												{field}{field === 'roll_number' ? <span className="text-red-500 ml-1">*</span> : null}
											</label>
											<select
												value={Object.entries(marksImportMapping).find(([, t]) => t === field)?.[0] ?? ''}
												onChange={(event) => {
													const selectedHeader = event.target.value;
													setMarksImportMapping((prev) => {
														const next = { ...prev };
														Object.keys(next).forEach((key) => { if (next[key] === field) delete next[key]; });
														if (selectedHeader) next[selectedHeader] = field;
														return next;
													});
												}}
												className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
											>
												<option value="">-- Not mapped --</option>
												{marksImportScan.headers.map((header, idx) => (
													<option key={`${field}-${idx}`} value={header}>{header}</option>
												))}
											</select>
										</div>
									))}
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										onClick={() => marksImportFile && scanMarksMutation.mutate(marksImportFile)}
										disabled={!marksImportFile || scanMarksMutation.isPending || importMarksMutation.isPending}
									>
										Rescan
									</Button>
									<Button
										onClick={() => importMarksMutation.mutate()}
										disabled={!marksImportFile || importMarksMutation.isPending || scanMarksMutation.isPending}
									>
										{importMarksMutation.isPending
											? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
											: 'Import Marks'}
									</Button>
								</div>
							</>
						) : null}
						{marksImportResult ? (
							<div className="rounded-lg border p-3 text-sm space-y-1">
								<div>Updated: <strong className="text-green-600">{marksImportResult.updated}</strong></div>
								<div>Skipped (no change): <strong>{marksImportResult.skipped}</strong></div>
								<div>Not found: <strong className="text-yellow-600">{marksImportResult.not_found}</strong></div>
								<div>Errors: <strong className="text-red-600">{marksImportResult.error_count}</strong></div>
								{marksImportResult.errors.length > 0 ? (
									<div className="mt-2 max-h-40 overflow-auto border rounded p-2 text-xs space-y-0.5">
										{marksImportResult.errors.map((err, idx) => (
											<div key={idx}>
												Row {err.row} {err.roll_number ? `(${err.roll_number})` : ''}: {err.error}
											</div>
										))}
									</div>
								) : null}
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Upload Test Copies Dialog ── */}
			<Dialog open={isTestCopiesOpen} onOpenChange={(open) => { if (!open) setIsTestCopiesOpen(false); }}>
				<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Upload Test Copies (PDF folder)</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Select a folder containing PDF files named by student roll number (e.g. <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">HBPL2026001.pdf</code>).
							Each file will be matched to the student with that roll number.
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => {
									const input = testCopiesFolderRef.current;
									if (!input) return;
									input.setAttribute('webkitdirectory', '');
									input.value = '';
									input.click();
								}}
							>
								<FolderOpen className="w-4 h-4 mr-2" />
								{testCopiesFiles.length > 0 ? 'Change Folder' : 'Select Folder'}
							</Button>
							{testCopiesFiles.length > 0 && (
								<Button variant="ghost" size="sm" onClick={() => { setTestCopiesFiles([]); setTestCopiesResult(null); }}>
									<X className="w-4 h-4 mr-1" /> Clear
								</Button>
							)}
						</div>

						{testCopiesFiles.length > 0 && !testCopiesResult ? (
							<>
								<div className="rounded-lg border p-3 text-sm">
									<strong>{testCopiesFiles.length}</strong> PDF file(s) selected.
								</div>
								<div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-xs">
									{testCopiesFiles.map((f) => (
										<div key={f.name} className="px-3 py-1.5 flex justify-between">
											<span className="font-mono">{f.name}</span>
											<span className="text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
										</div>
									))}
								</div>
								<Button
									className="w-full"
									disabled={uploadTestCopiesMutation.isPending}
									onClick={() => uploadTestCopiesMutation.mutate()}
								>
									{uploadTestCopiesMutation.isPending
										? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading {testCopiesFiles.length} file(s)…</>
										: `Upload ${testCopiesFiles.length} PDF(s)`}
								</Button>
							</>
						) : null}

						{testCopiesResult ? (
							<div className="rounded-lg border p-4 space-y-2 text-sm">
								<div className="flex items-center gap-2 text-green-600 font-medium">
									<CheckCircle className="w-4 h-4" />
									{testCopiesResult.uploaded} file(s) uploaded successfully
								</div>
								{testCopiesResult.not_found.length > 0 && (
									<div>
										<p className="text-yellow-700 dark:text-yellow-400 font-medium">
											{testCopiesResult.not_found.length} roll number(s) not found:
										</p>
										<div className="mt-1 max-h-32 overflow-y-auto border rounded p-2 text-xs font-mono space-y-0.5">
											{testCopiesResult.not_found.map((r) => <div key={r}>{r}</div>)}
										</div>
									</div>
								)}
								{testCopiesResult.errors.length > 0 && (
									<div>
										<p className="text-red-600 font-medium">{testCopiesResult.errors.length} error(s):</p>
										<div className="mt-1 max-h-32 overflow-y-auto border rounded p-2 text-xs space-y-0.5">
											{testCopiesResult.errors.map((e, i) => (
												<div key={i}>{e.file}: {e.error}</div>
											))}
										</div>
									</div>
								)}
								<Button variant="outline" size="sm" onClick={() => { setTestCopiesFiles([]); setTestCopiesResult(null); }}>
									Upload More
								</Button>
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
									<div className="flex items-center gap-3">
										<a href={selected.test_copy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View ↗</a>
										<button
											onClick={() => mutation.mutate(buildFormData({ clear_test_copy: 'true' }))}
											disabled={mutation.isPending || !can('api.change_examregistration')}
											className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5 disabled:opacity-40"
										>
											<Trash2 className="w-3 h-3" /> Delete
										</button>
									</div>
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
								<Button size="sm" variant="outline" className="w-full" onClick={() => { if (testCopyRef.current) { testCopyRef.current.value = ''; testCopyRef.current.click(); } }} disabled={mutation.isPending || !can('api.change_examregistration')}>
									<Upload className="w-3 h-3 mr-1" />
									{selected.test_copy_url ? 'Replace' : 'Upload'}
								</Button>
							</div>
							<div className="border-2 border-dashed rounded-xl p-3 space-y-2">
								<p className="text-sm font-medium">Result File</p>
								{selected.result_file_url ? (
									<div className="flex items-center gap-3">
										<a href={selected.result_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View ↗</a>
										<button
											onClick={() => mutation.mutate(buildFormData({ clear_result_file: 'true' }))}
											disabled={mutation.isPending || !can('api.change_examregistration')}
											className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5 disabled:opacity-40"
										>
											<Trash2 className="w-3 h-3" /> Delete
										</button>
									</div>
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
								<Button size="sm" variant="outline" className="w-full" onClick={() => { if (resultFileRef.current) { resultFileRef.current.value = ''; resultFileRef.current.click(); } }} disabled={mutation.isPending || !can('api.change_examregistration')}>
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
