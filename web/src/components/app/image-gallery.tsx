'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MoreVertical, Pencil, Trash2, Download, ImageIcon, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteImage, patchImage, type ImageRecord } from '@/lib/agent-client';

export function ImageGallery({
  images,
  loading,
  onChanged,
  onRegenerate,
}: {
  images: ImageRecord[];
  loading: boolean;
  onChanged: () => void | Promise<void>;
  onRegenerate: (prompt: string) => void;
}) {
  const [renaming, setRenaming] = useState<ImageRecord | null>(null);
  const [deleting, setDeleting] = useState<ImageRecord | null>(null);
  const [regenerating, setRegenerating] = useState<ImageRecord | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [regenDraft, setRegenDraft] = useState('');
  const [busy, setBusy] = useState(false);

  function handleRegenerate() {
    const text = regenDraft.trim();
    if (!regenerating || !text) return;
    onRegenerate(text);
    setRegenerating(null);
  }

  async function handleRename() {
    if (!renaming) return;
    setBusy(true);
    try {
      await patchImage(renaming.id, promptDraft);
      toast.success('Caption updated');
      setRenaming(null);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteImage(deleting.id);
      toast.success('Image deleted');
      setDeleting(null);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <ImageIcon className="text-muted-foreground size-10" />
        <div>
          <p className="font-medium">Your gallery is empty</p>
          <p className="text-muted-foreground text-sm">
            Describe an image above to generate your first one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {images.map((img) => (
          <div
            key={img.id}
            data-testid="image-card"
            className="group bg-card overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.prompt}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-7 shadow-sm"
                        aria-label="Image actions"
                      />
                    }
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRegenerating(img);
                        setRegenDraft(img.prompt);
                      }}
                    >
                      <RotateCw className="size-4" /> Regenerate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setRenaming(img);
                        setPromptDraft(img.prompt);
                      }}
                    >
                      <Pencil className="size-4" /> Edit caption
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<a href={img.url} download={`${img.id}.jpg`} />}>
                      <Download className="size-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(img)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm" title={img.prompt}>
                {img.prompt}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {img.createdByName ? `${img.createdByName} · ` : ''}
                {new Date(img.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={regenerating !== null} onOpenChange={(o) => !o && setRegenerating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refine &amp; regenerate</DialogTitle>
            <DialogDescription>
              Edit the prompt below — add detail or change it — then regenerate a new image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="regen-prompt">Prompt</Label>
            <Textarea
              id="regen-prompt"
              value={regenDraft}
              onChange={(e) => setRegenDraft(e.target.value)}
              rows={4}
              className="max-h-60"
              autoFocus
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleRegenerate();
                }
              }}
            />
            <p className="text-muted-foreground text-xs">
              Keep <span className="text-foreground">@names</span> to reuse those people as
              references.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegenerating(null)}>
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={!regenDraft.trim()}>
              <RotateCw className="size-4" /> Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit caption</DialogTitle>
            <DialogDescription>Update the caption stored for this image.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Input
              id="caption"
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={busy || !promptDraft.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete image?</DialogTitle>
            <DialogDescription>This permanently removes the image from your gallery.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
