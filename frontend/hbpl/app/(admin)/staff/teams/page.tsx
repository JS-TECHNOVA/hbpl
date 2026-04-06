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
	adminCreateTeam,
	adminDeleteTeam,
	adminFetchTeams,
	adminUpdateTeam,
	type AdminTeam,
} from '@/lib/api';
import { useAdmin } from '../_components/admin-shell';
import { ConfirmDelete, LoadingBlock, SectionHeader } from '../_components/admin-ui';

export default function AdminTeamsPage() {
	const { token, can } = useAdmin();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<AdminTeam | 'new' | null>(null);
	const [deleting, setDeleting] = useState<AdminTeam | null>(null);
	const [form, setForm] = useState({ name: '', captain: '', description: '' });

	const { data: teams = [], isLoading } = useQuery({
		queryKey: ['admin-teams', token],
		queryFn: () => adminFetchTeams(token),
	});

	const openNew = () => {
		setForm({ name: '', captain: '', description: '' });
		setEditing('new');
	};

	const openEdit = (team: AdminTeam) => {
		setForm({ name: team.name, captain: team.captain, description: team.description });
		setEditing(team);
	};

	const saveMutation = useMutation({
		mutationFn: () => {
			if (editing === 'new') {
				return adminCreateTeam(token, form);
			}

			return adminUpdateTeam(token, editing!.id, form);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
			void queryClient.invalidateQueries({ queryKey: ['teams'] });
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
		mutationFn: (id: number) => adminDeleteTeam(token, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
			void queryClient.invalidateQueries({ queryKey: ['teams'] });
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
				title="Teams"
				action={
					<Button size="sm" onClick={openNew} disabled={!can('api.add_team')}>
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
								<TableHead>Team Name</TableHead>
								<TableHead>Captain</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{teams.map((team) => (
								<TableRow key={team.id}>
									<TableCell className="font-medium">{team.name}</TableCell>
									<TableCell className="text-gray-500">{team.captain}</TableCell>
									<TableCell className="text-right space-x-2">
										<Button size="sm" variant="ghost" onClick={() => openEdit(team)} disabled={!can('api.change_team')}>
											<Pencil className="w-4 h-4" />
										</Button>
										<Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleting(team)} disabled={!can('api.delete_team')}>
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
							<DialogTitle>{editing === 'new' ? 'Add Team' : 'Edit Team'}</DialogTitle>
						</DialogHeader>
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium mb-1">Team Name</label>
								<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Captain</label>
								<Input value={form.captain} onChange={(event) => setForm({ ...form, captain: event.target.value })} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Description</label>
								<Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
							</div>
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
