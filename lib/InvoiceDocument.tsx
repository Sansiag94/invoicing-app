import React from "react";
/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { generateSwissQRCodeRects } from "@/lib/qrbill";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    lineItems: true;
    business: true;
  };
}>;

const FIRST_PAGE_ROWS = 18;
const MIDDLE_PAGE_ROWS = 24;
const LAST_PAGE_RESERVED_ROWS = 4;

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 44,
    paddingBottom: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
  },
  topBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logo: {
    width: 82,
    height: 82,
    objectFit: "contain",
  },
  senderBlock: {
    width: "50%",
    paddingRight: 12,
  },
  clientBlock: {
    width: "42%",
  },
  nameStrong: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827",
  },
  blockLine: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 2,
  },
  invoiceMeta: {
    marginTop: 8,
    marginBottom: 14,
  },
  invoiceMetaTitle: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 4,
  },
  invoiceNo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  tableWrap: {
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#4b5563",
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  colDescription: { width: "48%" },
  colPrice: { width: "16%", textAlign: "right" },
  colUnits: { width: "13%", textAlign: "right" },
  colTotal: { width: "23%", textAlign: "right" },
  totalSummaryWrap: {
    alignSelf: "flex-end",
    width: 230,
    marginTop: 14,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 8,
  },
  totalSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  notesBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 7,
    backgroundColor: "#f9fafb",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  notesText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: "#1f2937",
  },
  bottomGrow: {
    flexGrow: 1,
  },
  paymentSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    borderTopStyle: "dashed",
    paddingTop: 10,
    minHeight: 260,
  },
  paymentColumns: {
    flexDirection: "row",
    minHeight: 238,
  },
  receiptCol: {
    width: "27%",
    paddingTop: 6,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#111827",
    borderRightStyle: "dashed",
  },
  paymentPartCol: {
    width: "73%",
    paddingLeft: 12,
    paddingTop: 6,
  },
  paymentTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  paymentSubtitle: {
    fontSize: 8.8,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#111827",
  },
  paymentLine: {
    fontSize: 8.8,
    color: "#111827",
    marginBottom: 1,
  },
  qrAndDetails: {
    flexDirection: "row",
    marginBottom: 8,
  },
  qrBox: {
    width: 164,
    height: 164,
    borderWidth: 1,
    borderColor: "#6b7280",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailsCol: {
    flexGrow: 1,
    paddingTop: 2,
  },
  receiptBottom: {
    marginTop: 10,
  },
  amountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  amountCol: {
    width: "48%",
  },
  amountLabel: {
    fontSize: 8.3,
    color: "#111827",
    marginBottom: 2,
    fontWeight: "bold",
  },
  amountValue: {
    fontSize: 10,
    color: "#111827",
  },
  qrFallback: {
    fontSize: 8.8,
    color: "#b91c1c",
  },
});

