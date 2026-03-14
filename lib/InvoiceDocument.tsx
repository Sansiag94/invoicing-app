import React from "react";
/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { calculateInvoiceTotals, parsePostalAddress } from "@/lib/invoice";
import { generateSwissQRCodeRects, getSwissQRBillMetadata, type SwissQRBillMetadata } from "@/lib/qrbill";
import { getInvoiceSenderName, normalizeInvoiceSenderType } from "@/lib/business";
import { isSwissCountry } from "@/lib/countries";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    lineItems: true;
    business: true;
  };
}>;

const POINTS_PER_MM = 72 / 25.4;

function mm(value: number): number {
  return value * POINTS_PER_MM;
}

const FIRST_PAGE_ROWS_NO_QR = 14;
const NEXT_PAGE_ROWS_NO_QR = 24;
const MAX_ROWS_WITH_QR_ON_FIRST_PAGE = 6;

const PAGE_TOP_MARGIN = mm(25);
const PAGE_SIDE_MARGIN = mm(20);
const PAGE_BOTTOM_MARGIN = mm(25);
const QR_BILL_HEIGHT = mm(105);
const QR_CUT_LINE_SPACE = mm(4);
const QR_BILL_TOTAL_SPACE = QR_BILL_HEIGHT + QR_CUT_LINE_SPACE;
const QR_COLUMN_WIDTH = mm(46);
const PAYMENT_PART_GAP = mm(6);
const RECEIPT_WIDTH = mm(62);
const PAYMENT_PART_WIDTH = mm(148);

