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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
	adminCreateManagement,
	adminDeleteManagement,
	adminFetchManagement,
	adminUpdateManagement,
	type AdminManagementMember,
} from '@/lib/api';
import Image from 'next/image';
import { useAdmin } from '../_components/admin-shell';
import { ConfirmDelete, ImageUploadField, LoadingBlock, SectionHeader } from '../_components/admin-ui';

export default function AdminManagementPage() {
	const { token } = useAdmin();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<AdminManagementMember | 'new' | null>(null);
	const [deleting, setDeleting] = useState<AdminManagementMember | null>(null);
	const [form, setForm] = useState({ name: '', role: '', description: '', email: '', order: '0' });
	const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

	const { data: members = [], isLoading } = useQuery({
		queryKey: ['admin-management', token],
		queryFn: () => adminFetchManagement(token),
	});

	const openNew = () => {
		setForm({ name: '', role: '', description: '', email: '', order: '0' });
		setPendingFiles({});
		setEditing('new');
	};

	const openEdit = (member: AdminManagementMember) => {
		setForm({
			name: member.name,
			role: member.role,
			description: member.description,
			email: member.email,
			order: String(member.order),
		});
		setPendingFiles({});
		setEditing(member);
	};

	const saveMutation = useMutation({
		mutationFn: () => {
			const formData = new FormData();
			formData.append('name', form.name);
			formData.append('role', form.role);
			formData.append('description', form.description);
			formData.append('email', form.email);
			formData.append('order', form.order);
			if (pendingFiles.image) {
				formData.append('image', pendingFiles.image);
			}

			if (editing === 'new') {
				return adminCreateManagement(token, formData);
			}

			return adminUpdateManagement(token, editing!.id, formData);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-management'] });
			void queryClient.invalidateQueries({ queryKey: ['management'] });
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
		mutationFn: (id: number) => adminDeleteManagement(token, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-management'] });
			void queryClient.invalidateQueries({ queryKey: ['management'] });
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
				title="Management"
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
							{members.map((member) => (
								<TableRow key={member.id}>
									<TableCell>
										{member.image_url ? (
											<Image src={member.image_url} alt={member.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
										) : (
											<div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">No img</div>
										)}
									</TableCell>
									<TableCell className="font-medium">{member.name}</TableCell>
									<TableCell className="text-gray-500 text-sm">{member.role}</TableCell>
									<TableCell>{member.order}</TableCell>
									<TableCell className="text-right space-x-2">
										<Button size="sm" variant="ghost" onClick={() => openEdit(member)}>
											<Pencil className="w-4 h-4" />
										</Button>
										<Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleting(member)}>
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
					<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>{editing === 'new' ? 'Add Member' : 'Edit Member'}</DialogTitle>
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
								<label className="block text-sm font-medium mb-1">Email</label>
								<Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Description</label>
								<Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Order</label>
								<Input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
							</div>
							<ImageUploadField
								label="Profile Photo"
								currentUrl={editing === 'new' ? null : editing.image_url}
								fieldName="image"
								onFileSelect={(name, file) => setPendingFiles((current) => ({ ...current, [name]: file }))}
							/>
							{pendingFiles.image ? <p className="text-xs text-green-600">Selected: {pendingFiles.image.name}</p> : null}
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
