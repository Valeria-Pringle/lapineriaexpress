"use client";

import { useState } from "react";
import Image from "next/image";
import { PRODUCTS, getPriceForQuantity } from "@/lib/products";
import { generateQuotationPDF } from "./QuotationPDF";

export interface ClientData {
  name: string;
  email: string;
  phone: string;
}

export interface QuotationItem {
  id: string;
  productId?: string;
  quantity: number;
  customName?: string;
  customPrice?: number;
}

interface AdminPanelProps {
  onLogout: () => void;
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState(0);
  const [includeIVA, setIncludeIVA] = useState(false);
  const [clientData, setClientData] = useState<ClientData>({
    name: "",
    email: "",
    phone: "",
  });

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      productId: selectedProductId,
      quantity: Math.max(1, quantity),
    };

    setItems([...items, newItem]);
    setQuantity(1);
  };

  const addCustomItem = () => {
    if (!customItemName.trim()) {
      alert("Ingresa el nombre del artículo");
      return;
    }
    if (customItemPrice <= 0) {
      alert("Ingresa un precio válido");
      return;
    }

    const newItem: QuotationItem = {
      id: Date.now().toString(),
      customName: customItemName,
      customPrice: customItemPrice,
      quantity: 1,
    };

    setItems([...items, newItem]);
    setCustomItemName("");
    setCustomItemPrice(0);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, newQuantity) } : item
      )
    );
  };

  const calculateSubtotal = () => {
    const itemsTotal = items.reduce((total, item) => {
      if (item.customPrice !== undefined) {
        return total + item.customPrice * item.quantity;
      }
      const product = PRODUCTS.find((p) => p.id === item.productId);
      if (!product) return total;
      const price = getPriceForQuantity(product, item.quantity);
      return total + price * item.quantity;
    }, 0);
    return itemsTotal + shippingCost;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    if (includeIVA) {
      return subtotal * 1.16;
    }
    return subtotal;
  };

  const calculateIVA = () => {
    if (!includeIVA) return 0;
    return calculateSubtotal() * 0.16;
  };

  const handleGeneratePDF = async () => {
    if (items.length === 0) {
      alert("Agrega al menos un producto antes de generar la cotización");
      return;
    }
    await generateQuotationPDF(items, clientData, notes, shippingCost, includeIVA);
  };

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="La Pineria Express Logo"
              width={40}
              height={40}
              className="rounded-lg object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold">La Pineria Express</h1>
              <p className="text-gray-600 text-sm">Panel Administrativo</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Título de sección */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Generador de Cotizaciones</h2>
          <p className="text-gray-600">
            Crea cotizaciones personalizadas agregando productos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario de agregar productos */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              {/* Datos del Cliente */}
              <div>
                <h3 className="text-lg font-bold mb-4 text-teal-600">
                  Datos del Cliente
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre del cliente
                    </label>
                    <input
                      type="text"
                      value={clientData.name}
                      onChange={(e) =>
                        setClientData({ ...clientData, name: e.target.value })
                      }
                      placeholder="Ej. Juan García"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      value={clientData.email}
                      onChange={(e) =>
                        setClientData({ ...clientData, email: e.target.value })
                      }
                      placeholder="cliente@ejemplo.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Teléfono (opcional)
                    </label>
                    <input
                      type="tel"
                      value={clientData.phone}
                      onChange={(e) =>
                        setClientData({ ...clientData, phone: e.target.value })
                      }
                      placeholder="+52 (646) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-bold mb-4 text-teal-600">
                  Agregar Producto
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo de Pin
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {PRODUCTS.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    onClick={addItem}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    Agregar a cotización
                  </button>
                </div>
              </div>

              {/* Información de producto seleccionado */}
              {PRODUCTS.find((p) => p.id === selectedProductId) && (
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-sm text-gray-700">
                    {
                      PRODUCTS.find((p) => p.id === selectedProductId)
                        ?.description
                    }
                  </p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-bold mb-4 text-teal-600">
                  Agregar Artículo Custom
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre del artículo
                    </label>
                    <input
                      type="text"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="Ej. Diseño personalizado"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Precio
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    onClick={addCustomItem}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    Agregar artículo custom
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Listado de productos en cotización */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">
                Productos en Cotización ({items.length})
              </h3>

              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No hay productos agregados aún
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-teal-500">
                          <th className="text-left py-2">Producto</th>
                          <th className="text-center py-2">Cantidad</th>
                          <th className="text-right py-2">Precio U.</th>
                          <th className="text-right py-2">Total</th>
                          <th className="text-center py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          let productName = "";
                          let price = 0;

                          if (item.customName && item.customPrice) {
                            productName = item.customName;
                            price = item.customPrice;
                          } else {
                            const product = PRODUCTS.find(
                              (p) => p.id === item.productId
                            );
                            if (!product) return null;
                            productName = product.name;
                            price = getPriceForQuantity(product, item.quantity);
                          }

                          const itemTotal = price * item.quantity;

                          return (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="py-3">{productName}</td>
                              <td className="text-center py-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateQuantity(
                                      item.id,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </td>
                              <td className="text-right py-3">
                                ${price.toFixed(2)}
                              </td>
                              <td className="text-right py-3 font-bold">
                                ${itemTotal.toFixed(2)}
                              </td>
                              <td className="text-center py-3">
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-500 hover:text-red-700 font-bold text-sm"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t-2 border-gray-200 bg-teal-50 p-4 rounded-lg">
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-end items-center gap-4">
                        <span className="text-sm font-medium">Subtotal:</span>
                        <span className="text-lg font-bold text-gray-700">
                          ${calculateSubtotal().toFixed(2)}
                        </span>
                      </div>
                      {includeIVA && (
                        <div className="flex justify-end items-center gap-4">
                          <span className="text-sm font-medium">IVA (16%):</span>
                          <span className="text-lg font-bold text-gray-700">
                            ${calculateIVA().toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end items-center gap-4 border-t pt-2">
                      <span className="text-lg font-bold">Total:</span>
                      <span className="text-3xl font-bold text-teal-600">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Área de notas y generador de PDF */}
        {items.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Notas de la Cotización</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Agrega cualquier nota, condiciones o información adicional para la cotización..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Costo de envío (opcional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este costo se sumará al total de la cotización
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIVA}
                  onChange={(e) => setIncludeIVA(e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm font-medium">
                  Agregar IVA al 16%
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-2 ml-7">
                Se agregará el 16% de IVA al subtotal de la cotización
              </p>
            </div>

            <button
              onClick={handleGeneratePDF}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg transition text-lg"
            >
              📄 Descargar Cotización en PDF
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
