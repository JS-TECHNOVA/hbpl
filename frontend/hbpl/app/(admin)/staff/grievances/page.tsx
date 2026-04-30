'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  adminFetchComplaints,
  adminUpdateComplaint,
  type AdminComplaint,
} from '@/lib/api';
import { useAdmin } from '../_components/admin-shell';
import { LoadingBlock, SectionHeader } from '../_components/admin-ui';

const STATUS_LABELS: Record<AdminComplaint['status'], string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  resolved: 'Resolved',
};

const STATUS_COLORS: Record<AdminComplaint['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function AdminGrievancesPage() {
  const { token } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<AdminComplaint | null>(null);
  const [editStatus, setEditStatus] = useState<AdminComplaint['status']>('pending');
  const [editNote, setEditNote] = useState('');

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['admin-complaints', token],
    queryFn: () => adminFetchComplaints(token),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; status: string; admin_note: string }) =>
      adminUpdateComplaint(token, vars.id, { status: vars.status, admin_note: vars.admin_note }),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminComplaint[]>(['admin-complaints', token], (prev) =>
        prev?.map((c) => (c.id === updated.id ? updated : c)) ?? [],
      );
      toast({ title: 'Complaint updated' });
      setSelected(null);
    },
    onError: (err) => {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const openComplaint = (complaint: AdminComplaint) => {
    setSelected(complaint);
    setEditStatus(complaint.status);
    setEditNote(complaint.admin_note ?? '');
  };

  const pendingCount = complaints.filter((c) => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Grievances"
        action={
          pendingCount > 0 ? (
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
              {pendingCount} pending
            </span>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : complaints.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No grievances submitted yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">School</TableHead>
                <TableHead className="hidden sm:table-cell">Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-mono text-xs">{complaint.roll_number}</TableCell>
                  <TableCell className="font-medium">{complaint.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {complaint.school_name || '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                    {complaint.class_name || '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[complaint.status]}`}>
                      {STATUS_LABELS[complaint.status]}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                    {new Date(complaint.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openComplaint(complaint)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail / update dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grievance — {selected?.roll_number}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 pt-1">
              {/* Student info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{selected.name}</span>
                <span className="text-gray-500">School</span>
                <span>{selected.school_name || '—'}</span>
                <span className="text-gray-500">Class</span>
                <span>{selected.class_name || '—'}</span>
                <span className="text-gray-500">Submitted</span>
                <span>
                  {new Date(selected.created_at).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Message */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grievance Message</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>

              {/* Screenshot */}
              {selected.screenshot_url && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachment</p>
                  <a
                    href={selected.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" /> View Attachment
                  </a>
                </div>
              )}

              {/* Status selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AdminComplaint['status'])}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Admin note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note to Student <span className="text-gray-400 text-xs">(student can read this)</span>
                </label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Add a note explaining the decision or requesting more info…"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  className="flex-1"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ id: selected.id, status: editStatus, admin_note: editNote })
                  }
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
