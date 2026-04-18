import { jsPDF } from "jspdf";
import type { QuotationItem, ClientData } from "./AdminPanel";
import { PRODUCTS, getPriceForQuantity } from "@/lib/products";
import { imageToBase64 } from "@/lib/imageUtils";

export async function generateQuotationPDF(
  items: QuotationItem[],
  clientData: ClientData,
  notes: string = "",
  shippingCost: number = 0
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let yPosition = margin;

  // ===== ENCABEZADO =====
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Logo (izquierda)
  let logoAdded = false;
  try {
    const logoBase64 = await imageToBase64("/logo.jpg");
    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", margin, margin, 12, 12);
      logoAdded = true;
    }
  } catch (error) {
    console.error("Error adding logo to PDF:", error);
  }

  const textStartX = margin + (logoAdded ? 16 : 0);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 51, 51);
  doc.text("LA PINERIA EXPRESS", textStartX, margin + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Botones pin personalizados | Ensenada, Baja California",
    textStartX,
    margin + 11
  );
  doc.text(
    "Teléfono: +52 (646) 190-2568 | Email: shimolpins@gmail.com",
    textStartX,
    margin + 15
  );

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(76, 211, 214);
  doc.text("COTIZACIÓN", pageWidth - margin - 40, margin + 8, {
    align: "center",
  });

  yPosition = 58;

  // ===== INFORMACIÓN DE COTIZACIÓN =====
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 51, 51);

  const today = new Date();
  const dateString = today.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const quotationNumber = `COT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000)}`;

  doc.setFont("helvetica", "bold");
  doc.text("Número de Cotización:", margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(quotationNumber, margin + 50, yPosition);

  yPosition += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(dateString, margin + 50, yPosition);

  yPosition -= 7;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", pageWidth - margin - 60, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(
    clientData.name || "[No especificado]",
    pageWidth - margin - 60,
    yPosition + 5
  );

  if (clientData.email) {
    doc.text(clientData.email, pageWidth - margin - 60, yPosition + 10);
  }
  if (clientData.phone) {
    doc.text(clientData.phone, pageWidth - margin - 60, yPosition + 15);
  }

  yPosition += 25;

  // ===== TABLA DE PRODUCTOS =====
  const col1 = margin;
  const col2 = margin + 100;
  const col3 = margin + 130;
  const col4 = margin + 160;

  doc.setFillColor(76, 211, 214);
  doc.rect(margin - 2, yPosition - 5, contentWidth + 4, 8, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  doc.text("Producto", col1, yPosition);
  doc.text("Cantidad", col2, yPosition, { align: "center" });
  doc.text("Precio Unit.", col3, yPosition, { align: "center" });
  doc.text("Subtotal", col4, yPosition, { align: "right" });

  yPosition += 10;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin - 2, yPosition - 2, pageWidth - margin + 2, yPosition - 2);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 51, 51);

  let subtotal = 0;
  const rowHeight = 7;

  items.forEach((item, index) => {
    let productName = "";
    let price = 0;

    if (item.customName && item.customPrice) {
      productName = item.customName;
      price = item.customPrice;
    } else {
      const product = PRODUCTS.find((p) => p.id === item.productId);
      if (!product) return;
      productName = product.name;
      price = getPriceForQuantity(product, item.quantity);
    }

    const itemTotal = price * item.quantity;
    subtotal += itemTotal;

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin - 2, yPosition - 4, contentWidth + 4, rowHeight, "F");
    }

    doc.text(productName, col1, yPosition);
    doc.text(item.quantity.toString(), col2, yPosition, { align: "center" });
    doc.text(`$${price.toFixed(2)}`, col3, yPosition, { align: "center" });
    doc.text(`$${itemTotal.toFixed(2)}`, col4, yPosition, { align: "right" });

    yPosition += rowHeight;
  });

  doc.setDrawColor(76, 211, 214);
  doc.setLineWidth(0.5);
  doc.line(margin - 2, yPosition, pageWidth - margin + 2, yPosition);
  yPosition += 5;

  // ===== SUBTOTAL Y ENVÍO =====
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 51, 51);

  doc.text("Subtotal:", col3 - 5, yPosition);
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin - 5, yPosition, {
    align: "right",
  });

  yPosition += 6;

  if (shippingCost > 0) {
    doc.text("Envío:", col3 - 5, yPosition);
    doc.text(`$${shippingCost.toFixed(2)}`, pageWidth - margin - 5, yPosition, {
      align: "right",
    });
    yPosition += 6;
  }

  // ===== TOTAL =====
  const total = subtotal + shippingCost;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(76, 211, 214);

  doc.setFillColor(240, 250, 250);
  doc.rect(col3 - 5, yPosition - 3, pageWidth - col3 + margin - 2, 10, "F");

  doc.text("TOTAL:", col3 - 5, yPosition + 2);
  doc.setTextColor(0, 0, 0);
  doc.text(`$${total.toFixed(2)}`, pageWidth - margin - 5, yPosition + 2, {
    align: "right",
  });

  yPosition += 20;

  // ===== SECCIÓN DE NOTAS =====
  if (notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text("Notas:", margin, yPosition);

    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    const notesLines = doc.splitTextToSize(notes, contentWidth - 4);
    const notesHeight = notesLines.length * 4.5 + 4;

    doc.rect(margin, yPosition - 2, contentWidth, notesHeight, "S");
    doc.text(notesLines, margin + 2, yPosition + 1);

    yPosition += notesHeight + 5;
  }

  yPosition += 5;

  // ===== PIE DE PÁGINA =====
  const footerY = pageHeight - 20;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  try {
    const logoBase64 = await imageToBase64("/logo.jpg");
    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", margin, footerY - 3, 8, 8);
    }
  } catch (error) {
    console.error("Error adding footer logo to PDF:", error);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);

  doc.text("Gracias por su preferencia", pageWidth / 2, footerY, {
    align: "center",
  });
  doc.text(
    "Esta cotización es válida por 30 días a partir de la fecha indicada",
    pageWidth / 2,
    footerY + 4,
    { align: "center" }
  );

  doc.text(`Página 1 de 1`, pageWidth / 2, pageHeight - 8, {
    align: "center",
  });

  doc.save(`cotizacion-${quotationNumber}.pdf`);
}
