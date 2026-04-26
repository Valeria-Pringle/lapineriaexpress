"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCTS, getPriceForQuantity } from "@/lib/products";

const generateId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

interface OrderPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  clientName: string;
  description: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  deliveryDate: string;
  payments: OrderPayment[];
}

interface OrderForm {
  clientName: string;
  description: string;
  createdAt: string;
  deliveryDate: string;
  initialAdvance: string;
}

const ORDERS_STORAGE_KEY = "lapineria-admin-orders-v1";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): OrderForm => ({
  clientName: "",
  description: "",
  createdAt: todayISO(),
  deliveryDate: "",
  initialAdvance: "",
});

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const getPaidAmount = (order: Order) =>
  order.payments.reduce((sum, payment) => sum + payment.amount, 0);

const getRemainingAmount = (order: Order) =>
  Math.max(order.totalAmount - getPaidAmount(order), 0);

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0]?.id ?? "");
  const [quantityInput, setQuantityInput] = useState("1");
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemQty, setCustomItemQty] = useState("1");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");
  const [advanceByOrder, setAdvanceByOrder] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Order[];
      if (!Array.isArray(parsed)) return;

      const normalized = parsed
        .map((order) => {
          const items = Array.isArray(order.items) ? order.items : [];
          const totalAmount = Number.isFinite(order.totalAmount)
            ? Number(order.totalAmount)
            : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

          return {
            ...order,
            items,
            totalAmount,
            payments: Array.isArray(order.payments) ? order.payments : [],
          };
        })
        .filter((order) => order.id && order.clientName);

      setOrders(normalized);
    } catch {
      // Ignore malformed local storage payloads.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const orderTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [orderItems]
  );

  const initialAdvanceValue = Number.parseFloat(form.initialAdvance) || 0;
  const currentRemaining = Math.max(orderTotal - initialAdvanceValue, 0);

  const addOrderItem = () => {
    const product = PRODUCTS.find((item) => item.id === selectedProductId);
    if (!product) {
      setError("Selecciona un producto valido.");
      return;
    }

    const quantity = Math.max(1, Number.parseInt(quantityInput, 10) || 1);
    const unitPrice = getPriceForQuantity(product, quantity);

    const item: OrderItem = {
      id: generateId(),
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
    };

    setError("");
    setOrderItems((current) => [...current, item]);
    setQuantityInput("1");
  };

  const addCustomItem = () => {
    const name = customItemName.trim();
    const price = Number.parseFloat(customItemPrice);
    const qty = Math.max(1, Number.parseInt(customItemQty, 10) || 1);

    if (!name) {
      setError("Escribe el nombre del articulo custom.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Ingresa un precio valido para el articulo custom.");
      return;
    }

    setError("");
    setOrderItems((current) => [
      ...current,
      {
        id: generateId(),
        productId: "custom",
        productName: name,
        quantity: qty,
        unitPrice: price,
      },
    ]);
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemQty("1");
  };

  const removeOrderItem = (itemId: string) => {
    setOrderItems((current) => current.filter((item) => item.id !== itemId));
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const initialAdvance = Number.parseFloat(form.initialAdvance) || 0;

    if (!form.clientName.trim()) {
      setError("Escribe el nombre del cliente.");
      return;
    }

    if (orderItems.length === 0) {
      setError("Agrega al menos un producto al pedido.");
      return;
    }

    if (!form.createdAt) {
      setError("Selecciona la fecha de creacion.");
      return;
    }

    if (!form.deliveryDate) {
      setError("Selecciona la fecha de entrega.");
      return;
    }

    if (form.deliveryDate < form.createdAt) {
      setError("La fecha de entrega no puede ser menor a la de creacion.");
      return;
    }

    if (initialAdvance < 0) {
      setError("El anticipo no puede ser negativo.");
      return;
    }

    if (initialAdvance > orderTotal) {
      setError("El anticipo no puede ser mayor al total del pedido.");
      return;
    }

    const initialPayment = initialAdvance > 0
      ? [
          {
            id: generateId(),
            amount: initialAdvance,
            date: form.createdAt,
            notes: "Anticipo inicial",
          },
        ]
      : [];

    const newOrder: Order = {
      id: generateId(),
      clientName: form.clientName.trim(),
      description: form.description.trim(),
      items: orderItems,
      totalAmount: orderTotal,
      createdAt: form.createdAt,
      deliveryDate: form.deliveryDate,
      payments: initialPayment,
    };

    setOrders((current) => [newOrder, ...current]);
    setForm(emptyForm());
    setOrderItems([]);
    setQuantityInput("1");
    setSelectedProductId(PRODUCTS[0]?.id ?? "");
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((current) => current.filter((order) => order.id !== orderId));
    setAdvanceByOrder((current) => {
      const next = { ...current };
      delete next[orderId];
      return next;
    });
  };

  const handleAddAdvance = (orderId: string) => {
    const rawAmount = advanceByOrder[orderId] ?? "";
    const amount = Number.parseFloat(rawAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un anticipo valido mayor a 0.");
      return;
    }

    setError("");

    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order;

        const remaining = getRemainingAmount(order);
        if (amount > remaining) {
          setError("El anticipo no puede ser mayor al restante.");
          return order;
        }

        const payment: OrderPayment = {
          id: generateId(),
          amount,
          date: todayISO(),
        };

        return {
          ...order,
          payments: [...order.payments, payment],
        };
      })
    );

    setAdvanceByOrder((current) => ({
      ...current,
      [orderId]: "",
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Pedidos</h2>
        <p className="text-muted">
          Registra pedidos con el mismo catalogo de cotizaciones, agrega anticipos y controla el restante automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-zinc-200/80 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-primary">Registrar un Pedido</h3>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm((current) => ({ ...current, clientName: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej. Juan Garcia"
                />
              </div>

              <div className="rounded-lg border border-zinc-200 p-3 space-y-3 bg-zinc-50/50">
                <p className="text-sm font-semibold text-foreground">Productos del pedido</p>

                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Producto</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {PRODUCTS.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="w-full bg-white border border-primary text-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary/5 transition"
                >
                  Agregar producto
                </button>

                <div className="border-t border-zinc-200 pt-3">
                  <p className="text-xs font-medium text-muted mb-2">Articulo personalizado</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Nombre del articulo"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        placeholder="Precio"
                      />
                      <input
                        type="number"
                        min="1"
                        value={customItemQty}
                        onChange={(e) => setCustomItemQty(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        placeholder="Cantidad"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addCustomItem}
                      className="w-full bg-white border border-zinc-400 text-foreground font-semibold py-2 px-4 rounded-lg hover:bg-zinc-50 transition text-sm"
                    >
                      Agregar articulo custom
                    </button>
                  </div>
                </div>

                {orderItems.length > 0 && (
                  <ul className="space-y-2">
                    {orderItems.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 rounded-md bg-white border border-zinc-200 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{item.productName} x{item.quantity}</p>
                          <p className="text-xs text-muted">
                            {currency.format(item.unitPrice)} c/u - Subtotal {currency.format(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOrderItem(item.id)}
                          className="text-rose-600 hover:underline"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripcion (opcional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-20"
                  placeholder="Ej. Pines para evento escolar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha de creacion</label>
                <input
                  type="date"
                  value={form.createdAt}
                  onChange={(e) => setForm((current) => ({ ...current, createdAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha de entrega</label>
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) => setForm((current) => ({ ...current, deliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Anticipo inicial</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.initialAdvance}
                  onChange={(e) => setForm((current) => ({ ...current, initialAdvance: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm space-y-1">
                <p className="text-muted">Total calculado: <span className="font-semibold text-foreground">{currency.format(orderTotal)}</span></p>
                <p className="text-muted">Restante automatico: <span className="font-semibold text-amber-700">{currency.format(currentRemaining)}</span></p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Guardar pedido
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-zinc-200/80 shadow-sm p-4 md:p-6">
            <h3 className="text-lg font-bold mb-4">Pedidos registrados ({orders.length})</h3>

            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-muted">
                Aun no hay pedidos registrados.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const paidAmount = getPaidAmount(order);
                  const remainingAmount = getRemainingAmount(order);
                  const isFullyPaid = remainingAmount <= 0;

                  return (
                    <article key={order.id} className="rounded-lg border border-zinc-200 p-4 md:p-5 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold">{order.clientName}</h4>
                          <p className="text-sm text-muted">{order.description}</p>
                          <p className="text-xs text-muted mt-1">
                            Creacion: {order.createdAt} | Entrega: {order.deliveryDate}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-sm text-muted">Total: {currency.format(order.totalAmount)}</p>
                          <p className="text-sm text-emerald-700">Pagado: {currency.format(paidAmount)}</p>
                          <p className="text-sm font-semibold text-amber-700">
                            Restante: {currency.format(remainingAmount)}
                          </p>
                          <span
                            className={`inline-flex mt-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isFullyPaid
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isFullyPaid ? "Pagado" : "Pendiente"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Productos</p>
                        <ul className="space-y-1.5">
                          {order.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm"
                            >
                              <span className="text-muted">
                                {item.productName} x{item.quantity}
                              </span>
                              <span className="font-semibold text-foreground">
                                {currency.format(item.unitPrice * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={advanceByOrder[order.id] ?? ""}
                          onChange={(e) =>
                            setAdvanceByOrder((current) => ({
                              ...current,
                              [order.id]: e.target.value,
                            }))
                          }
                          placeholder="Monto del anticipo"
                          disabled={isFullyPaid}
                          className="w-full sm:max-w-xs px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAdvance(order.id)}
                          disabled={isFullyPaid}
                          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-zinc-400"
                        >
                          Registrar anticipo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-sm text-rose-600 hover:underline ml-auto"
                        >
                          Eliminar pedido
                        </button>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Historial de anticipos</p>
                        {order.payments.length === 0 ? (
                          <p className="text-sm text-muted">Sin anticipos registrados.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {order.payments.map((payment, index) => (
                              <li
                                key={payment.id}
                                className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm"
                              >
                                <span className="text-muted">
                                  Anticipo #{index + 1} - {payment.date}
                                </span>
                                <span className="font-semibold text-foreground">
                                  {currency.format(payment.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
