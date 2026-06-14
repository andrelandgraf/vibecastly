'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, AtSign, Users, Wand2 } from 'lucide-react';

type Mode = 'signin' | 'signup';

const showcase = ['/showcase/look-1.jpg', '/showcase/look-2.jpg', '/showcase/look-3.jpg'];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await authClient.signUp.email({ name: name || email, email, password });
        if (error) {
          toast.error(error.message ?? 'Could not create account');
          return;
        }
        toast.success('Account created');
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          toast.error(error.message ?? 'Invalid credentials');
          return;
        }
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / showcase panel */}
      <div className="relative hidden overflow-hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="bg-primary/20 animate-pulse-glow absolute -top-24 -left-24 size-96 rounded-full blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2">
          <div className="bg-primary/15 ring-primary/20 flex size-7 items-center justify-center rounded-lg ring-1">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-display text-[15px] font-semibold">Vibecastly</span>
        </Link>

        <div className="relative">
          <div className="mb-8 flex gap-4">
            {showcase.map((src, i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 0.8}s`, rotate: `${i % 2 === 0 ? -6 : 6}deg` }}
                className="animate-float aspect-square w-28 overflow-hidden rounded-2xl border shadow-2xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-cover" />
              </div>
            ))}
          </div>
          <h2 className="font-display max-w-sm text-3xl font-semibold leading-tight">
            Cast anyone into{' '}
            <span className="from-primary bg-gradient-to-r to-emerald-300 bg-clip-text text-transparent">
              any scene.
            </span>
          </h2>
          <ul className="text-muted-foreground mt-6 space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <AtSign className="size-4 text-primary" /> @-mention people as references
            </li>
            <li className="flex items-center gap-2">
              <Users className="size-4 text-primary" /> Shared team workspaces
            </li>
            <li className="flex items-center gap-2">
              <Wand2 className="size-4 text-primary" /> Generate many at once
            </li>
          </ul>
        </div>

        <p className="text-muted-foreground relative text-xs">
          Built on Neon — Auth · Functions · Storage · AI Gateway · Postgres.
        </p>
      </div>

      {/* Auth form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="bg-primary/15 ring-primary/20 flex size-7 items-center justify-center rounded-lg ring-1">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span className="font-display text-[15px] font-semibold">Vibecastly</span>
          </Link>

          <h1 className="font-display text-2xl font-semibold">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === 'signin'
              ? 'Sign in to generate and manage your AI images.'
              : 'Sign up to start generating AI images.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-5 text-sm"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </main>
  );
}
