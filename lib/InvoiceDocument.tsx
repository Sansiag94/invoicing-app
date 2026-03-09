import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";

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

const InvoiceDocument = ({ invoice }: { invoice: InvoiceWithRelations }) => (
  <Document>
    <Page style={styles.page}>
      <View style={styles.section}>
        <Text>{invoice.business.name}</Text>
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
        <Text>Subtotal: {invoice.subtotal.toFixed(2)}</Text>
        <Text>Tax: {invoice.taxAmount.toFixed(2)}</Text>
        <Text>Total: {invoice.totalAmount.toFixed(2)}</Text>
      </View>
    </Page>
  </Document>
);

export default InvoiceDocument;
