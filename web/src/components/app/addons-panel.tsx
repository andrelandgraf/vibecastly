'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Shapes, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createAddon, deleteAddon, type AddonKind, type AddonRecord } from '@/lib/agent-client';

const KINDS: { value: AddonKind; label: string; hint: string }[] = [
  { value: 'item', label: 'Item', hint: 'Something to put in the picture, like a party hat.' },
  { value: 'background', label: 'Background', hint: 'A scene to set the picture in, like a stage.' },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function AddonsPanel({
  addons,
  onChanged,
}: {
  addons: AddonRecord[];
  onChanged: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AddonKind>('item');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const validName = /^[\w-]+$/.test(name.trim());

  function reset() {
    setName('');
    setKind('item');
    setFile(null);
    setPreview(null);
  }

  function onPick(selected: File | null) {
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleAdd() {
    if (!validName || !file) return;
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      await createAddon(name.trim(), kind, base64, file.type || 'image/jpeg');
      toast.success(`${name.trim()} added`);
      setOpen(false);
      reset();
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add addon');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(addon: AddonRecord) {
    try {
      await deleteAddon(addon.id);
      toast.success(`${addon.name} removed`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove addon');
    }
  }

  return (
    <section className="flex flex-col border-t" data-testid="addons-panel">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Shapes className="size-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Addons</h2>
          <span className="text-muted-foreground text-xs">{addons.length}</span>
        </div>
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      <div className="max-h-[30vh] space-y-1 overflow-y-auto px-2 pb-3 lg:max-h-none">
        {addons.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-xs">
            Add items and backgrounds, then tag them with{' '}
            <span className="text-foreground">@</span> next to people.
          </p>
        ) : (
          addons.map((addon) => (
            <div
              key={addon.id}
              data-testid="addon-row"
              className="group hover:bg-muted/60 flex items-center gap-3 rounded-lg px-2 py-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={addon.imageUrl}
                alt={addon.name}
                className="size-9 rounded-md border object-cover"
              />
              <span className="flex-1 truncate text-sm">{addon.name}</span>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {addon.kind}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${addon.name}`}
                onClick={() => handleDelete(addon)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an addon</DialogTitle>
            <DialogDescription>
              Upload an image of an item or a background and name it. Tag it with @ in prompts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kind">
              {KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={kind === option.value}
                  onClick={() => setKind(option.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    kind === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-muted-foreground text-xs">{option.hint}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-muted hover:bg-muted/70 relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
                aria-label="Choose image"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="text-muted-foreground size-6" />
                )}
              </button>
              <div className="text-muted-foreground text-xs">{file ? file.name : 'PNG or JPG.'}</div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="addon-file"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addon-name">Name</Label>
              <Input
                id="addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PartyHat"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && validName && file && !busy) {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
              />
              <p className="text-muted-foreground text-xs">One word: letters, digits, - and _.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={busy || !validName || !file}>
              {busy && <Loader2 className="size-4 animate-spin" />} Add addon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
