import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const formatCurrency = (value: unknown) => Number(value ?? 0).toFixed(2);

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#e5e7eb",
    paddingBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    color: "#1f2937",
  },
  businessName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  invoiceLabel: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 6,
    textAlign: "right",
  },
  metaText: {
    marginBottom: 3,
    textAlign: "right",
  },
  table: {
    display: "table",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#e5e7eb",
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: "#e5e7eb",
  },
  headerRow: {
    backgroundColor: "#f3f4f6",
  },
  headerCell: {
    fontWeight: 700,
  },
  cellDescription: {
    width: "46%",
  },
  cellQuantity: {
    width: "14%",
    textAlign: "right",
  },
  cellUnitPrice: {
    width: "20%",
    textAlign: "right",
  },
  cellTotal: {
    width: "20%",
    textAlign: "right",
    borderRightWidth: 0,
  },
  totals: {
    marginLeft: "58%",
    width: "42%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontWeight: 600,
  },
  totalAmount: {
    fontWeight: 700,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#d1d5db",
    paddingTop: 6,
    marginTop: 2,
  },
  valueText: {
    marginBottom: 3,
  },
});

const InvoiceDocument = ({ invoice }: { invoice: any }) => (
  <Document>
    <Page style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.businessName}>{invoice.business.name}</Text>
        </View>
        <View>
          <Text style={styles.invoiceLabel}>INVOICE</Text>
          <Text style={styles.metaText}>Invoice Number: {invoice.invoiceNumber}</Text>
          <Text style={styles.metaText}>Issue Date: {formatDate(invoice.issueDate)}</Text>
          <Text style={styles.metaText}>Due Date: {formatDate(invoice.dueDate)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client</Text>
        <Text style={styles.valueText}>
          {invoice.client.companyName || invoice.client.contactName}
        </Text>
        <Text style={styles.valueText}>{invoice.client.address || "-"}</Text>
        <Text style={styles.valueText}>{invoice.client.country || "-"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Line Items</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.cellDescription]}>
              Description
            </Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellQuantity]}>
              Quantity
            </Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellUnitPrice]}>
              Unit Price
            </Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellTotal]}>Total</Text>
          </View>
          {invoice.lineItems.map((item: any, index: number) => (
            <View key={item.id ?? `${item.description}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.cellDescription]}>{item.description}</Text>
              <Text style={[styles.cell, styles.cellQuantity]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.cellUnitPrice]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.cell, styles.cellTotal]}>
                {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, styles.totals]}>
        <Text style={styles.sectionTitle}>Totals</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text>{formatCurrency(invoice.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax Amount</Text>
          <Text>{formatCurrency(invoice.taxAmount)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.totalAmount}>Total Amount</Text>
          <Text style={styles.totalAmount}>{formatCurrency(invoice.totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Instructions</Text>
        <Text style={styles.valueText}>IBAN: {invoice.business.iban || "-"}</Text>
        <Text style={styles.valueText}>Reference: {invoice.invoiceNumber}</Text>
      </View>
    </Page>
  </Document>
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lineItems: true,
      business: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const doc = <InvoiceDocument invoice={invoice} />;
  const asPdf = pdf(doc);
  const pdfBuffer = await asPdf.toBuffer();

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`,
    },
  });
}
