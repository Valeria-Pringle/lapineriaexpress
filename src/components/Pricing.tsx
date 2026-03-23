import { Reveal } from "@/components/Reveal";

const plans = [
  {
    name: "Prueba",
    description: "Ideal para eventos pequeños o prueba de diseño",
    price: "Cotización",
    features: ["Cantidades reducidas", "Un diseño", "Tiempo de entrega corto"],
  },
  {
    name: "Campañita",
    description: "Para marcas y eventos que piden más",
    price: "Cotización",
    features: [
      "Varios diseños",
      "Cantidades medianas",
      "Precio por unidad mejorado",
    ],
    highlighted: true,
  },
  {
    name: "Gran escala",
    description: "Pedidos corporativos o promociones grandes",
    price: "Cotización",
    features: [
      "Múltiples diseños y tallas",
      "Precios por volumen",
      "Logística coordinada",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-background px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">
          Opciones de pedido
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-muted">
          Cada proyecto es distinto. Contáctanos con tu cantidad y diseño y te
          damos una cotización sin compromiso.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delayMs={index * 90}>
              <div
                className={`rounded-2xl border bg-white p-6 shadow-sm h-full ${
                  plan.highlighted
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-zinc-200/80"
                }`}
              >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-foreground">
                  {plan.name}
                </h3>
                {plan.highlighted && (
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold text-primary">
                {plan.price}
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted">
                    <span className="text-primary">✓</span> {f}
                  </li>
                ))}
              </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
