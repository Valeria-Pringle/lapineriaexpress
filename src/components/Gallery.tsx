"use client";

import Image from "next/image";
import { Reveal } from "@/components/Reveal";

const galleryImages = [
  { id: 1, src: "/pins-1.jpg", alt: "Botones pin — muestra 1" },
  { id: 2, src: "/pins-2.jpg", alt: "Botones pin — muestra 2" },
  { id: 3, src: "/pins-3.jpeg", alt: "Botones pin — muestra 3" },
  { id: 4, src: "/pins-4.jpeg", alt: "Botones pin — muestra 4" },
  { id: 5, src: "/pins-5.jpeg", alt: "Botones pin — muestra 5" },
  { id: 6, src: "/pins-6.jpeg", alt: "Botones pin — muestra 6" },
];

export function Gallery() {
  return (
    <section id="galeria" className="bg-white px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">
          Trabajos realizados
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-muted">
          Algunos de los diseños que hemos producido para eventos, marcas y
          promociones.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6">
          {galleryImages.map((item, index) => (
            <Reveal key={item.id} delayMs={index * 60}>
              <div className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 320px"
                  className="object-cover"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
