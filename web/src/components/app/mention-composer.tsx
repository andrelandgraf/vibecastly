'use client';

import { useRef, useState } from 'react';
import { ArrowUp, AtSign, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { PersonRecord } from '@/lib/agent-client';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionRegex(name: string): RegExp {
  return new RegExp(`@${escapeRegex(name)}(?![\\w])`);
}

const SUGGESTIONS = [
  'A watercolor of a sleepy elephant',
  'A neon-lit Tokyo alley at night, cinematic',
  'A minimalist logo of a paper plane',
  'A cozy cabin in a snowy forest',
];

export function MentionComposer({
  people,
  status,
  onSubmit,
}: {
  people: PersonRecord[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onSubmit: (text: string, personIds: string[]) => void | Promise<void>;
}) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  const matches =
    query !== null
      ? people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : [];
  const showDropdown = query !== null && matches.length > 0;

  const referenced = people.filter((p) => mentionRegex(p.name).test(text));

  function syncQuery(value: string, caret: number) {
    const match = value.slice(0, caret).match(/@([\w-]*)$/);
    setQuery(match ? match[1] : null);
  }

  function insertMention(person: PersonRecord) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([\w-]*)$/, `@${person.name} `);
    const next = before + text.slice(caret);
    setText(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  }

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    const personIds = people.filter((p) => mentionRegex(p.name).test(text)).map((p) => p.id);
    await onSubmit(value, personIds);
    setText('');
    setQuery(null);
  }

  return (
    <div className="relative">
      {referenced.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {referenced.map((p) => (
            <span
              key={p.id}
              className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs font-medium"
            >
              <Avatar className="size-5">
                <AvatarImage src={p.photoUrl} alt={p.name} />
                <AvatarFallback className="text-[10px]">
                  {p.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {p.name}
            </span>
          ))}
        </div>
      )}

      <div className="bg-card focus-within:border-primary/50 relative flex items-end gap-2 rounded-2xl border p-2 shadow-sm transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder="Describe an image…  Tip: type @ to reference a person"
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => {
            setText(e.target.value);
            syncQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (showDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              e.preventDefault();
              setActiveIndex((prev) => {
                const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
                return (next + matches.length) % matches.length;
              });
              return;
            }
            if (e.key === 'Escape') {
              setQuery(null);
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (showDropdown) {
                insertMention(matches[Math.min(activeIndex, matches.length - 1)]);
              } else {
                void submit();
              }
            }
          }}
        />
        <Button
          size="icon"
          className="size-9 shrink-0 rounded-full"
          disabled={busy || text.trim().length === 0}
          onClick={() => void submit()}
          aria-label="Generate image"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </Button>

        {showDropdown && (
          <div className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl">
            <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1 text-xs">
              <AtSign className="size-3" /> Reference a person
            </div>
            {matches.map((person, i) => (
              <button
                key={person.id}
                type="button"
                aria-selected={i === activeIndex}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                  i === activeIndex ? 'bg-accent' : ''
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(person);
                }}
              >
                <Avatar className="size-6">
                  <AvatarImage src={person.photoUrl} alt={person.name} />
                  <AvatarFallback className="text-[10px]">
                    {person.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {person.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {text.trim().length === 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="text-muted-foreground hover:border-primary/40 hover:text-foreground rounded-full border px-2.5 py-1 text-xs transition-colors"
              onClick={() => {
                setText(s);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-1.5 px-1 text-xs">
          Press Enter to generate · Shift+Enter for a new line
        </p>
      )}
    </div>
  );
}
