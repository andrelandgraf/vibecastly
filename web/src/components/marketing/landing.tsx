import Link from 'next/link';
import {
  Sparkles,
  AtSign,
  Users,
  Images,
  Wand2,
  ArrowRight,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const showcase = ['/showcase/1.jpg', '/showcase/2.jpg', '/showcase/3.jpg', '/showcase/4.jpg'];

function HeroCollage() {
  const cards = [
    { src: showcase[0], className: 'left-0 top-6 rotate-[-8deg]', delay: '0s', label: '@Rex in space' },
    { src: showcase[1], className: 'right-2 top-0 rotate-[6deg]', delay: '1.2s' },
    { src: showcase[2], className: 'left-10 bottom-0 rotate-[5deg]', delay: '0.6s' },
    { src: showcase[3], className: 'right-8 bottom-10 rotate-[-5deg]', delay: '1.8s' },
  ];
  return (
    <div className="relative mx-auto hidden h-[420px] w-full max-w-md lg:block">
      <div className="bg-primary/20 animate-pulse-glow absolute inset-10 rounded-full blur-3xl" />
      {cards.map((c, i) => (
        <div
          key={i}
          style={{ animationDelay: c.delay }}
          className={`animate-float absolute aspect-square w-44 overflow-hidden rounded-2xl border shadow-2xl ${c.className}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.src} alt="AI generated" className="size-full object-cover" />
        </div>
      ))}
      <div className="bg-card animate-float-slow absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-xl">
        <AtSign className="size-3.5 text-primary" /> @Rex &amp; @Mia dancing
      </div>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/60 relative rounded-2xl border p-6">
      <div className="text-primary/30 font-display absolute top-4 right-5 text-4xl font-bold">
        {n}
      </div>
      <div className="bg-primary/10 text-primary mb-4 flex size-10 items-center justify-center rounded-xl">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1.5 text-sm">{children}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border p-5 transition-colors hover:border-primary/40">
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{children}</p>
    </div>
  );
}

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="bg-primary/15 ring-primary/20 flex size-7 items-center justify-center rounded-lg ring-1">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-display text-[15px] font-semibold">Neon Image Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/login" />}>
            Get started
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-2 lg:pt-20 lg:pb-24">
          <div className="animate-fade-up">
            <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1">
              <Wand2 className="size-3.5" /> AI image studio for teams
            </span>
            <h1 className="font-display mt-5 text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Cast anyone into
              <br />
              <span className="from-primary bg-gradient-to-r to-emerald-300 bg-clip-text text-transparent">
                any scene.
              </span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-md text-base sm:text-lg">
              Upload photos of people, then <span className="text-foreground">@-mention</span> them
              in a prompt. The agent uses their faces as a starting point — and your whole team
              shares one gallery.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="gap-2" render={<Link href="/login" />}>
                Start creating <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />}>
                Sign in
              </Button>
            </div>
            <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" /> Secure team workspaces
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="size-3.5 text-primary" /> Built on Neon
              </span>
            </div>
          </div>
          <HeroCollage />
        </section>

        {/* Mobile showcase strip */}
        <section className="mx-auto mb-16 grid w-full max-w-6xl grid-cols-4 gap-3 px-5 sm:px-8 lg:hidden">
          {showcase.map((src, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="AI generated" className="size-full object-cover" />
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <h2 className="font-display text-center text-2xl font-semibold sm:text-3xl">
            From a face to a scene in seconds
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Step n="1" icon={<Users className="size-5" />} title="Add your people">
              Upload a clear photo and give them a name. Photos live in Neon Object Storage, scoped
              to your workspace.
            </Step>
            <Step n="2" icon={<AtSign className="size-5" />} title="@-mention in a prompt">
              Type <span className="text-foreground">@</span> to reference anyone you&apos;ve added.
              Their photo becomes the starting point for the image.
            </Step>
            <Step n="3" icon={<Sparkles className="size-5" />} title="Generate together">
              Fire off as many prompts as you like — they run in the background and land in a gallery
              your whole team shares.
            </Step>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={<AtSign className="size-5" />} title="Reference people">
              Generated subjects resemble the photos you uploaded.
            </Feature>
            <Feature icon={<Users className="size-5" />} title="Team workspaces">
              Invite teammates, accept in-app, and collaborate in a shared gallery.
            </Feature>
            <Feature icon={<Images className="size-5" />} title="Manage everything">
              Rename, regenerate, download, or delete any image.
            </Feature>
            <Feature icon={<Database className="size-5" />} title="One backend">
              Neon Auth, Functions, Object Storage, AI Gateway & Postgres.
            </Feature>
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
          <div className="from-primary/15 relative overflow-hidden rounded-3xl border bg-gradient-to-br to-transparent p-10 text-center sm:p-16">
            <div className="bg-primary/20 animate-pulse-glow absolute -top-16 left-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-2xl font-semibold sm:text-4xl">
                Bring your cast to life
              </h2>
              <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm sm:text-base">
                Create a free workspace and generate your first image in under a minute.
              </p>
              <Button size="lg" className="mt-7 gap-2" render={<Link href="/login" />}>
                Get started <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-5 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-xs sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-display font-semibold">Neon Image Studio</span>
          </div>
          <p className="text-muted-foreground">
            Built on the Neon backend platform — Auth · Functions · Storage · AI Gateway · Postgres.
          </p>
        </div>
      </footer>
    </div>
  );
}
