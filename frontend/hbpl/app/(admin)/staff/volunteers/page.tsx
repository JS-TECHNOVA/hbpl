'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
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
	adminCreateVolunteer,
	adminDeleteVolunteer,
	adminFetchVolunteers,
	adminUpdateVolunteer,
	type AdminVolunteer,
} from '@/lib/api';
import Image from 'next/image';
import { useAdmin } from '../_components/admin-shell';
import { ConfirmDelete, ImageUploadField, LoadingBlock, SectionHeader } from '../_components/admin-ui';

export default function AdminVolunteersPage() {
	const { token } = useAdmin();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<AdminVolunteer | 'new' | null>(null);
	const [deleting, setDeleting] = useState<AdminVolunteer | null>(null);
	const [form, setForm] = useState({ name: '', role: '', img: '', order: '0' });
	const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

	const { data: volunteers = [], isLoading } = useQuery({
		queryKey: ['admin-volunteers', token],
		queryFn: () => adminFetchVolunteers(token),
	});

	const openNew = () => {
		setForm({ name: '', role: '', img: '', order: '0' });
		setPendingFiles({});
		setEditing('new');
	};

	const openEdit = (volunteer: AdminVolunteer) => {
		setForm({
			name: volunteer.name,
			role: volunteer.role,
			img: volunteer.img,
			order: String(volunteer.order),
		});
		setPendingFiles({});
		setEditing(volunteer);
	};

	const saveMutation = useMutation({
		mutationFn: () => {
			const formData = new FormData();
			formData.append('name', form.name);
			formData.append('role', form.role);
			formData.append('img', form.img);
			formData.append('order', form.order);
			if (pendingFiles.image) {
				formData.append('image', pendingFiles.image);
			}

			if (editing === 'new') {
				return adminCreateVolunteer(token, formData);
			}

			return adminUpdateVolunteer(token, editing!.id, formData);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-volunteers'] });
			void queryClient.invalidateQueries({ queryKey: ['volunteers'] });
			setEditing(null);
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

	const deleteMutation = useMutation({
		mutationFn: (id: number) => adminDeleteVolunteer(token, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-volunteers'] });
			void queryClient.invalidateQueries({ queryKey: ['volunteers'] });
			setDeleting(null);
			toast({ title: 'Deleted' });
		},
		onError: (error) => {
			toast({
				title: 'Error',
				description: error instanceof Error ? error.message : 'Delete failed',
				variant: 'destructive',
			});
		},
	});

	return (
		<div className="space-y-4">
			<SectionHeader
				title="Volunteers"
				action={
					<Button size="sm" onClick={openNew}>
						<Plus className="w-4 h-4 mr-1" />
						Add
					</Button>
				}
			/>
			{isLoading ? (
				<LoadingBlock />
			) : (
				<div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Photo</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Order</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{volunteers.map((volunteer) => (
								<TableRow key={volunteer.id}>
									<TableCell>
										{volunteer.image_url ? (
											<Image src={volunteer.image_url} alt={volunteer.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
										) : (
											<div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">No img</div>
										)}
									</TableCell>
									<TableCell className="font-medium">{volunteer.name}</TableCell>
									<TableCell className="text-gray-500">{volunteer.role}</TableCell>
									<TableCell>{volunteer.order}</TableCell>
									<TableCell className="text-right space-x-2">
										<Button size="sm" variant="ghost" onClick={() => openEdit(volunteer)}>
											<Pencil className="w-4 h-4" />
										</Button>
										<Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleting(volunteer)}>
											<Trash2 className="w-4 h-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
			{editing ? (
				<Dialog open onOpenChange={() => setEditing(null)}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>{editing === 'new' ? 'Add Volunteer' : 'Edit Volunteer'}</DialogTitle>
						</DialogHeader>
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium mb-1">Name</label>
								<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Role</label>
								<Input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Order</label>
								<Input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
							</div>
							<ImageUploadField
								label="Photo"
								currentUrl={editing === 'new' ? null : editing.image_url}
								fieldName="image"
								onFileSelect={(name, file) => setPendingFiles((current) => ({ ...current, [name]: file }))}
							/>
							{pendingFiles.image ? <p className="text-xs text-green-600">New image selected: {pendingFiles.image.name}</p> : null}
							<div className="flex gap-3 pt-2">
								<Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
									{saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
									Save
								</Button>
								<Button variant="outline" onClick={() => setEditing(null)} className="flex-1">
									Cancel
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			) : null}
			{deleting ? (
				<ConfirmDelete label={deleting.name} onConfirm={() => deleteMutation.mutate(deleting.id)} onCancel={() => setDeleting(null)} />
			) : null}
		</div>
	);
}
