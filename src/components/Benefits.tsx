import { Reveal } from "@/components/Reveal";

const benefits = [
  {
    title: "Diseño a tu medida",
    description:
      "Trae tu arte o idea y lo llevamos al botón. Sin mínimos rígidos para probar.",
    icon: "✨",
  },
  {
    title: "Pedidos chicos y grandes",
    description:
      "Desde unos cuantos para un evento hasta miles para campaña. Misma calidad.",
    icon: "📦",
  },
  {
    title: "Envíos a toda la república",
    description:
      "Envíos seguros a cualquier parte de México. Tu pedido llega seguro y bien empacado.",
    icon: "🇲🇽",
  },
  {
    title: "Origen local",
    description:
      "Negocio de Ensenada, Baja California. Atención directa y trato cercano.",
    icon: "🌵",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="bg-background px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">
          Por qué trabajar con nosotros
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-muted">
          Calidad, flexibilidad y servicio pensado para negocios y eventos.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item, index) => (
            <Reveal key={item.title} delayMs={index * 75}>
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <span className="block text-3xl" aria-hidden>
                    {item.icon}
                  </span>
                </div>
                <p className="text-muted">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
