import React from "react";
/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { generateQRBill } from "@/lib/qrbill";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    lineItems: true;
    business: true;
  };
}>;

const styles = StyleSheet.create({
  page: { padding: 30 },
  section: { marginBottom: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    width: "70%",
  },
  logo: {
    width: 90,
    height: 90,
    objectFit: "contain",
  },
  muted: {
    color: "#555",
    fontSize: 10,
  },
  qrSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 10,
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  qrHelpText: {
    fontSize: 9,
    color: "#444",
    marginBottom: 2,
  },
  qrImage: {
    marginTop: 8,
    width: 520,
    height: 260,
    objectFit: "contain",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: { flexDirection: "row" },
  tableColHeader: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    backgroundColor: "#bdbdbd",
    fontWeight: "bold",
    padding: 5,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCol: {
    width: "20%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
});

const InvoiceDocument = ({ invoice }: { invoice: InvoiceWithRelations }) => {
  const shouldRenderQRSection =
    invoice.currency === "CHF" &&
    typeof invoice.business.iban === "string" &&
    invoice.business.iban.trim().length > 0;

  let qrBillDataUri: string | null = null;

  if (shouldRenderQRSection) {
    try {
      const qrBillSvg = generateQRBill(invoice, invoice.business, invoice.client);
      qrBillDataUri = `data:image/svg+xml;base64,${Buffer.from(qrBillSvg).toString("base64")}`;
    } catch (error) {
      console.error("Failed to generate Swiss QR-Bill section:", error);
      qrBillDataUri = null;
    }
  }

  return (
    <Document>
      <Page style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text>{invoice.business.name}</Text>
            <Text style={styles.muted}>{invoice.business.address || "-"}</Text>
            <Text style={styles.muted}>VAT: {invoice.business.vatNumber || "-"}</Text>
            <Text style={styles.muted}>IBAN: {invoice.business.iban || "-"}</Text>
          </View>
          {invoice.business.logoUrl ? (
            <Image style={styles.logo} src={invoice.business.logoUrl} />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text>Client: {invoice.client.companyName || invoice.client.contactName}</Text>
          <Text>Invoice Number: {invoice.invoiceNumber}</Text>
          <Text>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</Text>
          <Text>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Description</Text>
            <Text style={styles.tableColHeader}>Qty</Text>
            <Text style={styles.tableColHeader}>Unit Price</Text>
            <Text style={styles.tableColHeader}>Tax</Text>
            <Text style={styles.tableColHeader}>Total</Text>
          </View>
          {invoice.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.tableCol}>{item.description}</Text>
              <Text style={styles.tableCol}>{item.quantity}</Text>
              <Text style={styles.tableCol}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={styles.tableCol}>{item.taxRate}</Text>
              <Text style={styles.tableCol}>{(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text>
            Subtotal: {invoice.currency} {invoice.subtotal.toFixed(2)}
          </Text>
          <Text>
            Tax: {invoice.currency} {invoice.taxAmount.toFixed(2)}
          </Text>
          <Text>
            Total: {invoice.currency} {invoice.totalAmount.toFixed(2)}
          </Text>
        </View>

        {shouldRenderQRSection && qrBillDataUri ? (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Swiss QR-Bill Payment Section</Text>
            <Text style={styles.qrHelpText}>
              Scan the QR code below in your banking app to pay this invoice.
            </Text>
            <Text style={styles.qrHelpText}>Reference number: {invoice.invoiceNumber}</Text>
            <Image style={styles.qrImage} src={qrBillDataUri} />
          </View>
        ) : null}
      </Page>
    </Document>
  );
};

export default InvoiceDocument;
