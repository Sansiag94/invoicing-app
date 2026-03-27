import React from "react";
/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Link, Page, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { calculateInvoiceTotals, parsePostalAddress } from "@/lib/invoice";
import { generateSwissQRCodeRects, getSwissQRBillMetadata, type SwissQRBillMetadata } from "@/lib/qrbill";
import { getInvoiceSenderName, normalizeInvoiceSenderType } from "@/lib/business";
import { isSwissCountry } from "@/lib/countries";
import {
  buildDefaultInvoiceMessage,
  buildInvoiceAdditionalInformation,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceStrings,
  normalizeInvoiceLanguage,
} from "@/lib/invoiceLanguage";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";
import { buildPublicInvoiceLinkFromToken } from "@/lib/publicInvoiceLink";

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

type PreparedLineItemRow = {
  id: string;
  indexLabel: string;
  descriptionText: string;
  rowHeight: number;
  quantityText: string;
  unitPriceText: string;
  amountText: string;
};

function wrapTextLines(value: string, maxCharsPerLine: number): string[] {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (currentLine && nextLine.length > maxCharsPerLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    currentLine = nextLine;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function buildPreparedLineItemRows(
  lineItems: InvoiceWithRelations["lineItems"],
  startIndex: number,
  language: ReturnType<typeof normalizeInvoiceLanguage>
): PreparedLineItemRow[] {
  return lineItems.map((item, index) => {
    const descriptionLines = wrapTextLines(item.description, 38);
    const descriptionText = descriptionLines.join("\n");
    const rowHeight = Math.max(TABLE_ROW_MIN_HEIGHT, descriptionLines.length * TABLE_TEXT_LINE_HEIGHT + mm(2));

    return {
      id: item.id,
      indexLabel: String(startIndex + index),
      descriptionText,
      rowHeight,
      quantityText: formatQuantity(item.quantity),
      unitPriceText: formatInvoiceMoney(item.unitPrice, language),
      amountText: formatInvoiceMoney(item.quantity * item.unitPrice, language),
    };
  });
}

function buildMessageLines(value: string): string[] {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line) => (line.trim().length === 0 ? [""] : wrapTextLines(line, 42)));
}

function measureMessageHeight(lines: string[]): number {
  return lines.reduce((total, line) => total + (line.trim().length === 0 ? mm(3.5) : 14), 0);
}

function measureNoteBoxHeight(value: string | null): number {
  if (!value) {
    return 0;
  }

  return measureMessageHeight(buildMessageLines(value)) + mm(6);
}

function measureBlockHeight(lineCount: number, lineHeight: number, gap: number): number {
  if (lineCount <= 0) {
    return 0;
  }

  return lineCount * lineHeight + Math.max(0, lineCount - 1) * gap;
}

