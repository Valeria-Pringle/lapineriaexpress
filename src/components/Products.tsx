import { Reveal } from "@/components/Reveal";
import { PRODUCTS } from "@/lib/products";

export function Products() {
  return (
    <section id="productos" className="bg-background px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground sm:text-4xl">
          Nuestros Productos
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-muted">
          Disponibles en diferentes tamaños para todas tus necesidades.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {PRODUCTS.map((product, index) => (
            <Reveal key={product.id} delayMs={index * 90}>
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-2">
                    {product.name}
                  </h3>
                  <p className="text-muted mb-6">{product.description}</p>
                </div>
                
                {product.priceTiers && product.priceTiers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide text-primary">
                      Disponible en cantidades
                    </h4>
                    <ul className="space-y-2">
                      {product.priceTiers.map((tier, tierIndex) => (
                        <li
                          key={tierIndex}
                          className="flex items-center text-sm text-muted pb-2"
                        >
                          <span className="text-primary mr-2">✓</span>
                          {tier.minQuantity} -{" "}
                          {tier.maxQuantity ? tier.maxQuantity : "300+"} piezas
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
