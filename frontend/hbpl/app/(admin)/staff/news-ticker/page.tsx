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
  adminCreateTickerItem,
  adminDeleteTickerItem,
  adminFetchTickerItems,
  adminUpdateTickerItem,
  type TickerItem,
} from '@/lib/api';
import { useAdmin } from '../_components/admin-shell';
import { ConfirmDelete, LoadingBlock, SectionHeader } from '../_components/admin-ui';

const emptyForm = {
  text: '',
  link: '',
  is_active: true,
  order: 0,
};

export default function AdminNewsTickerPage() {
  const { token } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TickerItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<TickerItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-ticker', token],
    queryFn: () => adminFetchTickerItems(token),
  });

  const openNew = () => {
    setForm({ ...emptyForm, order: items.length });
    setEditing('new');
  };

  const openEdit = (item: TickerItem) => {
    setForm({
      text: item.text,
      link: item.link,
      is_active: item.is_active,
      order: item.order,
    });
    setEditing(item);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        order: Number(form.order),
      };
      if (editing === 'new') return adminCreateTickerItem(token, payload);
      return adminUpdateTickerItem(token, (editing as TickerItem).id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-ticker'] });
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
    mutationFn: (id: number) => adminDeleteTickerItem(token, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-ticker'] });
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

  const updateText =
    (key: 'text' | 'link') =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="News Ticker"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        }
      />

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Items marked as active will scroll in the ticker bar displayed across all public pages.
        Lower order number = appears first.
      </p>

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Order</TableHead>
                <TableHead>Text</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-20">Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-400 py-8">
                    No ticker items yet. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : null}
              {sortedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm text-gray-500">{item.order}</TableCell>
                  <TableCell className="text-sm font-medium max-w-xs truncate">{item.text}</TableCell>
                  <TableCell className="text-sm text-blue-600 max-w-xs truncate">
                    {item.link || <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => setDeleting(item)}
                    >
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
              <DialogTitle>{editing === 'new' ? 'Add Ticker Item' : 'Edit Ticker Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  News Text <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.text}
                  onChange={updateText('text')}
                  placeholder="e.g. HBPL 2026 registration now open!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input
                  value={form.link}
                  onChange={updateText('link')}
                  placeholder="e.g. /team-registration or https://..."
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank if no link needed.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Order</label>
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                    min={0}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={form.is_active ? 'active' : 'hidden'}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'active' }))}
                    className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="active">Active (visible)</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.text.trim()}
                className="flex-1"
              >
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
          label={`"${deleting.text.slice(0, 40)}${deleting.text.length > 40 ? '…' : ''}"`}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