const styles = StyleSheet.create({
  page: {
    position: "relative",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
  },
  pageBody: {
    paddingTop: PAGE_TOP_MARGIN,
    paddingHorizontal: PAGE_SIDE_MARGIN,
    paddingBottom: PAGE_BOTTOM_MARGIN,
    flexGrow: 1,
  },
  pageBodyWithQrSpace: {
    paddingBottom: QR_BILL_TOTAL_SPACE + PAGE_BOTTOM_MARGIN,
  },
  pageBodyWithQrSpaceFlushBottom: {
    paddingBottom: QR_BILL_TOTAL_SPACE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: mm(16),
  },
  sellerCol: {
    width: "48%",
    paddingRight: mm(6),
  },
  businessMetaCol: {
    width: "36%",
    alignItems: "flex-start",
    marginTop: mm(28),
  },
  logo: {
    width: mm(24),
    height: mm(24),
    objectFit: "contain",
    marginBottom: mm(3.5),
  },
  sellerName: {
    fontSize: 13.5,
    fontWeight: "bold",
    marginBottom: mm(0.6),
  },
  sellerSecondary: {
    fontSize: 10,
    color: "#374151",
    marginBottom: mm(1),
  },
  bodyLine: {
    fontSize: 9.4,
    lineHeight: 1.35,
    marginBottom: mm(0.55),
  },
  infoLabel: {
    fontSize: 7.2,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: mm(1.2),
    letterSpacing: 0.3,
  },
  recipientName: {
    fontSize: 13.5,
    fontWeight: "bold",
    marginBottom: mm(0.6),
  },
  recipientSecondary: {
    fontSize: 10,
    color: "#374151",
    marginBottom: mm(1),
  },
  invoiceHero: {
    marginBottom: mm(8),
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: mm(1.3),
    letterSpacing: 0.2,
  },
  invoiceDate: {
    fontSize: 10,
    color: "#374151",
    marginBottom: mm(1.1),
  },
  invoiceSubject: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.35,
    marginBottom: mm(1.1),
  },
  invoiceDueDate: {
    fontSize: 10,
    color: "#6b7280",
  },
  tableWrap: {
    marginTop: mm(10),
    marginBottom: mm(4),
  },
  tableWrapContinuation: {
    marginTop: 0,
    marginBottom: mm(4),
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderBottomColor: "#111827",
    paddingBottom: mm(1.8),
    paddingHorizontal: mm(1.2),
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: mm(2.1),
    paddingHorizontal: mm(1.2),
  },
  tableCellText: {
    fontSize: 9.3,
  },
  colPos: { width: "8%" },
  colDesc: { width: "46%" },
  colQty: { width: "12%", textAlign: "left" },
  colUnit: { width: "16%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },
  totalsBox: {
    marginTop: mm(6),
    marginLeft: "auto",
    width: mm(80),
  },
  totalsRule: {
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: mm(3),
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: mm(1.4),
  },
  totalsLabel: {
    fontSize: 10,
    color: "#374151",
  },
  totalsValue: {
    fontSize: 10,
    color: "#374151",
  },
  totalDueLabel: {
    fontSize: 15.5,
    fontWeight: "bold",
  },
  totalDueValue: {
    fontSize: 15.5,
    fontWeight: "bold",
  },
  closingTextBlock: {
    marginTop: mm(6),
    width: mm(120),
  },
  closingText: {
    fontSize: 10,
    lineHeight: 1.35,
    color: "#374151",
  },
  cutLineWrap: {
    position: "relative",
    marginBottom: mm(1.5),
  },
  cutLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    borderTopStyle: "dashed",
  },
  qrBillSection: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: PAGE_BOTTOM_MARGIN,
    height: QR_BILL_TOTAL_SPACE,
  },
  qrBillSectionFlushBottom: {
    bottom: 0,
  },
  qrBillRow: {
    flexDirection: "row",
    height: QR_BILL_HEIGHT,
    paddingTop: mm(5),
  },
  receiptCol: {
    width: RECEIPT_WIDTH,
    paddingLeft: mm(4.5),
    paddingRight: mm(4.5),
    paddingBottom: mm(3),
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderRightStyle: "dashed",
  },
  paymentPartCol: {
    width: PAYMENT_PART_WIDTH,
    paddingLeft: mm(4.5),
    paddingRight: mm(4.5),
    paddingBottom: mm(3),
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: mm(5),
    color: "#000000",
  },
  labelSmall: {
    fontSize: 6,
    fontWeight: "bold",
    marginBottom: mm(0.7),
    color: "#000000",
  },
  paymentLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: mm(0.8),
    color: "#000000",
  },
  textSmall: {
    fontSize: 8,
    lineHeight: 1.18,
    marginBottom: mm(0.35),
    color: "#000000",
  },
  textMedium: {
    fontSize: 10,
    lineHeight: 1.16,
    marginBottom: mm(0.45),
    color: "#000000",
  },
  blockGap: {
    marginTop: mm(5),
  },
  paymentPartInner: {
    flexDirection: "row",
    flexGrow: 1,
  },
  qrCol: {
    width: QR_COLUMN_WIDTH,
    justifyContent: "flex-start",
  },
  qrBox: {
    width: QR_COLUMN_WIDTH,
    height: QR_COLUMN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsCol: {
    flexGrow: 1,
    paddingLeft: PAYMENT_PART_GAP,
    marginTop: mm(-10),
  },
  receiptMain: {
    flexGrow: 0,
    paddingTop: 0,
    minHeight: QR_COLUMN_WIDTH,
  },
  receiptFooter: {
    marginTop: mm(10),
    paddingTop: 0,
  },
  qrFooter: {
    marginTop: mm(10),
    paddingTop: 0,
    paddingBottom: 0,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: mm(0.8),
    color: "#000000",
  },
  amountValue: {
    fontSize: 10,
    lineHeight: 1.16,
    color: "#000000",
  },
  amountCol: {
    width: "44%",
  },
  acceptancePointWrap: {
    height: mm(7),
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  acceptancePoint: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000000",
  },
  qrFallback: {
    fontSize: 8,
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

function formatIban(value: string | null | undefined): string {
  if (!value) return "-";
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return compact.match(/.{1,4}/g)?.join(" ") ?? compact;
}

function normalizeLine(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function collectLines(...values: Array<string | null | undefined>): string[] {
  const lines: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeLine(value);
    if (normalized && !lines.includes(normalized)) {
      lines.push(normalized);
    }
  });

  return lines;
}

function toCompactAddressLines(address: ReturnType<typeof parsePostalAddress>): string[] {
  return [address.street, address.line2, [address.postalCode, address.city].filter(Boolean).join(" "), address.country]
    .filter((line) => line && line.trim().length > 0)
    .reduce<string[]>((acc, line) => {
      if (acc.length === 0) {
        acc.push(line);
        return acc;
      }

      const isCountryLine = line === address.country;
      if (isCountryLine) {
        const previousLine = acc[acc.length - 1] ?? "";
        acc[acc.length - 1] = previousLine ? `${previousLine}, ${line}` : line;
        return acc;
      }

      acc.push(line);
      return acc;
    }, []);
}

function toPaymentAddressLines(address: ReturnType<typeof parsePostalAddress>): string[] {
  return [address.street, address.line2, [address.postalCode, address.city].filter(Boolean).join(" ")]
    .filter((line) => line && line.trim().length > 0);
}

function buildDefaultInvoiceMessage(clientName: string, senderName: string): string {
  const firstName =
    clientName
      .split(" ")
      .find((part) => part.trim().length > 0) || "there";
  const senderFirstName =
    senderName
      .split(" ")
      .find((part) => part.trim().length > 0) || senderName;

  return `Hello ${firstName},\nThank you for your trust.\nPlease find the breakdown of the services below.\n\nBest regards,\n${senderFirstName}`;
}

function paginateWithoutQr<T>(items: T[]): T[][] {
  if (items.length <= FIRST_PAGE_ROWS_NO_QR) {
    return [items];
  }

  const pages: T[][] = [];
  let index = 0;

  pages.push(items.slice(index, index + FIRST_PAGE_ROWS_NO_QR));
  index += FIRST_PAGE_ROWS_NO_QR;

  while (index < items.length) {
    pages.push(items.slice(index, index + NEXT_PAGE_ROWS_NO_QR));
    index += NEXT_PAGE_ROWS_NO_QR;
  }

  return pages;
}

function paginateLineItems<T>(
  items: T[],
  includeQr: boolean
) : { pages: T[][]; qrPageIndex: number | null; closingPageIndex: number | null; standaloneQrPage: boolean } {
  if (!includeQr) {
    const pages = paginateWithoutQr(items);
    return {
      pages,
      qrPageIndex: null,
      closingPageIndex: pages.length - 1,
      standaloneQrPage: false,
    };
  }

  if (items.length <= MAX_ROWS_WITH_QR_ON_FIRST_PAGE) {
    return {
      pages: [items],
      qrPageIndex: 0,
      closingPageIndex: 0,
      standaloneQrPage: false,
    };
  }

  const pages = paginateWithoutQr(items);
  return {
    pages,
    qrPageIndex: null,
    closingPageIndex: pages.length - 1,
    standaloneQrPage: true,
  };
}

function InvoiceLineItemsTable(props: {
  lineItems: InvoiceWithRelations["lineItems"];
  startIndex: number;
  continuation?: boolean;
}) {
  return (
    <View style={props.continuation ? styles.tableWrapContinuation : styles.tableWrap}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colPos]}>Pos.</Text>
        <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
        <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
        <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit price</Text>
        <Text style={[styles.tableHeaderText, styles.colTotal]}>Amount</Text>
      </View>

      {props.lineItems.map((item, index) => (
        <View key={item.id} style={styles.tableRow}>
          <Text style={[styles.tableCellText, styles.colPos]}>{props.startIndex + index}</Text>
          <Text style={[styles.tableCellText, styles.colDesc]}>{item.description}</Text>
          <Text style={[styles.tableCellText, styles.colQty]}>{formatQuantity(item.quantity)}</Text>
          <Text style={[styles.tableCellText, styles.colUnit]}>{formatMoney(item.unitPrice)}</Text>
          <Text style={[styles.tableCellText, styles.colTotal]}>{formatMoney(item.quantity * item.unitPrice)}</Text>
        </View>
      ))}
    </View>
  );
}