const FIRST_PAGE_ROWS_NO_QR = 14;
const NEXT_PAGE_ROWS_NO_QR = 24;
const A4_PAGE_HEIGHT = mm(297);
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
const CONTENT_WIDTH = mm(170);
const COL_POS_WIDTH = mm(12);
const COL_DESC_WIDTH = mm(86);
const COL_QTY_WIDTH = mm(18);
const COL_UNIT_WIDTH = mm(27);
const COL_TOTAL_WIDTH = mm(27);
const TABLE_HEADER_HEIGHT = mm(7);
const TABLE_ROW_MIN_HEIGHT = mm(8.5);
const TABLE_TEXT_LINE_HEIGHT = 12;
const SELLER_BLOCK_WIDTH = mm(82);
const RECIPIENT_BLOCK_WIDTH = mm(58);
const RECIPIENT_LEFT = PAGE_SIDE_MARGIN + CONTENT_WIDTH - RECIPIENT_BLOCK_WIDTH;
const TOTALS_WIDTH = mm(78);
const TOTALS_LEFT = PAGE_SIDE_MARGIN + CONTENT_WIDTH - TOTALS_WIDTH;
const CLOSING_WIDTH = mm(118);

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
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: mm(2.1),
    paddingBottom: mm(2.6),
    paddingHorizontal: mm(1.2),
  },
  tableCellText: {
    fontSize: 9.3,
    lineHeight: 1.35,
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
  paymentNoteBox: {
    marginTop: mm(4),
    width: mm(120),
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: mm(3),
  },
  paymentNoteText: {
    fontSize: 9.4,
    lineHeight: 1.35,
    color: "#374151",
  },
  manualPaymentSection: {
    marginTop: mm(8),
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: mm(4),
  },
  manualPaymentTitle: {
    fontSize: 11.5,
    fontWeight: "bold",
    marginBottom: mm(3),
    color: "#111827",
  },
  manualPaymentGrid: {
    flexDirection: "row",
  },
  manualPaymentCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: mm(3),
  },
  manualPaymentCardWithGap: {
    marginRight: mm(4),
  },
  manualPaymentCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: mm(2),
    color: "#111827",
  },
  manualPaymentBody: {
    fontSize: 9,
    lineHeight: 1.35,
    color: "#374151",
    marginBottom: mm(2),
  },
  manualPaymentLink: {
    fontSize: 8.8,
    color: "#0f172a",
    textDecoration: "underline",
    lineHeight: 1.3,
  },
  manualPaymentDetails: {
  },
  manualPaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: mm(1.6),
  },
  manualPaymentLabel: {
    width: "36%",
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#6b7280",
  },
  manualPaymentValue: {
    width: "64%",
    fontSize: 9,
    color: "#111827",
    lineHeight: 1.3,
    textAlign: "right",
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
  fixedSellerBlock: {
    position: "absolute",
    left: PAGE_SIDE_MARGIN,
    width: SELLER_BLOCK_WIDTH,
  },
  fixedRecipientBlock: {
    position: "absolute",
    left: RECIPIENT_LEFT,
    width: RECIPIENT_BLOCK_WIDTH,
  },
  fixedHeroBlock: {
    position: "absolute",
    left: PAGE_SIDE_MARGIN,
    width: CONTENT_WIDTH,
  },
  fixedTableBlock: {
    position: "absolute",
    left: PAGE_SIDE_MARGIN,
    width: CONTENT_WIDTH,
  },
  fixedTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderBottomColor: "#111827",
    paddingBottom: mm(1.6),
  },
  fixedTableHeaderCell: {
    justifyContent: "flex-start",
  },
  fixedTableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
  },
  fixedTableHeaderTextRight: {
    textAlign: "right",
  },
  fixedTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: mm(2),
    paddingBottom: mm(2.2),
  },
  fixedCellPos: {
    width: COL_POS_WIDTH,
    justifyContent: "flex-start",
  },
  fixedCellDesc: {
    width: COL_DESC_WIDTH,
    paddingRight: mm(4),
    justifyContent: "flex-start",
  },
  fixedCellQty: {
    width: COL_QTY_WIDTH,
    alignItems: "flex-end",
  },
  fixedCellUnit: {
    width: COL_UNIT_WIDTH,
    alignItems: "flex-end",
  },
  fixedCellTotal: {
    width: COL_TOTAL_WIDTH,
    alignItems: "flex-end",
  },
  fixedDescriptionText: {
    fontSize: 9.3,
    lineHeight: TABLE_TEXT_LINE_HEIGHT,
  },
  fixedNumericText: {
    fontSize: 9.3,
    lineHeight: TABLE_TEXT_LINE_HEIGHT,
    textAlign: "right",
  },
  fixedTotalsBlock: {
    position: "absolute",
    left: TOTALS_LEFT,
    width: TOTALS_WIDTH,
  },
  fixedClosingBlock: {
    position: "absolute",
    left: PAGE_SIDE_MARGIN,
    width: CLOSING_WIDTH,
  },
  fixedPaymentNoteBlock: {
    position: "absolute",
    left: PAGE_SIDE_MARGIN,
    width: CLOSING_WIDTH,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: mm(3),
  },
});

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatIban(value: string | null | undefined): string {
  if (!value) return "-";
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return compact.match(/.{1,4}/g)?.join(" ") ?? compact;
}

