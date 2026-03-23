import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold text-foreground">
          La Pineria <span className="text-primary">Express</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="#beneficios"
            className="text-muted transition-colors hover:text-foreground"
          >
            Beneficios
          </Link>
          <Link
            href="#galeria"
            className="text-muted transition-colors hover:text-foreground"
          >
            Galería
          </Link>
          <Link
            href="#pricing"
            className="text-muted transition-colors hover:text-foreground"
          >
            Precios
          </Link>
          <Link
            href="#contacto"
            className="rounded-full bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Contacto
          </Link>
        </nav>
      </div>
    </header>
  );
}
