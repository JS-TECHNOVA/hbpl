'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
	adminCreateGallery,
	adminDeleteGallery,
	adminFetchGallery,
	adminUpdateGallery,
	type AdminGalleryImage,
} from '@/lib/api';
import Image from 'next/image';
import { useAdmin } from '../_components/admin-shell';
import { ConfirmDelete, ImageUploadField, LoadingBlock, SectionHeader } from '../_components/admin-ui';

export default function AdminGalleryPage() {
	const { token, can } = useAdmin();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<AdminGalleryImage | 'new' | null>(null);
	const [deleting, setDeleting] = useState<AdminGalleryImage | null>(null);
	const [form, setForm] = useState({ title: '', category: 'Action' });
	const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

	const { data: images = [], isLoading } = useQuery({
		queryKey: ['admin-gallery', token],
		queryFn: () => adminFetchGallery(token),
	});

	const openNew = () => {
		setForm({ title: '', category: 'Action' });
		setPendingFiles({});
		setEditing('new');
	};

	const openEdit = (image: AdminGalleryImage) => {
		setForm({ title: image.title, category: image.category });
		setPendingFiles({});
		setEditing(image);
	};

	const saveMutation = useMutation({
		mutationFn: () => {
			const formData = new FormData();
			formData.append('title', form.title);
			formData.append('category', form.category);
			if (pendingFiles.image) {
				formData.append('image', pendingFiles.image);
			}

			if (editing === 'new') {
				return adminCreateGallery(token, formData);
			}

			return adminUpdateGallery(token, editing!.id, formData);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
			void queryClient.invalidateQueries({ queryKey: ['gallery'] });
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
		mutationFn: (id: number) => adminDeleteGallery(token, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
			void queryClient.invalidateQueries({ queryKey: ['gallery'] });
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
				title="Gallery"
				action={
					<Button size="sm" onClick={openNew} disabled={!can('api.add_galleryimage')}>
						<Plus className="w-4 h-4 mr-1" />
						Add
					</Button>
				}
			/>
			{isLoading ? (
				<LoadingBlock />
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
					{images.map((image) => (
						<div key={image.id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden group">
							<div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
								{image.image_url ? (
									<Image src={image.image_url} alt={image.title} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
								) : (
									<div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
								)}
							</div>
							<div className="p-2">
								<p className="text-xs font-medium truncate">{image.title}</p>
								<Badge variant="secondary" className="text-xs mt-1">
									{image.category}
								</Badge>
								<div className="flex gap-1 mt-2">
									<Button size="sm" variant="ghost" className="h-6 px-2 text-xs flex-1" onClick={() => openEdit(image)} disabled={!can('api.change_galleryimage')}>
										<Pencil className="w-3 h-3 mr-1" />
										Edit
									</Button>
									<Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500" onClick={() => setDeleting(image)} disabled={!can('api.delete_galleryimage')}>
										<Trash2 className="w-3 h-3" />
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
			{editing ? (
				<Dialog open onOpenChange={() => setEditing(null)}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>{editing === 'new' ? 'Add Gallery Image' : 'Edit Gallery Image'}</DialogTitle>
						</DialogHeader>
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium mb-1">Title</label>
								<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Category</label>
								<select
									value={form.category}
									onChange={(event) => setForm({ ...form, category: event.target.value })}
									className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
								>
									<option>Action</option>
									<option>Ceremony</option>
									<option>Team</option>
								</select>
							</div>
							<ImageUploadField
								label="Image"
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
				<ConfirmDelete label={deleting.title} onConfirm={() => deleteMutation.mutate(deleting.id)} onCancel={() => setDeleting(null)} />
			) : null}
		</div>
	);
}