function buildPublicPaymentLink(publicToken: string | null | undefined): string | null {
  const normalizedToken = publicToken?.trim();
  if (!normalizedToken) return null;

  try {
    return buildPublicInvoiceLinkFromToken(normalizedToken);
  } catch (error) {
    console.error("Failed to build public invoice link:", error);
    return null;
  }
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
  includeQr: boolean,
  allowQrOnFirstPage: boolean
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

  const pages = paginateWithoutQr(items);

  if (allowQrOnFirstPage && pages.length === 1) {
    return {
      pages,
      qrPageIndex: 0,
      closingPageIndex: 0,
      standaloneQrPage: false,
    };
  }

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
  language: ReturnType<typeof normalizeInvoiceLanguage>;
  continuation?: boolean;
}) {
  const strings = getInvoiceStrings(props.language);

  return (
    <View style={props.continuation ? styles.tableWrapContinuation : styles.tableWrap}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colPos]}>{strings.position}</Text>
        <Text style={[styles.tableHeaderText, styles.colDesc]}>{strings.description}</Text>
        <Text style={[styles.tableHeaderText, styles.colQty]}>{strings.quantity}</Text>
        <Text style={[styles.tableHeaderText, styles.colUnit]}>{strings.unitPrice}</Text>
        <Text style={[styles.tableHeaderText, styles.colTotal]}>{strings.amount}</Text>
      </View>

      {props.lineItems.map((item, index) => (
        <View key={item.id} style={styles.tableRow}>
          <Text style={[styles.tableCellText, styles.colPos]}>{props.startIndex + index}</Text>
          <Text style={[styles.tableCellText, styles.colDesc]}>{item.description}</Text>
          <Text style={[styles.tableCellText, styles.colQty]}>{formatQuantity(item.quantity)}</Text>
          <Text style={[styles.tableCellText, styles.colUnit]}>{formatInvoiceMoney(item.unitPrice, props.language)}</Text>
          <Text style={[styles.tableCellText, styles.colTotal]}>
            {formatInvoiceMoney(item.quantity * item.unitPrice, props.language)}
          </Text>
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
  const invoiceLanguage = normalizeInvoiceLanguage(invoice.client.language);
  const strings = getInvoiceStrings(invoiceLanguage);

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
  const headerPrimaryName = senderBusinessName;
  const headerSecondaryName = sellerSecondaryName;

  const businessHeaderLines = collectLines(...toCompactAddressLines(businessAddress));
  const sellerContactLines = collectLines(businessEmail, businessPhone);
  const creditorLines =
    senderType === "owner"
      ? collectLines(paymentRecipientName, ...toPaymentAddressLines(businessAddress))
      : collectLines(senderBusinessName, sellerSecondaryName, ...toPaymentAddressLines(businessAddress));
  const debtorLines = collectLines(clientPrimaryName, clientSecondaryName, ...toPaymentAddressLines(clientAddress));
  const totals = calculateInvoiceTotals(invoice.lineItems);
  const subtotal = totals.subtotal;
  const taxAmount = totals.taxAmount;
  const totalAmountDue = totals.totalAmount;

  const invoiceForQR = {
    ...invoice,
    totalAmount: totalAmountDue,
    language: invoiceLanguage,
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
  const additionalInformation =
    qrMetadata?.additionalInformation || buildInvoiceAdditionalInformation(invoice.invoiceNumber, invoiceLanguage);
  const paymentReference = normalizeLine(invoice.reference) ?? invoice.invoiceNumber;
  const onlinePaymentLink = buildPublicPaymentLink(invoice.publicToken);
  const bankName = normalizeLine(invoice.business.bankName);
  const bic = normalizeLine(invoice.business.bic);
  const shouldRenderManualTransferSection =
    !shouldRenderQRSection &&
    Boolean(onlinePaymentLink || invoice.business.iban || bic || bankName);

  const messageText =
    normalizeLine(invoice.notes) ?? buildDefaultInvoiceMessage(invoiceLanguage, clientPrimaryName, senderName);
  const closingLines = buildMessageLines(messageText);
  const paymentNote = normalizeLine(invoice.paymentNote);
  const sellerLineCount = businessHeaderLines.length + sellerContactLines.length;
  const recipientLineCount = toCompactAddressLines(clientAddress).length;
  const sellerHeaderHeight =
    mm(27.5) +
    16 +
    (headerSecondaryName ? 13 + mm(1) : 0) +
    measureBlockHeight(sellerLineCount, 12, mm(0.55));
  const recipientHeaderHeight =
    16 +
    (clientSecondaryName ? 13 + mm(1) : 0) +
    measureBlockHeight(recipientLineCount, 12, mm(0.55));
  const firstPageHeaderBottom = Math.max(
    PAGE_TOP_MARGIN + sellerHeaderHeight,
    PAGE_TOP_MARGIN + mm(22) + recipientHeaderHeight
  );
  const firstPageHeroTop = firstPageHeaderBottom + mm(8);
  const firstPagePreparedRows = buildPreparedLineItemRows(invoice.lineItems, 1, invoiceLanguage);
  const firstPageTableTop = firstPageHeroTop + mm(24);
  const firstPageTableHeight =
    TABLE_HEADER_HEIGHT + firstPagePreparedRows.reduce((sum, row) => sum + row.rowHeight, 0);
  const firstPageTotalsTop = firstPageTableTop + firstPageTableHeight + mm(8);
  const firstPageTotalsHeight = mm(taxAmount > 0 ? 22 : 16);
  const firstPageClosingHeight = measureMessageHeight(closingLines);
  const firstPageClosingTop = firstPageTotalsTop + firstPageTotalsHeight + mm(9);
  const firstPagePaymentNoteTop = firstPageClosingTop + firstPageClosingHeight + mm(7);
  const firstPageContentBottom = Math.max(
    firstPageTableTop + firstPageTableHeight,
    firstPageTotalsTop + firstPageTotalsHeight,
    firstPageClosingTop + firstPageClosingHeight,
    paymentNote ? firstPagePaymentNoteTop + measureNoteBoxHeight(paymentNote) : 0
  );
  const qrTopOnSharedPage = A4_PAGE_HEIGHT - PAGE_BOTTOM_MARGIN - QR_BILL_TOTAL_SPACE;
  const allowQrOnFirstPage = shouldRenderQRSection && firstPageContentBottom + mm(6) <= qrTopOnSharedPage;
  const { pages, qrPageIndex, closingPageIndex, standaloneQrPage } = paginateLineItems(
    invoice.lineItems,
    shouldRenderQRSection,
    allowQrOnFirstPage
  );
  const pdfTitle = buildInvoicePdfFilename(invoice.invoiceNumber).replace(/\.pdf$/i, "");

  return (
    <Document title={pdfTitle}>
      {pages.map((lineItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isQrPage = qrPageIndex !== null && pageIndex === qrPageIndex;
        const shouldRenderClosingSections = pageIndex === closingPageIndex;
        const startIndex = pages.slice(0, pageIndex).reduce((sum, pageItems) => sum + pageItems.length, 1);
        const preparedRows = buildPreparedLineItemRows(lineItems, startIndex, invoiceLanguage);
        const headerBottom = Math.max(
          PAGE_TOP_MARGIN + sellerHeaderHeight,
          PAGE_TOP_MARGIN + mm(22) + recipientHeaderHeight
        );
        const heroTop = isFirstPage ? headerBottom + mm(8) : PAGE_TOP_MARGIN;
        const tableTop = heroTop + mm(24);
        const tableHeight = TABLE_HEADER_HEIGHT + preparedRows.reduce((sum, row) => sum + row.rowHeight, 0);
        const totalsTop = tableTop + tableHeight + mm(8);
        const totalsHeight = mm(taxAmount > 0 ? 22 : 16);
        const closingHeight = measureMessageHeight(closingLines);
        const closingTop = totalsTop + totalsHeight + mm(9);
        const paymentNoteTop = closingTop + closingHeight + mm(7);
        const pageBodyStyles: Array<
          typeof styles.pageBody | typeof styles.pageBodyWithQrSpace | typeof styles.pageBodyWithQrSpaceFlushBottom
        > = [styles.pageBody];

        if (isQrPage) {
          pageBodyStyles.push(styles.pageBodyWithQrSpaceFlushBottom);
        }

        return (
          <Page key={`invoice-page-${pageIndex}`} size="A4" style={styles.page} wrap={false}>
            <View style={pageBodyStyles} />

            {isFirstPage ? (
              <>
                <View style={[styles.fixedSellerBlock, { top: PAGE_TOP_MARGIN }]} wrap={false}>
                  {invoice.business.logoUrl ? <Image style={styles.logo} src={invoice.business.logoUrl} /> : null}
                  <Text style={styles.sellerName}>{headerPrimaryName}</Text>
                  {headerSecondaryName ? <Text style={styles.sellerSecondary}>{headerSecondaryName}</Text> : null}
                  {businessHeaderLines.map((line, index) => (
                    <Text key={`seller-${index}`} style={styles.bodyLine}>{line}</Text>
                  ))}
                  {sellerContactLines.map((line, index) => (
                    <Text key={`seller-contact-${index}`} style={styles.bodyLine}>{line}</Text>
                  ))}
                </View>

                <View style={[styles.fixedRecipientBlock, { top: PAGE_TOP_MARGIN + mm(22) }]} wrap={false}>
                  <Text style={styles.recipientName}>{clientPrimaryName}</Text>
                  {clientSecondaryName ? <Text style={styles.recipientSecondary}>{clientSecondaryName}</Text> : null}
                  {toCompactAddressLines(clientAddress).map((line, index) => (
                    <Text key={`client-${index}`} style={styles.bodyLine}>{line}</Text>
                  ))}
                </View>

                <View style={[styles.fixedHeroBlock, { top: heroTop }]} wrap={false}>
                  <Text style={styles.invoiceTitle}>{strings.invoice}: {invoice.invoiceNumber}</Text>
                  <Text style={styles.invoiceDate}>{formatInvoiceDate(invoice.issueDate, invoiceLanguage)}</Text>
                  <Text style={styles.invoiceDueDate}>
                    {strings.dueDate}: {formatInvoiceDate(invoice.dueDate, invoiceLanguage)}
                  </Text>
                  {invoice.subject ? <Text style={styles.invoiceSubject}>{strings.subject}: {invoice.subject}</Text> : null}
                </View>
              </>
            ) : null}

            <View style={[styles.fixedTableBlock, { top: tableTop }]} wrap={false}>
              <View style={styles.fixedTableHeader}>
                <View style={[styles.fixedTableHeaderCell, styles.fixedCellPos]}>
                  <Text style={styles.fixedTableHeaderText}>{strings.position}</Text>
                </View>
                <View style={[styles.fixedTableHeaderCell, styles.fixedCellDesc]}>
                  <Text style={styles.fixedTableHeaderText}>{strings.description}</Text>
                </View>
                <View style={[styles.fixedTableHeaderCell, styles.fixedCellQty]}>
                  <Text style={[styles.fixedTableHeaderText, styles.fixedTableHeaderTextRight]}>{strings.quantity}</Text>
                </View>
                <View style={[styles.fixedTableHeaderCell, styles.fixedCellUnit]}>
                  <Text style={[styles.fixedTableHeaderText, styles.fixedTableHeaderTextRight]}>{strings.unitPrice}</Text>
                </View>
                <View style={[styles.fixedTableHeaderCell, styles.fixedCellTotal]}>
                  <Text style={[styles.fixedTableHeaderText, styles.fixedTableHeaderTextRight]}>{strings.amount}</Text>
                </View>
              </View>

              {preparedRows.map((row) => (
                <View key={row.id} style={[styles.fixedTableRow, { minHeight: row.rowHeight }]} wrap={false}>
                  <View style={styles.fixedCellPos}>
                    <Text style={styles.fixedNumericText}>{row.indexLabel}</Text>
                  </View>
                  <View style={styles.fixedCellDesc}>
                    <Text style={styles.fixedDescriptionText}>{row.descriptionText}</Text>
                  </View>
                  <View style={styles.fixedCellQty}>
                    <Text style={styles.fixedNumericText}>{row.quantityText}</Text>
                  </View>
                  <View style={styles.fixedCellUnit}>
                    <Text style={styles.fixedNumericText}>{row.unitPriceText}</Text>
                  </View>
                  <View style={styles.fixedCellTotal}>
                    <Text style={styles.fixedNumericText}>{row.amountText}</Text>
                  </View>
                </View>
              ))}
            </View>

            {shouldRenderClosingSections ? (
              <>
                <View style={[styles.fixedTotalsBlock, { top: totalsTop }]} wrap={false}>
                  <View style={styles.totalsRule}>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>{strings.subtotal}</Text>
                      <Text style={styles.totalsValue}>
                        {invoice.currency} {formatInvoiceMoney(subtotal, invoiceLanguage)}
                      </Text>
                    </View>
                    {taxAmount > 0 ? (
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>{strings.vat}</Text>
                        <Text style={styles.totalsValue}>
                          {invoice.currency} {formatInvoiceMoney(taxAmount, invoiceLanguage)}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalDueLabel}>{strings.total}</Text>
                      <Text style={styles.totalDueValue}>
                        {invoice.currency} {formatInvoiceMoney(totalAmountDue, invoiceLanguage)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.fixedClosingBlock, { top: closingTop }]} wrap={false}>
                  <Text style={styles.closingText}>{closingLines.join("\n")}</Text>
                </View>

                {paymentNote ? (
                  <View style={[styles.fixedPaymentNoteBlock, { top: paymentNoteTop }]} wrap={false}>
                    <Text style={styles.paymentNoteText}>{paymentNote}</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {isQrPage ? (
              <View style={[styles.qrBillSection, styles.qrBillSectionFlushBottom]} wrap={false}>
                <View style={styles.cutLineWrap}>
                  <View style={styles.cutLine} />
                </View>

                <View style={styles.qrBillRow}>
                  <View style={styles.receiptCol}>
                    <Text style={styles.qrTitle}>{strings.receipt}</Text>

                    <View style={styles.receiptMain}>
                      <Text style={styles.labelSmall}>{strings.accountPayableTo}</Text>
                      <Text style={styles.textSmall}>{paymentAccount}</Text>
                      {creditorLines.map((line, index) => (
                        <Text key={`receipt-creditor-${index}`} style={styles.textSmall}>
                          {line}
                        </Text>
                      ))}

                      <Text style={[styles.labelSmall, styles.blockGap]}>{strings.payableBy}</Text>
                      {debtorLines.map((line, index) => (
                        <Text key={`receipt-debtor-${index}`} style={styles.textSmall}>
                          {line}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.receiptFooter}>
                      <View style={styles.amountRow}>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>{strings.currency}</Text>
                          <Text style={styles.amountValue}>{invoice.currency}</Text>
                        </View>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>{strings.amount}</Text>
                          <Text style={styles.amountValue}>{formatInvoiceMoney(totalAmountDue, invoiceLanguage)}</Text>
                        </View>
                      </View>
                      <View style={styles.acceptancePointWrap}>
                        <Text style={styles.acceptancePoint}>{strings.acceptancePoint}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.paymentPartCol}>
                    <Text style={styles.qrTitle}>{strings.paymentPart}</Text>

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
                            <Text style={styles.qrFallback}>{strings.qrCodeUnavailable}</Text>
                          )}
                        </View>

                        <View style={styles.qrFooter}>
                          <View style={styles.amountRow}>
                            <View style={styles.amountCol}>
                              <Text style={styles.amountLabel}>{strings.currency}</Text>
                              <Text style={styles.amountValue}>{invoice.currency}</Text>
                            </View>
                            <View style={styles.amountCol}>
                              <Text style={styles.amountLabel}>{strings.amount}</Text>
                              <Text style={styles.amountValue}>{formatInvoiceMoney(totalAmountDue, invoiceLanguage)}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={styles.detailsCol}>
                        <Text style={styles.paymentLabel}>{strings.accountPayableTo}</Text>
                        <Text style={styles.textMedium}>{paymentAccount}</Text>
                        {creditorLines.map((line, index) => (
                          <Text key={`payment-creditor-${index}`} style={styles.textMedium}>
                            {line}
                          </Text>
                        ))}

                        <Text style={[styles.paymentLabel, styles.blockGap]}>{strings.additionalInformation}</Text>
                        <Text style={styles.textMedium}>{additionalInformation}</Text>

                        <Text style={[styles.paymentLabel, styles.blockGap]}>{strings.payableBy}</Text>
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
        <Page size="A4" style={styles.page} wrap={false}>
          <View style={[styles.pageBody, styles.pageBodyWithQrSpaceFlushBottom]} wrap={false} />
          <View style={[styles.qrBillSection, styles.qrBillSectionFlushBottom]} wrap={false}>
            <View style={styles.cutLineWrap}>
              <View style={styles.cutLine} />
            </View>

            <View style={styles.qrBillRow}>
              <View style={styles.receiptCol}>
                <Text style={styles.qrTitle}>{strings.receipt}</Text>

                <View style={styles.receiptMain}>
                  <Text style={styles.labelSmall}>{strings.accountPayableTo}</Text>
                  <Text style={styles.textSmall}>{paymentAccount}</Text>
                  {creditorLines.map((line, index) => (
                    <Text key={`qr-only-receipt-creditor-${index}`} style={styles.textSmall}>
                      {line}
                    </Text>
                  ))}

                  <Text style={[styles.labelSmall, styles.blockGap]}>{strings.payableBy}</Text>
                  {debtorLines.map((line, index) => (
                    <Text key={`qr-only-receipt-debtor-${index}`} style={styles.textSmall}>
                      {line}
                    </Text>
                  ))}
                </View>

                <View style={styles.receiptFooter}>
                  <View style={styles.amountRow}>
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>{strings.currency}</Text>
                      <Text style={styles.amountValue}>{invoice.currency}</Text>
                    </View>
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>{strings.amount}</Text>
                      <Text style={styles.amountValue}>{formatInvoiceMoney(totalAmountDue, invoiceLanguage)}</Text>
                    </View>
                  </View>
                  <View style={styles.acceptancePointWrap}>
                    <Text style={styles.acceptancePoint}>{strings.acceptancePoint}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.paymentPartCol}>
                <Text style={styles.qrTitle}>{strings.paymentPart}</Text>

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
                        <Text style={styles.qrFallback}>{strings.qrCodeUnavailable}</Text>
                      )}
                    </View>

                    <View style={styles.qrFooter}>
                      <View style={styles.amountRow}>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>{strings.currency}</Text>
                          <Text style={styles.amountValue}>{invoice.currency}</Text>
                        </View>
                        <View style={styles.amountCol}>
                          <Text style={styles.amountLabel}>{strings.amount}</Text>
                          <Text style={styles.amountValue}>{formatInvoiceMoney(totalAmountDue, invoiceLanguage)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsCol}>
                    <Text style={styles.paymentLabel}>{strings.accountPayableTo}</Text>
                    <Text style={styles.textMedium}>{paymentAccount}</Text>
                    {creditorLines.map((line, index) => (
                      <Text key={`qr-only-payment-creditor-${index}`} style={styles.textMedium}>
                        {line}
                      </Text>
                    ))}

                    <Text style={[styles.paymentLabel, styles.blockGap]}>{strings.additionalInformation}</Text>
                    <Text style={styles.textMedium}>{additionalInformation}</Text>

                    <Text style={[styles.paymentLabel, styles.blockGap]}>{strings.payableBy}</Text>
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
