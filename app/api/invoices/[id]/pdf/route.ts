import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PDFDownloadLink, Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { margin: 30 },
  section: { marginBottom: 10 },
  table: { margin: "auto", display: "table", width: "auto", borderStyle: "solid" },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableCol: { width: "25%", borderStyle: "solid", borderWidth: 1, borderColor: "black" },
  tableCell: { margin: 5, fontSize: 10 },
});

const InvoiceDocument = ({ invoice }) => (
  <Document>
    <Page style={styles.page}>
      <View style={styles.section}>
        <Text>{invoice.business.name}</Text>
        <Text>Client: {invoice.client.name}</Text>
        <Text>Invoice Number: {invoice.invoiceNumber}</Text>
        <Text>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</Text>
        <Text>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={styles.tableCol}>Description</Text>
          <Text style={styles.tableCol}> Qty </Text>
          <Text style={styles.tableCol}>Unit Price</Text>
          <Text style={styles.tableCol}>Tax</Text>
          <Text style={styles.tableCol}>Total</Text>
        </View>
        {invoice.lineItems.map(item => (
          <View style={styles.tableRow} key={item.id}>
            <Text style={styles.tableCell}>{item.description}</Text>
            <Text style={styles.tableCell}>{item.quantity}</Text>
            <Text style={styles.tableCell}>{item.unitPrice}</Text>
            <Text style={styles.tableCell}>{item.taxRate}</Text>
            <Text style={styles.tableCell}>{(item.quantity * item.unitPrice).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text>Subtotal: {(invoice.subtotal).toFixed(2)}</Text>
        <Text>Tax: {(invoice.taxAmount).toFixed(2)}</Text>
        <Text>Total Amount: {(invoice.totalAmount).toFixed(2)}</Text>
      </View>
    </Page>
  </Document>
);

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lineItems: true,
      business: true
    }
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const pdfDoc = <InvoiceDocument invoice={invoice} />;
  const pdfBuffer = await pdf(pdfDoc).toBuffer(); // Generate the PDF buffer

  return new Response(pdfBuffer, {
    headers: { "Content-Type": "application/pdf" }
  });
}