'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, Loader2, Users, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createPerson, deletePerson, type PersonRecord } from '@/lib/agent-client';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function PeopleSidebar({
  people,
  onChanged,
}: {
  people: PersonRecord[];
  onChanged: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setFile(null);
    setPreview(null);
  }

  function onPick(selected: File | null) {
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleAdd() {
    if (!name.trim() || !file) return;
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      await createPerson(name.trim(), base64, file.type || 'image/jpeg');
      toast.success(`${name.trim()} added`);
      setOpen(false);
      reset();
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add person');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(person: PersonRecord) {
    try {
      await deletePerson(person.id);
      toast.success(`${person.name} removed`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove person');
    }
  }

  return (
    <aside className="flex w-full flex-col border-b lg:w-72 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">People</h2>
          <span className="text-muted-foreground text-xs">{people.length}</span>
        </div>
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setOpen(true)}>
          <UserPlus className="size-4" /> Add
        </Button>
      </div>

      <div className="max-h-[35vh] flex-1 space-y-1 overflow-y-auto px-2 pb-3 lg:max-h-none">
        {people.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-xs">
            Add people, then tag them with <span className="text-foreground">@</span> in a prompt to
            use their photo as a reference.
          </p>
        ) : (
          people.map((person) => (
            <div
              key={person.id}
              data-testid="person-row"
              className="group hover:bg-muted/60 flex items-center gap-3 rounded-lg px-2 py-1.5"
            >
              <Avatar className="size-9 border">
                <AvatarImage src={person.photoUrl} alt={person.name} />
                <AvatarFallback>{person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm">{person.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${person.name}`}
                onClick={() => handleDelete(person)}
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
            <DialogTitle>Add a person</DialogTitle>
            <DialogDescription>
              Upload a clear photo of their face and give them a name. You can then tag them with
              @ in prompts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-muted hover:bg-muted/70 relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="text-muted-foreground size-6" />
                )}
              </button>
              <div className="text-muted-foreground text-xs">
                {file ? file.name : 'PNG or JPG, a single clear face works best.'}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="person-name">Name</Label>
              <Input
                id="person-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Andre"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim() && file && !busy) {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={busy || !name.trim() || !file}>
              {busy && <Loader2 className="size-4 animate-spin" />} Add person
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
