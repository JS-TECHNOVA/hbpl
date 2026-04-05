'use client';

import { useRef, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {action}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  );
}

export function ImageUploadField({
  label,
  currentUrl,
  fieldName,
  onFileSelect,
}: {
  label: string;
  currentUrl?: string | null;
  fieldName: string;
  onFileSelect: (name: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      {currentUrl ? (
        <Image src={currentUrl} alt="current" width={80} height={80} className="w-20 h-20 object-cover rounded-lg border mb-1" />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFileSelect(fieldName, file);
          }
        }}
      />
      <Button size="sm" variant="outline" type="button" onClick={() => inputRef.current?.click()}>
        <Upload className="w-3 h-3 mr-1" />
        {currentUrl ? 'Replace Image' : 'Upload Image'}
      </Button>
    </div>
  );
}

export function ConfirmDelete({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>
        <div className="flex gap-3 pt-2">
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            Delete
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}