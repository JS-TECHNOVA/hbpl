'use client';

import { useState, type ChangeEvent } from 'react';
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
	adminCreateMatch,
	adminDeleteMatch,
	adminFetchMatches,
	adminUpdateMatch,
	type AdminMatch,
} from '@/lib/api';
import { useAdmin } from '../_components/admin-shell';
import { ConfirmDelete, LoadingBlock, SectionHeader } from '../_components/admin-ui';

const emptyForm = {
	stage: '',
	match_type: 'league',
	date: '',
	time: '',
	venue: '',
	team1: '',
	team2: '',
	team1_score: '',
	team2_score: '',
	result: '',
	player_of_match: '',
	season: '2025',
};

export default function AdminMatchesPage() {
	const { token } = useAdmin();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<AdminMatch | 'new' | null>(null);
	const [deleting, setDeleting] = useState<AdminMatch | null>(null);
	const [form, setForm] = useState(emptyForm);

	const { data: matches = [], isLoading } = useQuery({
		queryKey: ['admin-matches', token],
		queryFn: () => adminFetchMatches(token),
	});

	const openNew = () => {
		setForm(emptyForm);
		setEditing('new');
	};

	const openEdit = (match: AdminMatch) => {
		setForm({
			stage: match.stage,
			match_type: match.match_type,
			date: match.date,
			time: match.time,
			venue: match.venue,
			team1: match.team1,
			team2: match.team2,
			team1_score: match.team1_score,
			team2_score: match.team2_score,
			result: match.result,
			player_of_match: match.player_of_match,
			season: String(match.season),
		});
		setEditing(match);
	};

	const saveMutation = useMutation({
		mutationFn: () => {
			const payload = { ...form, season: parseInt(form.season, 10) };
			if (editing === 'new') {
				return adminCreateMatch(token, payload);
			}

			return adminUpdateMatch(token, editing!.id, payload);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-matches'] });
			void queryClient.invalidateQueries({ queryKey: ['matches'] });
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
		mutationFn: (id: number) => adminDeleteMatch(token, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['admin-matches'] });
			void queryClient.invalidateQueries({ queryKey: ['matches'] });
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

	const updateField =
		(key: keyof typeof emptyForm) =>
		(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setForm((current) => ({ ...current, [key]: event.target.value }));
		};

	return (
		<div className="space-y-4">
			<SectionHeader
				title="Matches"
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
				<div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Stage</TableHead>
								<TableHead>Teams</TableHead>
								<TableHead>Score</TableHead>
								<TableHead>Season</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{matches.map((match) => (
								<TableRow key={match.id}>
									<TableCell className="text-sm">{match.date}</TableCell>
									<TableCell className="text-sm">{match.stage}</TableCell>
									<TableCell className="text-sm font-medium">{match.team1} vs {match.team2}</TableCell>
									<TableCell className="text-sm">
										{match.team1_score && match.team2_score ? `${match.team1_score} - ${match.team2_score}` : <span className="text-gray-400">Upcoming</span>}
									</TableCell>
									<TableCell>{match.season}</TableCell>
									<TableCell className="text-right space-x-2">
										<Button size="sm" variant="ghost" onClick={() => openEdit(match)}>
											<Pencil className="w-4 h-4" />
										</Button>
										<Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleting(match)}>
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
							<DialogTitle>{editing === 'new' ? 'Add Match' : 'Edit Match'}</DialogTitle>
						</DialogHeader>
						<div className="grid grid-cols-2 gap-3">
							<div className="col-span-2">
								<label className="block text-sm font-medium mb-1">Stage</label>
								<Input value={form.stage} onChange={updateField('stage')} placeholder="e.g. Group A - Match 1" />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Type</label>
								<select value={form.match_type} onChange={updateField('match_type')} className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
									<option value="league">League</option>
									<option value="semi">Semi Final</option>
									<option value="final">Final</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Season</label>
								<select value={form.season} onChange={updateField('season')} className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
									<option value="2025">HBPL 2025</option>
									<option value="2026">HBPL 2026</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Date</label>
								<Input type="date" value={form.date} onChange={updateField('date')} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Time</label>
								<Input type="time" value={form.time} onChange={updateField('time')} />
							</div>
							<div className="col-span-2">
								<label className="block text-sm font-medium mb-1">Venue</label>
								<Input value={form.venue} onChange={updateField('venue')} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Team 1</label>
								<Input value={form.team1} onChange={updateField('team1')} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Team 2</label>
								<Input value={form.team2} onChange={updateField('team2')} />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Team 1 Score</label>
								<Input value={form.team1_score} onChange={updateField('team1_score')} placeholder="e.g. 185/4" />
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Team 2 Score</label>
								<Input value={form.team2_score} onChange={updateField('team2_score')} placeholder="e.g. 142/8" />
							</div>
							<div className="col-span-2">
								<label className="block text-sm font-medium mb-1">Result</label>
								<Input value={form.result} onChange={updateField('result')} placeholder="e.g. Team 1 won by 43 runs" />
							</div>
							<div className="col-span-2">
								<label className="block text-sm font-medium mb-1">Player of the Match</label>
								<Input value={form.player_of_match} onChange={updateField('player_of_match')} />
							</div>
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
					</DialogContent>
				</Dialog>
			) : null}
			{deleting ? (
				<ConfirmDelete
					label={`${deleting.team1} vs ${deleting.team2}`}
					onConfirm={() => deleteMutation.mutate(deleting.id)}
					onCancel={() => setDeleting(null)}
				/>
			) : null}
		</div>
	);
}
