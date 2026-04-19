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
	adminFetchTeamRegistrations,
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

	const { data: registrations = [], isLoading: registrationsLoading } = useQuery({
		queryKey: ['admin-team-registrations', token],
		queryFn: () => adminFetchTeamRegistrations(token),
		enabled: can('api.view_teamregistration') || userHasImplicitAccess(can),
	});


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


	return (
		<div className="space-y-4">			
			{can('api.view_teamregistration') || userHasImplicitAccess(can) ? (
				<div className="space-y-3">
					<SectionHeader title="Team Registrations" />
					{registrationsLoading ? (
						<LoadingBlock />
					) : (
						<div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Submitted</TableHead>
										<TableHead>Team</TableHead>
										<TableHead>Captain</TableHead>
										<TableHead>Village</TableHead>
										<TableHead>Phone</TableHead>
										<TableHead>Payment</TableHead>
										<TableHead>Files</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{registrations.length ? registrations.map((registration) => (
										<TableRow key={registration.id}>
											<TableCell className="text-gray-500 whitespace-nowrap">
												{new Date(registration.created_at).toLocaleString('en-IN')}
											</TableCell>
											<TableCell className="font-medium">
												<div>{registration.team_name}</div>
												<div className="text-xs text-gray-500">{registration.player_count} players</div>
											</TableCell>
											<TableCell>{registration.captain_name}</TableCell>
											<TableCell>{registration.address}</TableCell>
											<TableCell>
												<div>{registration.phone}</div>
												<div className="text-xs text-gray-500">{registration.whatsapp_number}</div>
											</TableCell>
											<TableCell>
												<div className="font-medium">{registration.payment_id || '-'}</div>
												<div className="text-xs text-gray-500">
													{registration.payment_currency} {(registration.payment_amount_paise / 100).toFixed(2)}
												</div>
											</TableCell>
											<TableCell className="space-x-3 whitespace-nowrap">
												{registration.team_list_url ? (
													<a href={registration.team_list_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
														Team List
													</a>
												) : null}
												{registration.receipt_download_url ? (
													<a href={registration.receipt_download_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
														Receipt
													</a>
												) : null}
											</TableCell>
										</TableRow>
									)) : (
										<TableRow>
											<TableCell colSpan={7} className="text-center text-gray-500 py-8">
												No team registrations yet.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}

function userHasImplicitAccess(can: (perm: string) => boolean) {
	return can('api.add_team') || can('api.change_team') || can('api.delete_team');
}
