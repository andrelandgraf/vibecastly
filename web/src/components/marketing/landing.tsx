import Link from 'next/link';
import {
  Sparkles,
  AtSign,
  Users,
  Images,
  Wand2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const showcase = ['/showcase/1.jpg', '/showcase/2.jpg', '/showcase/3.jpg', '/showcase/4.jpg'];

function PersonChip({ src, name }: { src: string; name: string }) {
  return (
    <span className="bg-background/70 inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs font-medium">
      <span className="size-6 overflow-hidden rounded-full border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="size-full object-cover" />
      </span>
      <span className="text-primary">@{name}</span>
    </span>
  );
}

function HeroCollage() {
  return (
    <div className="relative mx-auto hidden w-full max-w-md lg:block">
      <div className="bg-primary/20 animate-pulse-glow absolute -inset-6 rounded-full blur-3xl" />

      {/* decorative floating output behind the card */}
      <div className="animate-float absolute -top-10 -right-6 aspect-square w-24 rotate-6 overflow-hidden rounded-2xl border shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={showcase[0]} alt="" className="size-full object-cover" />
      </div>

      {/* product preview card: cast -> prompt -> result */}
      <div className="bg-card/90 animate-float-slow relative rounded-3xl border p-4 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Your cast</span>
          <PersonChip src="/showcase/face-a.jpg" name="Mia" />
          <PersonChip src="/showcase/face-b.jpg" name="Rex" />
        </div>

        <div className="bg-background/60 mb-3 flex items-center gap-2 rounded-xl border px-3 py-2.5">
          <span className="flex-1 text-sm">
            <span className="text-primary">@Mia</span> and <span className="text-primary">@Rex</span>{' '}
            as wizards at a magic academy
          </span>
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full">
            <Wand2 className="size-3.5" />
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/showcase/scene.jpg"
            alt="Generated scene featuring the cast"
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="bg-background/80 absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur">
            <Sparkles className="size-3 text-primary" /> Generated
          </span>
        </div>
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
          <span className="font-display text-[15px] font-semibold">Vibecastly</span>
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
                <Sparkles className="size-3.5 text-primary" /> Learns your style
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
              Upload a clear photo and give them a name. Their photos stay private, scoped to your
              workspace.
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
            <Feature icon={<Sparkles className="size-5" />} title="Learns your style">
              The agent remembers your preferences and personalizes each new image.
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
            <span className="font-display font-semibold">Vibecastly</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-4">
            <p>
              Made by{' '}
              <a
                href="https://x.com/andrelandgraf"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground font-medium underline-offset-4 hover:underline"
              >
                andrelandgraf
              </a>
            </p>
            <a
              href="https://github.com/andrelandgraf/vibecastly"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground inline-flex items-center gap-1.5 font-medium"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
                <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.7-4.04-1.56-4.04-1.56-.55-1.36-1.33-1.72-1.33-1.72-1.09-.72.08-.71.08-.71 1.2.08 1.83 1.2 1.83 1.2 1.07 1.78 2.81 1.27 3.49.97.11-.76.42-1.27.76-1.56-2.67-.29-5.47-1.29-5.47-5.75 0-1.27.47-2.31 1.24-3.12-.12-.29-.54-1.46.12-3.05 0 0 1.01-.31 3.3 1.19a11.6 11.6 0 0 1 3-.39c1.02 0 2.05.13 3 .39 2.28-1.5 3.29-1.19 3.29-1.19.66 1.59.24 2.76.12 3.05.77.81 1.24 1.85 1.24 3.12 0 4.47-2.81 5.45-5.49 5.74.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .31.21.68.83.56A12.01 12.01 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