const InvoiceDocument = ({
  invoice,
  senderPreferences,
}: {
  invoice: InvoiceWithRelations;
  senderPreferences?: {
    ownerName: string | null;
    invoiceSenderType: "company" | "owner";
  };
}) => {
  const shouldRenderQRSection =
    isSwissCountry(invoice.client.country) && (invoice.currency === "CHF" || invoice.currency === "EUR");
  const canGenerateQRCode =
    shouldRenderQRSection &&
    typeof invoice.business.iban === "string" &&
    invoice.business.iban.trim().length > 0;

  const senderName = getInvoiceSenderName({
    ...invoice.business,
    ownerName: senderPreferences?.ownerName ?? invoice.business.ownerName ?? null,
    invoiceSenderType: senderPreferences?.invoiceSenderType ?? invoice.business.invoiceSenderType ?? "company",
  });
  const senderType = normalizeInvoiceSenderType(
    senderPreferences?.invoiceSenderType ?? invoice.business.invoiceSenderType ?? "company"
  );

  const businessAddress = parsePostalAddress(invoice.business.address, invoice.business.country);
  const clientAddress = parsePostalAddress(invoice.client.address, invoice.client.country);
  const senderBusinessName = normalizeLine(invoice.business.name) ?? normalizeLine(senderName) ?? "Business";
  const senderOwnerName = normalizeLine(senderPreferences?.ownerName ?? invoice.business.ownerName ?? null);
  const sellerSecondaryName = senderOwnerName && senderOwnerName !== senderBusinessName ? senderOwnerName : null;
  const paymentRecipientName = normalizeLine(senderName) ?? senderBusinessName;

  const clientCompanyName = normalizeLine(invoice.client.companyName);
  const clientContactName = normalizeLine(invoice.client.contactName);
  const clientPrimaryName = clientCompanyName ?? clientContactName ?? invoice.client.email ?? "Client";
  const clientSecondaryName =
    clientCompanyName && clientContactName && clientContactName !== clientPrimaryName ? clientContactName : null;

  const businessEmail = normalizeLine(invoice.business.email);
  const businessPhone = normalizeLine(invoice.business.phone);
  const businessWebsite = normalizeLine(invoice.business.website);
  const headerPrimaryName = senderBusinessName;
  const headerSecondaryName = sellerSecondaryName;

  const businessHeaderLines = collectLines(...toCompactAddressLines(businessAddress));
  const sellerContactLines = collectLines(businessEmail, businessPhone);
  const clientLines = collectLines(clientPrimaryName, clientSecondaryName, ...toCompactAddressLines(clientAddress));
  const creditorLines =
    senderType === "owner"
      ? collectLines(paymentRecipientName, ...toPaymentAddressLines(businessAddress))
      : collectLines(senderBusinessName, sellerSecondaryName, ...toPaymentAddressLines(businessAddress));
  const debtorLines = collectLines(clientPrimaryName, clientSecondaryName, ...toPaymentAddressLines(clientAddress));

  const { pages, qrPageIndex, closingPageIndex, standaloneQrPage } = paginateLineItems(
    invoice.lineItems,
    shouldRenderQRSection
  );
  const totals = calculateInvoiceTotals(invoice.lineItems);
  const subtotal = totals.subtotal;
  const taxAmount = totals.taxAmount;
  const totalAmountDue = totals.totalAmount;

  const invoiceForQR = {
    ...invoice,
    totalAmount: totalAmountDue,
  };

  const businessForQR = {
    ...invoice.business,
    name: paymentRecipientName,
  };

  let qrRects: Array<{ x: number; y: number; width: number; height: number; fill: string }> = [];
  let qrMetadata: SwissQRBillMetadata | null = null;

  if (canGenerateQRCode) {
    try {
      qrMetadata = getSwissQRBillMetadata(invoiceForQR, businessForQR);
      qrRects = generateSwissQRCodeRects(invoiceForQR, businessForQR, invoice.client);
    } catch (error) {
      console.error("Failed to generate Swiss QR code:", error);
      qrMetadata = null;
      qrRects = [];
    }
  }

  const paymentAccount = qrMetadata ? formatIban(qrMetadata.account) : formatIban(invoice.business.iban);
  const additionalInformation = qrMetadata?.additionalInformation || invoice.invoiceNumber;

  const messageText = normalizeLine(invoice.notes) ?? buildDefaultInvoiceMessage(clientPrimaryName, senderName);
  const pdfTitle = buildInvoicePdfFilename(invoice.invoiceNumber).replace(/\.pdf$/i, "");

  return (
    <Document title={pdfTitle}>
      {pages.map((lineItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isQrPage = qrPageIndex !== null && pageIndex === qrPageIndex;
        const shouldRenderClosingSections = pageIndex === closingPageIndex;
        const startIndex = pages.slice(0, pageIndex).reduce((sum, pageItems) => sum + pageItems.length, 1);
        const pageBodyStyles: Array<
          typeof styles.pageBody | typeof styles.pageBodyWithQrSpace | typeof styles.pageBodyWithQrSpaceFlushBottom
        > = [styles.pageBody];

        if (isQrPage) {
          pageBodyStyles.push(styles.pageBodyWithQrSpaceFlushBottom);
        }

        return (
          <Page key={`invoice-page-${pageIndex}`} size="A4" style={styles.page}>
            <View style={pageBodyStyles} wrap={false}>
              {isFirstPage ? (
                <>
                  <View style={styles.header}>
                    <View style={styles.sellerCol}>
                      {invoice.business.logoUrl ? <Image style={styles.logo} src={invoice.business.logoUrl} /> : null}
                      <Text style={styles.sellerName}>{headerPrimaryName}</Text>
                      {headerSecondaryName ? <Text style={styles.sellerSecondary}>{headerSecondaryName}</Text> : null}
                      {businessHeaderLines.map((line, index) => (
                        <Text key={`seller-${index}`} style={styles.bodyLine}>
                          {line}
                        </Text>
                      ))}
                      {sellerContactLines.map((line, index) => (
                        <Text key={`seller-contact-${index}`} style={styles.bodyLine}>
                          {line}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.businessMetaCol}>
                      <Text style={styles.recipientName}>{clientPrimaryName}</Text>
                      {clientSecondaryName ? (
                        <Text style={styles.recipientSecondary}>{clientSecondaryName}</Text>
                      ) : null}
                      {toCompactAddressLines(clientAddress).map((line, index) => (
                        <Text key={`client-${index}`} style={styles.bodyLine}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  </View>

                  <View style={styles.invoiceHero}>
                    <Text style={styles.invoiceTitle}>Invoice: {invoice.invoiceNumber}</Text>
                    <Text style={styles.invoiceDate}>{formatDate(invoice.issueDate)}</Text>
                    <Text style={styles.invoiceDueDate}>Due date: {formatDate(invoice.dueDate)}</Text>
                    {invoice.subject ? <Text style={styles.invoiceSubject}>Subject: {invoice.subject}</Text> : null}
                  </View>
                </>
              ) : null}

              {lineItems.length > 0 ? (
                <InvoiceLineItemsTable
                  lineItems={lineItems}
                  startIndex={startIndex}
                  continuation={!isFirstPage}
                />
              ) : null}

              {shouldRenderClosingSections ? (
                <>
                  <View style={styles.totalsBox}>
                    <View style={styles.totalsRule}>
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Subtotal</Text>
                        <Text style={styles.totalsValue}>
                          {invoice.currency} {formatMoney(subtotal)}
                        </Text>
                      </View>
                      {taxAmount > 0 ? (
                        <View style={styles.totalsRow}>
                          <Text style={styles.totalsLabel}>VAT</Text>
                          <Text style={styles.totalsValue}>
                            {invoice.currency} {formatMoney(taxAmount)}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalDueLabel}>Total</Text>
                        <Text style={styles.totalDueValue}>
                          {invoice.currency} {formatMoney(totalAmountDue)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.closingTextBlock}>
                    <Text style={styles.closingText}>{messageText}</Text>
                  </View>

                </>
              ) : null}
            </View>

            {isQrPage ? (
              <View style={[styles.qrBillSection, styles.qrBillSectionFlushBottom]} wrap={false}>
                <View style={styles.cutLineWrap}>
                  <View style={styles.cutLine} />
                </View>

                <View style={styles.qrBillRow}>
                  <View style={styles.receiptCol}>
                    <Text style={styles.qrTitle}>Receipt</Text>

                    <View style={styles.receiptMain}>
                      <Text style={styles.labelSmall}>Account / Payable to</Text>
                      <Text style={styles.textSmall}>{paymentAccount}</Text>
                      {creditorLines.map((line, index) => (
                        <Text key={`receipt-creditor-${index}`} style={styles.textSmall}>
                          {line}
                        </Text>
                      ))}

                      <Text style={[styles.labelSmall, styles.blockGap]}>Payable by</Text>
                      {debtorLines.map((line, index) => (
                        <Text key={`receipt-debtor-${index}`} style={styles.textSmall}>
                          {line}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.receiptFooter}>
                      <View style={styles.amountRow}>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>Currency</Text>
                          <Text style={styles.amountValue}>{invoice.currency}</Text>
                        </View>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>Amount</Text>
                          <Text style={styles.amountValue}>{formatMoney(totalAmountDue)}</Text>
                        </View>
                      </View>
                      <View style={styles.acceptancePointWrap}>
                        <Text style={styles.acceptancePoint}>Acceptance point</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.paymentPartCol}>
                    <Text style={styles.qrTitle}>Payment part</Text>

                    <View style={styles.paymentPartInner}>
                      <View style={styles.qrCol}>
                        <View style={styles.qrBox}>
                          {qrRects.length > 0 ? (
                            <Svg width={122} height={122} viewBox="0 0 46 46">
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
                              <Rect x={19.3} y={19.3} width={7.4} height={7.4} fill="#000000" />
                              <Rect x={21.95} y={20.4} width={2.1} height={5.2} fill="#ffffff" />
                              <Rect x={20.4} y={21.95} width={5.2} height={2.1} fill="#ffffff" />
                            </Svg>
                          ) : (
                            <Text style={styles.qrFallback}>QR code unavailable</Text>
                          )}
                        </View>

                        <View style={styles.qrFooter}>
                          <View style={styles.amountRow}>
                            <View style={styles.amountCol}>
                              <Text style={styles.amountLabel}>Currency</Text>
                              <Text style={styles.amountValue}>{invoice.currency}</Text>
                            </View>
                            <View style={styles.amountCol}>
                              <Text style={styles.amountLabel}>Amount</Text>
                              <Text style={styles.amountValue}>{formatMoney(totalAmountDue)}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={styles.detailsCol}>
                        <Text style={styles.paymentLabel}>Account / Payable to</Text>
                        <Text style={styles.textMedium}>{paymentAccount}</Text>
                        {creditorLines.map((line, index) => (
                          <Text key={`payment-creditor-${index}`} style={styles.textMedium}>
                            {line}
                          </Text>
                        ))}

                        <Text style={[styles.paymentLabel, styles.blockGap]}>Additional information</Text>
                        <Text style={styles.textMedium}>{additionalInformation}</Text>

                        <Text style={[styles.paymentLabel, styles.blockGap]}>Payable by</Text>
                        {debtorLines.map((line, index) => (
                          <Text key={`payment-debtor-${index}`} style={styles.textMedium}>
                            {line}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </Page>
        );
      })}
      {standaloneQrPage ? (
        <Page size="A4" style={styles.page}>
          <View style={[styles.pageBody, styles.pageBodyWithQrSpaceFlushBottom]} wrap={false} />
          <View style={[styles.qrBillSection, styles.qrBillSectionFlushBottom]} wrap={false}>
            <View style={styles.cutLineWrap}>
              <View style={styles.cutLine} />
            </View>

            <View style={styles.qrBillRow}>
              <View style={styles.receiptCol}>
                <Text style={styles.qrTitle}>Receipt</Text>

                <View style={styles.receiptMain}>
                  <Text style={styles.labelSmall}>Account / Payable to</Text>
                  <Text style={styles.textSmall}>{paymentAccount}</Text>
                  {creditorLines.map((line, index) => (
                    <Text key={`qr-only-receipt-creditor-${index}`} style={styles.textSmall}>
                      {line}
                    </Text>
                  ))}

                  <Text style={[styles.labelSmall, styles.blockGap]}>Payable by</Text>
                  {debtorLines.map((line, index) => (
                    <Text key={`qr-only-receipt-debtor-${index}`} style={styles.textSmall}>
                      {line}
                    </Text>
                  ))}
                </View>

                <View style={styles.receiptFooter}>
                  <View style={styles.amountRow}>
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>Currency</Text>
                      <Text style={styles.amountValue}>{invoice.currency}</Text>
                    </View>
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>Amount</Text>
                      <Text style={styles.amountValue}>{formatMoney(totalAmountDue)}</Text>
                    </View>
                  </View>
                  <View style={styles.acceptancePointWrap}>
                    <Text style={styles.acceptancePoint}>Acceptance point</Text>
                  </View>
                </View>
              </View>

              <View style={styles.paymentPartCol}>
                <Text style={styles.qrTitle}>Payment part</Text>

                <View style={styles.paymentPartInner}>
                  <View style={styles.qrCol}>
                    <View style={styles.qrBox}>
                      {qrRects.length > 0 ? (
                        <Svg width={122} height={122} viewBox="0 0 46 46">
                          {qrRects.map((rect, index) => (
                            <Rect
                              key={`qr-only-${index}`}
                              x={rect.x}
                              y={rect.y}
                              width={rect.width}
                              height={rect.height}
                              fill={rect.fill}
                            />
                          ))}
                          <Rect x={19.3} y={19.3} width={7.4} height={7.4} fill="#000000" />
                          <Rect x={21.95} y={20.4} width={2.1} height={5.2} fill="#ffffff" />
                          <Rect x={20.4} y={21.95} width={5.2} height={2.1} fill="#ffffff" />
                        </Svg>
                      ) : (
                        <Text style={styles.qrFallback}>QR code unavailable</Text>
                      )}
                    </View>

                    <View style={styles.qrFooter}>
                      <View style={styles.amountRow}>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>Currency</Text>
                          <Text style={styles.amountValue}>{invoice.currency}</Text>
                        </View>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>Amount</Text>
                          <Text style={styles.amountValue}>{formatMoney(totalAmountDue)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsCol}>
                    <Text style={styles.paymentLabel}>Account / Payable to</Text>
                    <Text style={styles.textMedium}>{paymentAccount}</Text>
                    {creditorLines.map((line, index) => (
                      <Text key={`qr-only-payment-creditor-${index}`} style={styles.textMedium}>
                        {line}
                      </Text>
                    ))}

                    <Text style={[styles.paymentLabel, styles.blockGap]}>Additional information</Text>
                    <Text style={styles.textMedium}>{additionalInformation}</Text>

                    <Text style={[styles.paymentLabel, styles.blockGap]}>Payable by</Text>
                    {debtorLines.map((line, index) => (
                      <Text key={`qr-only-payment-debtor-${index}`} style={styles.textMedium}>
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Page>
      ) : null}
    </Document>
  );
};

export default InvoiceDocument;
