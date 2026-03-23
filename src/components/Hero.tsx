import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-20 sm:py-28 md:py-32">
      {/* Fondo con imagen y baja saturación */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat saturate-[0.38]"
        style={{ backgroundImage: "url(/bg-hero.png)" }}
        aria-hidden
      />
      {/* Capa base: más clara en el centro (donde está el texto), más transparente arriba/abajo y bordes */}
      <div
        className="pointer-events-none absolute inset-0 z-1 bg-[radial-gradient(ellipse_95%_75%_at_50%_48%,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.82)_45%,rgba(255,255,255,0.55)_100%)]"
        aria-hidden
      />
      {/* Refuerzo suave vertical para que el título no compita con el centro de la foto */}
      <div
        className="pointer-events-none absolute inset-0 z-1 bg-linear-to-b from-white/75 via-transparent to-white/70"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Panel semitransparente: el fondo sigue visible con blur */}
        <Reveal>
          <div className="rounded-3xl border border-white/60 bg-white/0 px-6 py-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:px-10 sm:py-12">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary ">
              Ensenada, Baja California
            </p>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl [text-shadow:0_1px_0_rgba(255,255,255,1),0_2px_24px_rgba(255,255,255,0.85)]">
              Pins que{" "}
              <span className="text-primary drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                reflejan tu marca
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-700 sm:text-xl">
              ¿Necesitas promocionales que no se pierdan en el montón? En La Pineria
              Express hacemos botones publicitarios personalizados con tu diseño.
              Pedidos chicos y grandes, envíos a toda la república.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="#contacto"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary-dark"
              >
                Cotizar mi pedido
              </Link>
              <Link
                href="#galeria"
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-primary bg-white/90 px-8 font-semibold text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
              >
                Ver trabajos
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
