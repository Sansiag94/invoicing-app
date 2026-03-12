"use client";
/* eslint-disable @next/next/no-img-element */

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CreditCard, Download } from "lucide-react";
import { calculateInvoiceTotals, parsePostalAddress } from "@/lib/invoice";
import { getInvoiceSenderName } from "@/lib/business";
import { PublicInvoiceDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatIban(value: string | null | undefined): string {
  if (!value) return "-";
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return compact.match(/.{1,4}/g)?.join(" ") ?? compact;
}

function toPaymentAddressLines(address: ReturnType<typeof parsePostalAddress>): string[] {
  return [address.street, address.line2, [address.postalCode, address.city].filter(Boolean).join(" ")]
    .filter((line) => line && line.trim().length > 0);
}

const FIRST_PAGE_ROWS_NO_QR = 18;
const NEXT_PAGE_ROWS_NO_QR = 26;
const MAX_ROWS_WITH_QR_ON_FIRST_PAGE = 6;
const MAX_ROWS_ON_QR_PAGE = 6;

const qrBillStyle: CSSProperties = {
  minHeight: "105mm",
  marginTop: "auto",
  breakInside: "avoid-page",
  pageBreakInside: "avoid",
};

const invoicePagePadding: CSSProperties = {
  paddingTop: "14mm",
  paddingRight: "14mm",
  paddingBottom: "14mm",
  paddingLeft: "14mm",
};

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

function paginateWithQr<T>(items: T[]): { pages: T[][]; qrPageIndex: number } {
  if (items.length <= MAX_ROWS_WITH_QR_ON_FIRST_PAGE) {
    return { pages: [items], qrPageIndex: 0 };
  }

  const pages: T[][] = [];
  let index = 0;

  pages.push(items.slice(index, index + FIRST_PAGE_ROWS_NO_QR));
  index += FIRST_PAGE_ROWS_NO_QR;

  if (index >= items.length) {
    return {
      pages: [items, []],
      qrPageIndex: 1,
    };
  }

  while (items.length - index > MAX_ROWS_ON_QR_PAGE) {
    const remaining = items.length - index;

    if (remaining <= NEXT_PAGE_ROWS_NO_QR + MAX_ROWS_ON_QR_PAGE) {
      const rowsWithoutQr = remaining - MAX_ROWS_ON_QR_PAGE;
      if (rowsWithoutQr > 0) {
        pages.push(items.slice(index, index + rowsWithoutQr));
        index += rowsWithoutQr;
      }
      break;
    }

    pages.push(items.slice(index, index + NEXT_PAGE_ROWS_NO_QR));
    index += NEXT_PAGE_ROWS_NO_QR;
  }

  pages.push(items.slice(index));

  return {
    pages,
    qrPageIndex: pages.length - 1,
  };
}

function paginateLineItems<T>(items: T[], includeQr: boolean): { pages: T[][]; qrPageIndex: number | null } {
  if (!includeQr) {
    return {
      pages: paginateWithoutQr(items),
      qrPageIndex: null,
    };
  }

  const { pages, qrPageIndex } = paginateWithQr(items);
  return { pages, qrPageIndex };
}

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params?.token;
  const [invoice, setInvoice] = useState<PublicInvoiceDetails | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let mounted = true;

    (async () => {
      const response = await fetch(`/api/public/invoice/${token}`);
      const data = (await response.json()) as PublicInvoiceDetails | { error?: string };

      if (mounted && "error" in data) {
        console.error(data.error);
        setInvoice(null);
        return;
      }

      if (mounted) {
        setInvoice(data as PublicInvoiceDetails);
      }
    })().catch((error) => {
      console.error("Error fetching invoice:", error);
      if (mounted) setInvoice(null);
    });

    return () => {
      mounted = false;
    };
  }, [token]);

  const paymentSuccess = searchParams.get("success") === "true";
  const paymentCancelled = searchParams.get("cancel") === "true";

  const lineItems = useMemo(() => {
    if (!invoice) return [];

    return invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      taxRate: item.taxRate,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));
  }, [invoice]);

  const totals = useMemo(() => calculateInvoiceTotals(lineItems), [lineItems]);
  const subtotal = totals.subtotal;
  const taxAmount = totals.taxAmount;
  const totalAmountDue = totals.totalAmount;
  const shouldRenderQRSection = Boolean(invoice?.qrBill);

  const { pages, qrPageIndex } = useMemo(
    () => paginateLineItems(lineItems, shouldRenderQRSection),
    [lineItems, shouldRenderQRSection]
  );

  const businessAddress = useMemo(() => {
    if (!invoice) return null;
    return parsePostalAddress(invoice.business.address, invoice.business.country);
  }, [invoice]);

  const clientAddress = useMemo(() => {
    if (!invoice) return null;
    return parsePostalAddress(invoice.client.address, invoice.client.country);
  }, [invoice]);

  const clientName = useMemo(() => {
    if (!invoice) return "Client";
    return invoice.client.companyName || invoice.client.contactName || invoice.client.email || "Client";
  }, [invoice]);

  const senderName = useMemo(() => {
    if (!invoice) return "Business";
    return getInvoiceSenderName(invoice.business);
  }, [invoice]);
  const businessDisplayName = useMemo(() => {
    if (!invoice) return "Business";
    return invoice.business.name || senderName;
  }, [invoice, senderName]);
  const businessSecondaryName = useMemo(() => {
    if (!invoice) return null;
    const ownerName = invoice.business.ownerName?.trim() || null;
    return ownerName && ownerName !== businessDisplayName ? ownerName : null;
  }, [businessDisplayName, invoice]);

  const defaultMessage = useMemo(() => {
    const firstName =
      (invoice?.client.contactName || invoice?.client.companyName || clientName)
        .split(" ")
        .find((part) => part.trim().length > 0) || "there";
    const senderFirstName = senderName.split(" ").find((part) => part.trim().length > 0) || senderName;

    return `Hello ${firstName},\nThank you for your trust.\nPlease find the breakdown of the services below.\n\nBest regards,\n${senderFirstName}`;
  }, [clientName, invoice?.client.companyName, invoice?.client.contactName, senderName]);

  const handleCheckout = async () => {
    if (!invoice || !token) return;

    try {
      setIsCheckoutLoading(true);
      setCheckoutError(null);

      const response = await fetch(`/api/invoices/${invoice.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }

      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start checkout");
      setIsCheckoutLoading(false);
    }
  };

  if (!invoice || !businessAddress || !clientAddress) {
    return <div className="mx-auto max-w-[210mm] p-8 text-slate-600">Loading invoice...</div>;
  }

  const qrBillSection = (
    <section className="pt-3" style={qrBillStyle}>
      <div className="relative mb-2">
        <div className="border-t border-dashed border-black" />
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px]">{"\u2702"}</span>
      </div>

      <div
        className="grid min-h-[105mm] gap-0"
        style={{
          gridTemplateColumns: "62mm 1fr",
        }}
      >
        <div className="flex h-full flex-col border-r border-dashed border-black pl-[5mm] pr-[4mm]">
          <p className="mb-[4mm] text-[11px] font-semibold text-black">Receipt</p>

          <div className="space-y-[4mm] text-[8px] leading-[1.18] text-black">
            <div>
              <p className="mb-[0.7mm] text-[6px] font-semibold">Account / Payable to</p>
              <p>{formatIban(invoice.qrBill?.account || invoice.business.iban)}</p>
              <p>{senderName}</p>
              {toPaymentAddressLines(businessAddress).map((line, index) => (
                <p key={`receipt-creditor-${index}`}>{line}</p>
              ))}
            </div>

            <div>
              <p className="mb-[0.7mm] text-[6px] font-semibold">Payable by</p>
              <p>{clientName}</p>
              {toPaymentAddressLines(clientAddress).map((line, index) => (
                <p key={`receipt-debtor-${index}`}>{line}</p>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-[1mm]">
            <div className="grid grid-cols-2 gap-3 text-black">
              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">Currency</p>
                <p className="text-[10px] leading-[1.16]">{invoice.currency}</p>
              </div>
              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">Amount</p>
                <p className="text-[10px] leading-[1.16]">{formatMoney(totalAmountDue)}</p>
              </div>
            </div>
            <div className="flex h-[8mm] items-end justify-end">
              <p className="text-[8px] font-semibold text-black">Acceptance point</p>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col pl-[5mm] pr-[5mm]">
          <p className="mb-[4mm] text-[11px] font-semibold text-black">Payment part</p>

          <div
            className="grid flex-1"
            style={{
              gridTemplateColumns: "46mm 1fr",
              columnGap: "6mm",
            }}
          >
            <div className="flex h-full flex-col">
              <div className="h-[46mm] w-[46mm] bg-white">
                {invoice.qrBill?.qrRects?.length ? (
                  <div className="relative h-full w-full">
                    <svg viewBox="0 0 46 46" className="h-full w-full">
                      {invoice.qrBill.qrRects.map((rect, index) => (
                        <rect
                          key={`qr-cell-${index}`}
                          x={rect.x}
                          y={rect.y}
                          width={rect.width}
                          height={rect.height}
                          fill={rect.fill}
                        />
                      ))}
                    </svg>
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 bg-black">
                      <div className="absolute left-1/2 top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 bg-white" />
                      <div className="absolute left-1/2 top-1/2 h-1 w-3 -translate-x-1/2 -translate-y-1/2 bg-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-[10px] text-red-700">
                    QR code unavailable
                  </div>
                )}
              </div>

              <div className="mt-auto pt-[1mm] pb-[8mm] text-black">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-[0.8mm] text-[8px] font-semibold">Currency</p>
                    <p className="text-[10px] leading-[1.16]">{invoice.currency}</p>
                  </div>
                  <div>
                    <p className="mb-[0.8mm] text-[8px] font-semibold">Amount</p>
                    <p className="text-[10px] leading-[1.16]">{formatMoney(totalAmountDue)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-[4mm] text-[10px] leading-[1.16] text-black">
              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">Account / Payable to</p>
                <p>{formatIban(invoice.qrBill?.account || invoice.business.iban)}</p>
                <p>{senderName}</p>
                {toPaymentAddressLines(businessAddress).map((line, index) => (
                  <p key={`payment-creditor-${index}`}>{line}</p>
                ))}
              </div>

              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">Additional information</p>
                <p>{invoice.qrBill?.additionalInformation || `Invoice ${invoice.invoiceNumber}`}</p>
              </div>

              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">Payable by</p>
                <p>{clientName}</p>
                {toPaymentAddressLines(clientAddress).map((line, index) => (
                  <p key={`payment-debtor-${index}`}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-[210mm] space-y-4 px-4 py-6 print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Invoice {invoice.invoiceNumber}</h1>
          <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.open(`/api/public/invoice/${token}/pdf`, "_blank")} variant="outline">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={handleCheckout} disabled={isCheckoutLoading || invoice.status === "paid"}>
            <CreditCard className="h-4 w-4" />
            {isCheckoutLoading
              ? "Redirecting to Stripe..."
              : invoice.status === "paid"
                ? "Invoice already paid"
                : "Pay with Card"}
          </Button>
        </div>
      </div>

      {paymentSuccess ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 print:hidden">
          Payment completed. Thank you.
        </div>
      ) : null}
      {paymentCancelled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 print:hidden">
          Payment was cancelled.
        </div>
      ) : null}
      {checkoutError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">
          {checkoutError}
        </div>
      ) : null}

      {pages.map((pageItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isQrPage = qrPageIndex !== null && pageIndex === qrPageIndex;
        const isFinalPageWithoutQr = qrPageIndex === null && pageIndex === pages.length - 1;
        const shouldRenderTotals = isQrPage || isFinalPageWithoutQr;
        const pageStyle: CSSProperties = {
          ...invoicePagePadding,
        };

        if (pageIndex > 0) {
          pageStyle.breakBefore = "page";
          pageStyle.pageBreakBefore = "always";
        }

        return (
          <article
            key={`invoice-page-${pageIndex}`}
            className="box-border flex min-h-[297mm] flex-col bg-white text-[11px] text-slate-900 shadow-sm print:shadow-none"
            style={pageStyle}
          >
            {isFirstPage ? (
              <>
                <header className="flex items-start justify-between gap-8">
                  <div className="max-w-[58%] space-y-1">
                    {invoice.business.logoUrl ? (
                      <img
                        src={invoice.business.logoUrl}
                        alt={`${businessDisplayName} logo`}
                        className="mb-2 h-16 w-16 object-contain"
                      />
                    ) : null}
                    <p className="text-[18px] font-semibold leading-none">{businessDisplayName}</p>
                    {businessSecondaryName ? <p>{businessSecondaryName}</p> : null}
                    {businessAddress.displayLines.map((line, index) => (
                      <p key={`business-header-${index}`}>{line}</p>
                    ))}
                    {invoice.business.email ? <p>{invoice.business.email}</p> : null}
                    {invoice.business.phone ? <p>{invoice.business.phone}</p> : null}
                  </div>

                  <div className="mt-1 max-w-[36%] text-[11px]">
                    <p className="text-[18px] font-semibold leading-none">{clientName}</p>
                    {clientAddress.displayLines.map((line, index) => (
                      <p key={`client-address-${index}`}>{line}</p>
                    ))}
                  </div>
                </header>

                <section className="mt-9 space-y-1">
                  <p className="text-[24px] font-semibold leading-none">Invoice: {invoice.invoiceNumber}</p>
                  <p className="text-slate-700">{formatDate(invoice.issueDate)}</p>
                  <p className="text-slate-700">Due date: {formatDate(invoice.dueDate)}</p>
                  {invoice.subject ? <p className="text-slate-700">Subject: {invoice.subject}</p> : null}
                  {invoice.reference ? <p className="text-slate-700">Reference: {invoice.reference}</p> : null}
                </section>
              </>
            ) : null}

            <section className={isFirstPage ? "mt-8" : "mt-0"}>
              <table className="w-full border-collapse text-left">
                {isFirstPage ? (
                  <thead>
                    <tr className="bg-slate-600 text-[11px] font-semibold text-white">
                      <th className="px-3 py-2">Description</th>
                      <th className="w-[20%] px-3 py-2 text-right">Price</th>
                      <th className="w-[17%] px-3 py-2 text-right">Units</th>
                      <th className="w-[17%] px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                ) : null}
                <tbody>
                  {pageItems.map((item, index) => (
                    <tr
                      key={`line-item-${pageIndex}-${index}`}
                      className="border-b border-slate-200 align-top text-[11px]"
                    >
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{formatQuantity(item.quantity)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {shouldRenderTotals ? (
              <section className="mt-6 ml-auto w-full max-w-[80mm] text-[11px]">
                <div className="border-t border-slate-300 pt-3">
                  {taxAmount > 0 ? (
                    <>
                      <div className="mb-1 flex items-center justify-between text-slate-700">
                        <span>Subtotal</span>
                        <span>
                          {invoice.currency} {formatMoney(subtotal)}
                        </span>
                      </div>
                      <div className="mb-3 flex items-center justify-between text-slate-700">
                        <span>VAT</span>
                        <span>
                          {invoice.currency} {formatMoney(taxAmount)}
                        </span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-center justify-between text-[20px] font-semibold leading-none">
                    <span>Total</span>
                    <span>
                      {invoice.currency} {formatMoney(totalAmountDue)}
                    </span>
                  </div>
                </div>
              </section>
            ) : null}

            {shouldRenderTotals ? (
              <section className="mt-6 max-w-[120mm] text-[10px] leading-[1.35] whitespace-pre-line text-slate-700">
                {invoice.notes?.trim() ? invoice.notes.trim() : defaultMessage}
              </section>
            ) : null}

            {isQrPage ? qrBillSection : null}
          </article>
        );
      })}
    </div>
  );
}
