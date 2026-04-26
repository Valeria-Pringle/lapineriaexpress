"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCTS, getPriceForQuantity } from "@/lib/products";
import { ConfirmModal } from "./ConfirmModal";
import { financePreferencesRepository } from "@/lib/finance/preferences";

const generateId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

interface OrderPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
  account?: string;
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
  isHighlighted?: boolean;
  isDelivered?: boolean;
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
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");
  const [advanceByOrder, setAdvanceByOrder] = useState<Record<string, string>>({});

  // Confirmation modal
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  const askConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setPendingAction(() => action);
  };
  const dismissConfirm = () => { setPendingAction(null); setConfirmMessage(""); };

  // Modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"detail" | "edit">("detail");
  const [modalAdvance, setModalAdvance] = useState("");
  const [modalAdvanceAccount, setModalAdvanceAccount] = useState("");
  const [modalError, setModalError] = useState("");
  const [accounts, setAccounts] = useState<string[]>([]);
  const [formAdvanceAccount, setFormAdvanceAccount] = useState("");
  const [upcomingHighlights, setUpcomingHighlights] = useState<Set<string>>(new Set());
  const [ordersCollapsed, setOrdersCollapsed] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersPaymentFilter, setOrdersPaymentFilter] = useState<"all" | "paid" | "pending">("all");
  const [ordersDeliveryFilter, setOrdersDeliveryFilter] = useState<"all" | "delivered" | "undelivered">("all");
  const [editForm, setEditForm] = useState({ clientName: "", description: "", createdAt: "", deliveryDate: "" });
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editIsCustomMode, setEditIsCustomMode] = useState(false);
  const [editSelectedProductId, setEditSelectedProductId] = useState(PRODUCTS[0]?.id ?? "");
  const [editQuantityInput, setEditQuantityInput] = useState("1");
  const [editCustomItemName, setEditCustomItemName] = useState("");
  const [editCustomItemPrice, setEditCustomItemPrice] = useState("");
  const [editCustomItemQty, setEditCustomItemQty] = useState("1");

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

  useEffect(() => {
    financePreferencesRepository.get().then((prefs) => setAccounts(prefs.accounts)).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("lapineria-upcoming-highlights-v1");
    if (raw) { try { setUpcomingHighlights(new Set(JSON.parse(raw) as string[])); } catch {} }
    const col = localStorage.getItem("lapineria-orders-collapsed-v1");
    if (col !== null) setOrdersCollapsed(col === "true");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("lapineria-upcoming-highlights-v1", JSON.stringify([...upcomingHighlights]));
  }, [upcomingHighlights]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("lapineria-orders-collapsed-v1", String(ordersCollapsed));
  }, [ordersCollapsed]);

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
            ...(formAdvanceAccount ? { account: formAdvanceAccount } : {}),
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
    setFormAdvanceAccount("");
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((current) => current.filter((order) => order.id !== orderId));
    setAdvanceByOrder((current) => {
      const next = { ...current };
      delete next[orderId];
      return next;
    });
  };

  const handleLiquidateOrder = (orderId: string) => {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order;
        const remaining = getRemainingAmount(order);
        if (remaining <= 0) return order;
        const payment: OrderPayment = {
          id: generateId(),
          amount: remaining,
          date: todayISO(),
          notes: "Liquidacion total",
        };
        return { ...order, payments: [...order.payments, payment] };
      })
    );
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

  const openDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setModalMode("detail");
    setModalAdvance("");
    setModalAdvanceAccount("");
    setModalError("");
  };

  const openEdit = (order: Order) => {
    setSelectedOrderId(order.id);
    setModalMode("edit");
    setModalError("");
    setEditForm({
      clientName: order.clientName,
      description: order.description,
      createdAt: order.createdAt,
      deliveryDate: order.deliveryDate,
    });
    setEditItems(order.items);
    setEditIsCustomMode(false);
    setEditSelectedProductId(PRODUCTS[0]?.id ?? "");
    setEditQuantityInput("1");
    setEditCustomItemName("");
    setEditCustomItemPrice("");
    setEditCustomItemQty("1");
  };

  const closeModal = () => {
    setSelectedOrderId(null);
    setModalAdvance("");
    setModalAdvanceAccount("");
    setModalError("");
  };

  const addEditItem = () => {
    const product = PRODUCTS.find((p) => p.id === editSelectedProductId);
    if (!product) { setModalError("Selecciona un producto valido."); return; }
    const quantity = Math.max(1, Number.parseInt(editQuantityInput, 10) || 1);
    setModalError("");
    setEditItems((c) => [...c, { id: generateId(), productId: product.id, productName: product.name, quantity, unitPrice: getPriceForQuantity(product, quantity) }]);
    setEditQuantityInput("1");
  };

  const addEditCustomItem = () => {
    const name = editCustomItemName.trim();
    const price = Number.parseFloat(editCustomItemPrice);
    const qty = Math.max(1, Number.parseInt(editCustomItemQty, 10) || 1);
    if (!name) { setModalError("Escribe el nombre del articulo."); return; }
    if (!Number.isFinite(price) || price <= 0) { setModalError("Ingresa un precio valido."); return; }
    setModalError("");
    setEditItems((c) => [...c, { id: generateId(), productId: "custom", productName: name, quantity: qty, unitPrice: price }]);
    setEditCustomItemName("");
    setEditCustomItemPrice("");
    setEditCustomItemQty("1");
  };

  const removeEditItem = (itemId: string) => setEditItems((c) => c.filter((i) => i.id !== itemId));

  const handleDeletePayment = (paymentId: string) => {
    askConfirm("Eliminar este abono del historial?", () => {
      setOrders((current) =>
        current.map((o) =>
          o.id === selectedOrderId
            ? { ...o, payments: o.payments.filter((p) => p.id !== paymentId) }
            : o
        )
      );
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.clientName.trim()) {
      setModalError("Escribe el nombre del cliente.");
      return;
    }
    if (!editForm.deliveryDate) {
      setModalError("Selecciona la fecha de entrega.");
      return;
    }
    if (editItems.length === 0) {
      setModalError("Agrega al menos un producto.");
      return;
    }
    const newTotal = editItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    setOrders((current) =>
      current.map((o) =>
        o.id === selectedOrderId
          ? {
              ...o,
              clientName: editForm.clientName.trim(),
              description: editForm.description.trim(),
              createdAt: editForm.createdAt,
              deliveryDate: editForm.deliveryDate,
              items: editItems,
              totalAmount: newTotal,
            }
          : o
      )
    );
    setModalMode("detail");
    setModalError("");
  };

  const handleModalAdvance = () => {
    const amount = Number.parseFloat(modalAdvance);
    if (!Number.isFinite(amount) || amount <= 0) {
      setModalError("Ingresa un monto valido mayor a 0.");
      return;
    }
    setOrders((current) =>
      current.map((o) => {
        if (o.id !== selectedOrderId) return o;
        const remaining = getRemainingAmount(o);
        if (amount > remaining) {
          setModalError("El abono no puede ser mayor al restante.");
          return o;
        }
        return {
          ...o,
          payments: [
            ...o.payments,
            { id: generateId(), amount, date: todayISO(), ...(modalAdvanceAccount ? { account: modalAdvanceAccount } : {}) },
          ],
        };
      })
    );
    setModalAdvance("");
    setModalAdvanceAccount("");
    setModalError("");
  };

  const handleModalLiquidate = () => {
    setOrders((current) =>
      current.map((o) => {
        if (o.id !== selectedOrderId) return o;
        const remaining = getRemainingAmount(o);
        if (remaining <= 0) return o;
        return {
          ...o,
          payments: [
            ...o.payments,
            { id: generateId(), amount: remaining, date: todayISO(), notes: "Liquidacion total", ...(modalAdvanceAccount ? { account: modalAdvanceAccount } : {}) },
          ],
        };
      })
    );
    setModalError("");
  };

  const handleModalDelete = () => {
    if (!selectedOrderId) return;
    askConfirm("Eliminar este pedido? Esta accion no se puede deshacer.", () => {
      handleDeleteOrder(selectedOrderId);
      closeModal();
    });
  };

  const handleToggleHighlight = (orderId: string) => {
    setOrders((current) =>
      current.map((o) =>
        o.id === orderId ? { ...o, isHighlighted: !o.isHighlighted } : o
      )
    );
  };

  const handleToggleUpcomingHighlight = (orderId: string) => {
    setUpcomingHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  const handleToggleDelivered = (orderId: string) => {
    setOrders((current) =>
      current.map((o) =>
        o.id === orderId ? { ...o, isDelivered: !o.isDelivered } : o
      )
    );
  };

  const handleModalDeliveredAction = (order: Order) => {
    if (order.isDelivered) {
      handleToggleDelivered(order.id);
      return;
    }
    setOrders((current) =>
      current.map((o) =>
        o.id === order.id ? { ...o, isDelivered: true } : o
      )
    );
    closeModal();
  };

  const [upcomingPage, setUpcomingPage] = useState(0);
  const UPCOMING_PAGE_SIZE = 8;
  const [ordersPage, setOrdersPage] = useState(0);
  const ORDERS_PAGE_SIZE = 8;

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.isHighlighted && !b.isHighlighted) return -1;
    if (!a.isHighlighted && b.isHighlighted) return 1;
    return 0;
  });

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthRegisteredOrders = sortedOrders.filter((order) => order.createdAt.slice(0, 7) === currentMonthPrefix);
  const normalizedOrdersSearch = ordersSearch.trim().toLowerCase();
  const filteredRegisteredOrders = monthRegisteredOrders.filter((order) => {
    const remaining = getRemainingAmount(order);
    const matchesSearch =
      normalizedOrdersSearch.length === 0 ||
      order.clientName.toLowerCase().includes(normalizedOrdersSearch) ||
      order.description.toLowerCase().includes(normalizedOrdersSearch);
    const matchesPayment =
      ordersPaymentFilter === "all" ||
      (ordersPaymentFilter === "paid" && remaining <= 0) ||
      (ordersPaymentFilter === "pending" && remaining > 0);
    const matchesDelivery =
      ordersDeliveryFilter === "all" ||
      (ordersDeliveryFilter === "delivered" && Boolean(order.isDelivered)) ||
      (ordersDeliveryFilter === "undelivered" && !order.isDelivered);
    return matchesSearch && matchesPayment && matchesDelivery;
  });

  const ordersPageCount = Math.max(1, Math.ceil(filteredRegisteredOrders.length / ORDERS_PAGE_SIZE));
  const safeOrdersPage = Math.min(ordersPage, ordersPageCount - 1);
  const pagedOrders = filteredRegisteredOrders.slice(safeOrdersPage * ORDERS_PAGE_SIZE, (safeOrdersPage + 1) * ORDERS_PAGE_SIZE);
  const ordersEmptyRows = Math.max(0, ORDERS_PAGE_SIZE - pagedOrders.length);

  const upcomingOrders = (() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 7);
    const limitISO = limit.toISOString().slice(0, 10);
    return orders
      .filter((o) => !o.isDelivered && o.deliveryDate <= limitISO)
      .sort((a, b) => {
        const aH = upcomingHighlights.has(a.id) ? 0 : 1;
        const bH = upcomingHighlights.has(b.id) ? 0 : 1;
        if (aH !== bH) return aH - bH;
        return a.deliveryDate.localeCompare(b.deliveryDate);
      });
  })();

  const upcomingPageCount = Math.max(1, Math.ceil(upcomingOrders.length / UPCOMING_PAGE_SIZE));
  const safeUpcomingPage = Math.min(upcomingPage, upcomingPageCount - 1);
  const pagedUpcoming = upcomingOrders.slice(safeUpcomingPage * UPCOMING_PAGE_SIZE, (safeUpcomingPage + 1) * UPCOMING_PAGE_SIZE);
  const upcomingEmptyRows = UPCOMING_PAGE_SIZE - pagedUpcoming.length;

  useEffect(() => {
    setOrdersPage(0);
  }, [ordersSearch, ordersPaymentFilter, ordersDeliveryFilter]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const shouldLockScroll = Boolean(selectedOrderId) || Boolean(pendingAction);
    if (!shouldLockScroll) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedOrderId, pendingAction]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

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
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Productos del pedido</p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCustomMode}
                      onChange={(e) => setIsCustomMode(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs font-medium text-muted">Articulo personalizado</span>
                  </label>
                </div>

                {!isCustomMode ? (
                  <>
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
                  </>
                ) : (
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
                        placeholder="Precio unitario"
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
                      Agregar articulo personalizado
                    </button>
                  </div>
                )}

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
                {accounts.length > 0 && (
                  <select
                    value={formAdvanceAccount}
                    onChange={(e) => setFormAdvanceAccount(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                  >
                    <option value="">Cuenta — sin especificar</option>
                    {accounts.map((acc) => <option key={acc} value={acc}>{acc}</option>)}
                  </select>
                )}
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base text-muted font-medium">Total calculado</p>
                  <p className="text-2xl font-bold text-foreground">{currency.format(orderTotal)}</p>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
                  <p className="text-base text-muted font-medium">Restante</p>
                  <p className="text-2xl font-bold text-amber-700">{currency.format(currentRemaining)}</p>
                </div>
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
          {/* Upcoming orders (next 7 days) */}
          <div className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm p-4">
            <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Proximos / vencidos sin entregar
              <span className="ml-auto bg-amber-200 text-amber-900 text-xs rounded-full px-2 py-0.5 font-bold">{upcomingOrders.length}</span>
            </h3>
            {upcomingOrders.length === 0 && (
              <p className="mb-3 text-xs text-amber-800">No hay pedidos proximos o vencidos sin entregar.</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-2 w-8"></th>
                    <th className="pb-2 pr-4 font-semibold">Cliente</th>
                    <th className="pb-2 pr-4 font-semibold">Entrega</th>
                    <th className="pb-2 pr-4 font-semibold">Descripcion</th>
                    <th className="pb-2 pr-4 font-semibold text-right">Pendiente</th>
                    <th className="pb-2 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pagedUpcoming.map((order) => {
                    const remaining = getRemainingAmount(order);
                    const daysLeft = Math.round((new Date(order.deliveryDate).getTime() - new Date(todayISO()).getTime()) / 86400000);
                    const isOverdue = daysLeft < 0;
                    return (
                      <tr key={order.id} className={`transition-colors ${isOverdue ? "bg-rose-50 hover:bg-rose-100/60" : upcomingHighlights.has(order.id) ? "bg-amber-50 hover:bg-amber-100/50" : "hover:bg-white/60"}`}>
                        <td className="py-2 pr-2">
                          <button
                            type="button"
                            onClick={() => handleToggleUpcomingHighlight(order.id)}
                            title={upcomingHighlights.has(order.id) ? "Quitar destacado" : "Destacar"}
                            className={`p-1.5 rounded border transition ${upcomingHighlights.has(order.id) ? "border-amber-300 text-amber-600 bg-amber-100 hover:bg-amber-200" : "border-zinc-200 text-zinc-300 hover:bg-zinc-100"}`}
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={upcomingHighlights.has(order.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                              <path d="M12 3l2.9 5.88 6.49.95-4.7 4.58 1.11 6.47L12 17.77 6.2 20.88l1.11-6.47-4.7-4.58 6.49-.95L12 3z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </td>
                        <td className="py-2 pr-4 font-medium text-foreground">{order.clientName}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <span className="font-medium">{order.deliveryDate}</span>
                          <span className={`ml-2 text-xs font-semibold ${
                            isOverdue ? "text-rose-600" : daysLeft === 0 ? "text-rose-600" : daysLeft <= 2 ? "text-orange-600" : "text-amber-700"
                          }`}>
                            {isOverdue ? `hace ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? "s" : ""}` : daysLeft === 0 ? "Hoy" : daysLeft === 1 ? "Mañana" : `en ${daysLeft} dias`}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-muted max-w-[140px] truncate">
                          {order.description || <span className="italic text-zinc-300">—</span>}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold whitespace-nowrap">
                          {remaining > 0 ? <span className="text-amber-700">{currency.format(remaining)}</span> : <span className="text-emerald-700">Pagado</span>}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openDetail(order.id)}
                              title="Ver detalle"
                              className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-primary transition"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(order)}
                              title="Editar pedido"
                              className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-foreground transition"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDelivered(order.id)}
                              title="Marcar como entregado"
                              className="p-1.5 rounded hover:bg-sky-50 text-zinc-400 hover:text-sky-600 transition"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: upcomingEmptyRows }).map((_, i) => (
                    <tr key={`upcoming-empty-${i}`}>
                      <td colSpan={6} className="h-[41px]"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {upcomingOrders.length > UPCOMING_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-sm">
                <button
                  type="button"
                  onClick={() => setUpcomingPage((p) => Math.max(0, p - 1))}
                  disabled={safeUpcomingPage === 0}
                  className="px-3 py-1 rounded border border-zinc-300 disabled:opacity-40 hover:bg-zinc-50"
                >
                  Anterior
                </button>
                <span className="text-muted text-xs">
                  {safeUpcomingPage + 1} / {upcomingPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setUpcomingPage((p) => Math.min(upcomingPageCount - 1, p + 1))}
                  disabled={safeUpcomingPage >= upcomingPageCount - 1}
                  className="px-3 py-1 rounded border border-zinc-300 disabled:opacity-40 hover:bg-zinc-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-zinc-200/80 shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Pedidos registrados este mes ({monthRegisteredOrders.length})</h3>
              <button
                type="button"
                onClick={() => setOrdersCollapsed((c) => !c)}
                title={ordersCollapsed ? "Expandir tabla" : "Colapsar tabla"}
                aria-label={ordersCollapsed ? "Expandir tabla" : "Colapsar tabla"}
                className="text-sm text-muted hover:text-foreground transition p-2 rounded-lg hover:bg-zinc-100"
              >
                <svg className={`h-4 w-4 transition-transform duration-200 ${ordersCollapsed ? "" : "rotate-180"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>

            {!ordersCollapsed && (
              <>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-2">
                  <input
                    type="text"
                    value={ordersSearch}
                    onChange={(e) => setOrdersSearch(e.target.value)}
                    placeholder="Buscar por cliente o descripcion"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <select
                    value={ordersPaymentFilter}
                    onChange={(e) => setOrdersPaymentFilter(e.target.value as "all" | "paid" | "pending")}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                  >
                    <option value="all">Pago: Todos</option>
                    <option value="paid">Pago: Pagado</option>
                    <option value="pending">Pago: Pendiente</option>
                  </select>
                  <select
                    value={ordersDeliveryFilter}
                    onChange={(e) => setOrdersDeliveryFilter(e.target.value as "all" | "delivered" | "undelivered")}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                  >
                    <option value="all">Entrega: Todos</option>
                    <option value="delivered">Entrega: Entregado</option>
                    <option value="undelivered">Entrega: Pendiente</option>
                  </select>
                </div>

                {filteredRegisteredOrders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-muted">
                    No hay pedidos que coincidan con los filtros de este mes.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-muted">
                            <th className="pb-2 pr-2 w-8"></th>
                            <th className="pb-2 pr-4 font-semibold">Cliente</th>
                            <th className="pb-2 pr-4 font-semibold">Descripcion</th>
                            <th className="pb-2 pr-4 font-semibold">Entrega</th>
                            <th className="pb-2 pr-4 font-semibold">Estado</th>
                            <th className="pb-2 pr-4 font-semibold">Entregado</th>
                            <th className="pb-2 pr-4 font-semibold text-right">Pendiente</th>
                            <th className="pb-2 font-semibold text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {pagedOrders.map((order) => {
                            const remainingAmount = getRemainingAmount(order);
                            const isFullyPaid = remainingAmount <= 0;
                            return (
                              <tr key={order.id} className={`transition-colors ${order.isHighlighted ? "bg-amber-50 hover:bg-amber-100/60" : "hover:bg-zinc-50"}`}>
                                <td className="py-3 pr-2 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHighlight(order.id)}
                                    title={order.isHighlighted ? "Quitar destacado" : "Destacar"}
                                    className={`rounded-md p-1 border ${
                                      order.isHighlighted
                                        ? "border-amber-300 text-amber-600 bg-amber-100"
                                        : "border-zinc-200 text-zinc-300 hover:bg-zinc-100"
                                    }`}
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={order.isHighlighted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                      <path d="M12 3l2.9 5.88 6.49.95-4.7 4.58 1.11 6.47L12 17.77 6.2 20.88l1.11-6.47-4.7-4.58 6.49-.95L12 3z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                </td>
                                <td className="py-3 pr-4 font-medium text-foreground">{order.clientName}</td>
                                <td className="py-3 pr-4 text-muted max-w-[160px] truncate">
                                  {order.description || <span className="italic text-zinc-300">—</span>}
                                </td>
                                <td className="py-3 pr-4 text-muted whitespace-nowrap">{order.deliveryDate}</td>
                                <td className="py-3 pr-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      isFullyPaid
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {isFullyPaid ? "Pagado" : "Pendiente"}
                                  </span>
                                </td>
                                <td className="py-3 pr-4">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDelivered(order.id)}
                                    title={order.isDelivered ? "Marcar como no entregado" : "Marcar como entregado"}
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition ${
                                      order.isDelivered
                                        ? "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200"
                                        : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                                    }`}
                                  >
                                    {order.isDelivered ? "✓ Entregado" : "Pendiente"}
                                  </button>
                                </td>
                                <td className="py-3 pr-4 text-right font-semibold text-amber-700 whitespace-nowrap">
                                  {isFullyPaid ? "—" : currency.format(remainingAmount)}
                                </td>
                                <td className="py-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <button type="button" onClick={() => openDetail(order.id)} title="Ver detalle" className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-primary transition">
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/></svg>
                                    </button>
                                    <button type="button" onClick={() => openEdit(order)} title="Editar pedido" className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-foreground transition">
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                    <button type="button" onClick={() => askConfirm("Eliminar este pedido? Esta accion no se puede deshacer.", () => handleDeleteOrder(order.id))} title="Eliminar pedido" className="p-1.5 rounded hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition">
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {Array.from({ length: ordersEmptyRows }).map((_, i) => (
                            <tr key={`orders-empty-${i}`}>
                              <td colSpan={8} className="h-[53px]"></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filteredRegisteredOrders.length > ORDERS_PAGE_SIZE && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-sm">
                        <button
                          type="button"
                          onClick={() => setOrdersPage((p) => Math.max(0, p - 1))}
                          disabled={safeOrdersPage === 0}
                          className="px-3 py-1 rounded border border-zinc-300 disabled:opacity-40 hover:bg-zinc-50"
                        >
                          Anterior
                        </button>
                        <span className="text-muted text-xs">
                          {safeOrdersPage + 1} / {ordersPageCount} - {filteredRegisteredOrders.length} pedidos
                        </span>
                        <button
                          type="button"
                          onClick={() => setOrdersPage((p) => Math.min(ordersPageCount - 1, p + 1))}
                          disabled={safeOrdersPage >= ordersPageCount - 1}
                          className="px-3 py-1 rounded border border-zinc-300 disabled:opacity-40 hover:bg-zinc-50"
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
        </div>
      </div>
          </div>

      {/* Detail / Edit Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                {modalMode === "detail" && (
                  <button
                    type="button"
                    onClick={() => handleToggleHighlight(selectedOrder.id)}
                    title={selectedOrder.isHighlighted ? "Quitar destacado" : "Destacar"}
                    className={`rounded-md p-1.5 border ${
                      selectedOrder.isHighlighted
                        ? "border-amber-300 text-amber-600 bg-amber-100"
                        : "border-zinc-200 text-zinc-400 hover:bg-zinc-100"
                    }`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill={selectedOrder.isHighlighted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M12 3l2.9 5.88 6.49.95-4.7 4.58 1.11 6.47L12 17.77 6.2 20.88l1.11-6.47-4.7-4.58 6.49-.95L12 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                <h3 className="text-lg font-bold text-foreground">
                  {modalMode === "edit" ? "Editar pedido" : selectedOrder.clientName}
                </h3>
              </div>
              <button type="button" onClick={closeModal} className="text-muted hover:text-foreground text-xl leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {modalMode === "detail" ? (
                <>
                  {/* Info row */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted mb-0.5">Creacion</p>
                      <p className="font-medium">{selectedOrder.createdAt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-0.5">Entrega</p>
                      <p className="font-medium">{selectedOrder.deliveryDate}</p>
                    </div>
                    {selectedOrder.description && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted mb-0.5">Descripcion</p>
                        <p className="font-medium">{selectedOrder.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Products */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Productos</p>
                    <ul className="space-y-1.5">
                      {selectedOrder.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
                          <span className="text-muted">{item.productName} x{item.quantity}</span>
                          <span className="font-semibold">{currency.format(item.unitPrice * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Totals */}
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Total</span>
                      <span className="font-bold text-foreground text-base">{currency.format(selectedOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Pagado</span>
                      <span className="font-semibold text-emerald-700">{currency.format(getPaidAmount(selectedOrder))}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-zinc-200 pt-2">
                      <span className="text-muted font-medium">Restante</span>
                      <span className="font-bold text-amber-700 text-base">{currency.format(getRemainingAmount(selectedOrder))}</span>
                    </div>
                  </div>

                  {/* Payment history */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Historial de abonos</p>
                    {selectedOrder.payments.length === 0 ? (
                      <p className="text-sm text-muted">Sin abonos registrados.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {selectedOrder.payments.map((payment, index) => (
                          <li key={payment.id} className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
                            <span className="text-muted">
                              #{index + 1} — {payment.date}{payment.account ? ` · ${payment.account}` : ""}{payment.notes ? ` (${payment.notes})` : ""}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">{currency.format(payment.amount)}</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(payment.id)}
                                className="text-rose-500 hover:text-rose-700 text-xs hover:underline"
                              >
                                Eliminar
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Register advance */}
                  {getRemainingAmount(selectedOrder) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold mb-2">Registrar abono</p>
                      <div className={`grid gap-2 ${accounts.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={modalAdvance}
                          onChange={(e) => setModalAdvance(e.target.value)}
                          placeholder="Monto"
                          className="px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                        {accounts.length > 0 && (
                          <select
                            value={modalAdvanceAccount}
                            onChange={(e) => setModalAdvanceAccount(e.target.value)}
                            className="px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                          >
                            <option value="">Cuenta — sin especificar</option>
                            {accounts.map((acc) => <option key={acc} value={acc}>{acc}</option>)}
                          </select>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleModalAdvance}
                          className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                        >
                          Abonar
                        </button>
                        <button
                          type="button"
                          onClick={handleModalLiquidate}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm whitespace-nowrap"
                        >
                          Liquidar todo
                        </button>
                      </div>
                    </div>
                  )}

                  {modalError && (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{modalError}</div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleModalDeliveredAction(selectedOrder)}
                      className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-xl transition text-sm ${
                        selectedOrder.isDelivered
                          ? "bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-200"
                          : "bg-zinc-100 hover:bg-zinc-200 text-foreground border border-zinc-200"
                      }`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {selectedOrder.isDelivered ? "Entregado — click para revertir" : "Marcar como entregado"}
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(selectedOrder)}
                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-foreground font-semibold py-2 px-4 rounded-xl transition text-sm border border-zinc-200"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editar pedido
                      </button>
                      <button
                        type="button"
                        onClick={handleModalDelete}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2 px-4 rounded-xl transition text-sm border border-rose-200"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        Eliminar pedido
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Edit form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cliente</label>
                    <input
                      type="text"
                      value={editForm.clientName}
                      onChange={(e) => setEditForm((c) => ({ ...c, clientName: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Products editing */}
                  <div className="rounded-lg border border-zinc-200 p-3 space-y-3 bg-zinc-50/50">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Productos</p>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editIsCustomMode}
                          onChange={(e) => setEditIsCustomMode(e.target.checked)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-xs font-medium text-muted">Articulo personalizado</span>
                      </label>
                    </div>

                    {!editIsCustomMode ? (
                      <>
                        <div className="grid grid-cols-[1fr_90px] gap-2">
                          <div>
                            <label className="block text-xs font-medium mb-1 text-muted">Producto</label>
                            <select
                              value={editSelectedProductId}
                              onChange={(e) => setEditSelectedProductId(e.target.value)}
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                              {PRODUCTS.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-muted">Cant.</label>
                            <input
                              type="number" min="1" value={editQuantityInput}
                              onChange={(e) => setEditQuantityInput(e.target.value)}
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </div>
                        </div>
                        <button type="button" onClick={addEditItem}
                          className="w-full bg-white border border-primary text-primary font-semibold py-1.5 px-3 rounded-lg hover:bg-primary/5 transition text-sm">
                          Agregar producto
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <input type="text" value={editCustomItemName}
                          onChange={(e) => setEditCustomItemName(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          placeholder="Nombre del articulo" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" min="0" step="0.01" value={editCustomItemPrice}
                            onChange={(e) => setEditCustomItemPrice(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            placeholder="Precio unitario" />
                          <input type="number" min="1" value={editCustomItemQty}
                            onChange={(e) => setEditCustomItemQty(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            placeholder="Cantidad" />
                        </div>
                        <button type="button" onClick={addEditCustomItem}
                          className="w-full bg-white border border-zinc-400 text-foreground font-semibold py-1.5 px-3 rounded-lg hover:bg-zinc-50 transition text-sm">
                          Agregar articulo personalizado
                        </button>
                      </div>
                    )}

                    {editItems.length > 0 && (
                      <ul className="space-y-1.5">
                        {editItems.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-2 rounded-md bg-white border border-zinc-200 px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium">{item.productName} x{item.quantity}</p>
                              <p className="text-xs text-muted">{currency.format(item.unitPrice)} c/u — {currency.format(item.unitPrice * item.quantity)}</p>
                            </div>
                            <button type="button" onClick={() => removeEditItem(item.id)}
                              className="text-rose-600 hover:underline text-xs">Quitar</button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-sm">
                      <span className="text-muted">Nuevo total</span>
                      <span className="font-bold text-foreground">{currency.format(editItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Descripcion (opcional)</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-16"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha creacion</label>
                      <input
                        type="date"
                        value={editForm.createdAt}
                        onChange={(e) => setEditForm((c) => ({ ...c, createdAt: e.target.value }))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fecha entrega</label>
                      <input
                        type="date"
                        value={editForm.deliveryDate}
                        onChange={(e) => setEditForm((c) => ({ ...c, deliveryDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {modalError && (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{modalError}</div>
                  )}

                  <div className="flex gap-3 pt-2 border-t border-zinc-200">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                      Guardar cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalMode("detail"); setModalError(""); }}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-foreground font-semibold py-2 px-4 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={() => { pendingAction(); dismissConfirm(); }}
          onCancel={dismissConfirm}
        />
      )}
    </div>
  );
}