function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function splitAddress(address: string | null | undefined): string[] {
  if (!address) return [];
  return address
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function paginateLineItems<T>(items: T[]): T[][] {
  if (items.length <= FIRST_PAGE_ROWS) {
    return [items];
  }

  const pages: T[][] = [];
  let index = 0;

  pages.push(items.slice(index, index + FIRST_PAGE_ROWS));
  index += FIRST_PAGE_ROWS;

  while (index < items.length) {
    const remaining = items.length - index;
    if (remaining <= LAST_PAGE_RESERVED_ROWS) {
      pages.push(items.slice(index));
      break;
    }

    const chunkSize = Math.min(MIDDLE_PAGE_ROWS, remaining - LAST_PAGE_RESERVED_ROWS);
    pages.push(items.slice(index, index + chunkSize));
    index += chunkSize;
  }

  return pages;
}

function InvoiceTable(props: {
  lineItems: InvoiceWithRelations["lineItems"];
}) {
  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
        <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price</Text>
        <Text style={[styles.tableHeaderCell, styles.colUnits]}>Units</Text>
        <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
      </View>

      {props.lineItems.map((item) => (
        <View key={item.id} style={styles.tableRow} wrap={false}>
          <Text style={[styles.colDescription]}>{item.description}</Text>
          <Text style={[styles.colPrice]}>{item.unitPrice.toFixed(2)}</Text>
          <Text style={[styles.colUnits]}>{formatQuantity(item.quantity)}</Text>
          <Text style={[styles.colTotal]}>{(item.quantity * item.unitPrice).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

const InvoiceDocument = ({ invoice }: { invoice: InvoiceWithRelations }) => {
  const shouldRenderQRSection =
    invoice.currency === "CHF" &&
    typeof invoice.business.iban === "string" &&
    invoice.business.iban.trim().length > 0;

  const clientName =
    invoice.client.companyName || invoice.client.contactName || invoice.client.email || "Client";

  const businessAddressLines = splitAddress(invoice.business.address);
  const clientAddressLines = splitAddress(invoice.client.address);
  const pages = paginateLineItems(invoice.lineItems);
  const totalPages = pages.length;

  let qrRects: Array<{ x: number; y: number; width: number; height: number; fill: string }> = [];

  if (shouldRenderQRSection) {
    try {
      qrRects = generateSwissQRCodeRects(invoice, invoice.business, invoice.client);
    } catch (error) {
      console.error("Failed to generate Swiss QR code:", error);
      qrRects = [];
    }
  }

  return (
    <Document>
      {pages.map((lineItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <Page key={`invoice-page-${pageIndex}`} size="A4" style={styles.page}>
            {isFirstPage ? (
              <>
                <View style={styles.topBand}>
                  {invoice.business.logoUrl ? <Image style={styles.logo} src={invoice.business.logoUrl} /> : <View />}
                  <View />
                </View>

                <View style={styles.topBand}>
                  <View style={styles.senderBlock}>
                    <Text style={styles.nameStrong}>{invoice.business.name}</Text>
                    {businessAddressLines.map((line, index) => (
                      <Text key={`business-address-${index}`} style={styles.blockLine}>
                        {line}
                      </Text>
                    ))}
                    <Text style={styles.blockLine}>{invoice.business.country}</Text>
                    <Text style={styles.blockLine}>{invoice.business.iban || ""}</Text>
                  </View>

                  <View style={styles.clientBlock}>
                    <Text style={styles.nameStrong}>{clientName}</Text>
                    {invoice.client.contactName && invoice.client.companyName ? (
                      <Text style={styles.blockLine}>{invoice.client.contactName}</Text>
                    ) : null}
                    {clientAddressLines.map((line, index) => (
                      <Text key={`client-address-${index}`} style={styles.blockLine}>
                        {line}
                      </Text>
                    ))}
                    <Text style={styles.blockLine}>{invoice.client.country}</Text>
                  </View>
                </View>

                <View style={styles.invoiceMeta}>
                  <Text style={styles.invoiceMetaTitle}>{formatDate(invoice.issueDate)}</Text>
                  <Text style={styles.invoiceNo}>Invoice: {invoice.invoiceNumber}</Text>
                </View>
              </>
            ) : null}

            <InvoiceTable lineItems={lineItems} />

            {isLastPage ? (
              <>
                <View style={styles.totalSummaryWrap}>
                  <View style={styles.totalSummaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {invoice.currency} {formatMoney(invoice.totalAmount)}
                    </Text>
                  </View>
                </View>

                {invoice.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{invoice.notes}</Text>
                  </View>
                ) : null}

                {shouldRenderQRSection ? <View style={styles.bottomGrow} /> : null}

                {shouldRenderQRSection ? (
                  <View style={styles.paymentSection} wrap={false}>
                    <View style={styles.paymentColumns}>
                      <View style={styles.receiptCol}>
                        <Text style={styles.paymentTitle}>Receipt</Text>

                        <Text style={styles.paymentSubtitle}>Account / Payable to</Text>
                        <Text style={styles.paymentLine}>{invoice.business.iban || "-"}</Text>
                        <Text style={styles.paymentLine}>{invoice.business.name}</Text>
                        {businessAddressLines.map((line, index) => (
                          <Text key={`receipt-business-${index}`} style={styles.paymentLine}>
                            {line}
                          </Text>
                        ))}

                        <View style={styles.receiptBottom}>
                          <Text style={styles.paymentSubtitle}>Payable by</Text>
                          <Text style={styles.paymentLine}>{clientName}</Text>
                          {clientAddressLines.map((line, index) => (
                            <Text key={`receipt-client-${index}`} style={styles.paymentLine}>
                              {line}
                            </Text>
                          ))}
                        </View>

                        <View style={styles.amountsRow}>
                          <View style={styles.amountCol}>
                            <Text style={styles.amountLabel}>Currency</Text>
                            <Text style={styles.amountValue}>{invoice.currency}</Text>
                          </View>
                          <View style={styles.amountCol}>
                            <Text style={styles.amountLabel}>Amount</Text>
                            <Text style={styles.amountValue}>{formatMoney(invoice.totalAmount)}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.paymentPartCol}>
                        <Text style={styles.paymentTitle}>Payment part</Text>
                        <View style={styles.qrAndDetails}>
                          <View style={styles.qrBox}>
                            {qrRects.length > 0 ? (
                              <Svg width={150} height={150} viewBox="0 0 46 46">
                                {qrRects.map((rect, index) => (
                                  <Rect
                                    key={`qr-${index}`}
                                    x={rect.x}
                                    y={rect.y}
                                    width={rect.width}
                                    height={rect.height}
                                    fill={rect.fill}
                                  />
                                ))}
                              </Svg>
                            ) : (
                              <Text style={styles.qrFallback}>QR code unavailable</Text>
                            )}
                          </View>

                          <View style={styles.detailsCol}>
                            <Text style={styles.paymentSubtitle}>Account / Payable to</Text>
                            <Text style={styles.paymentLine}>{invoice.business.iban || "-"}</Text>
                            <Text style={styles.paymentLine}>{invoice.business.name}</Text>
                            {businessAddressLines.map((line, index) => (
                              <Text key={`payment-business-${index}`} style={styles.paymentLine}>
                                {line}
                              </Text>
                            ))}

                            <View style={{ marginTop: 6 }}>
                              <Text style={styles.paymentSubtitle}>Additional information</Text>
                              <Text style={styles.paymentLine}>{invoice.invoiceNumber}</Text>
                            </View>

                            <View style={{ marginTop: 6 }}>
                              <Text style={styles.paymentSubtitle}>Payable by</Text>
                              <Text style={styles.paymentLine}>{clientName}</Text>
                              {clientAddressLines.map((line, index) => (
                                <Text key={`payment-client-${index}`} style={styles.paymentLine}>
                                  {line}
                                </Text>
                              ))}
                            </View>
                          </View>
                        </View>

                        <View style={styles.amountsRow}>
                          <View style={styles.amountCol}>
                            <Text style={styles.amountLabel}>Currency</Text>
                            <Text style={styles.amountValue}>{invoice.currency}</Text>
                          </View>
                          <View style={styles.amountCol}>
                            <Text style={styles.amountLabel}>Amount</Text>
                            <Text style={styles.amountValue}>{formatMoney(invoice.totalAmount)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </Page>
        );
      })}
    </Document>
  );
};

export default InvoiceDocument;
