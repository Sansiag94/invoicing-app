"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CreditCard, Download } from "lucide-react";
import { calculateInvoiceTotals, parsePostalAddress } from "@/lib/invoice";
import { getInvoiceAmountDue } from "@/lib/invoiceStatus";
import {
  buildInvoiceAdditionalInformation,
  buildDefaultInvoiceMessage,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceStrings,
  normalizeInvoiceLanguage,
  translateInvoiceStatus,
} from "@/lib/invoiceLanguage";
import { getInvoiceSenderName } from "@/lib/business";
import { PublicInvoiceDetails } from "@/lib/types";
import { buildPublicInvoiceLinkFromToken } from "@/lib/publicInvoiceLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
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

const MAX_ROWS_WITH_QR_ON_FIRST_PAGE = 6;

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params?.token;
  const [invoice, setInvoice] = useState<PublicInvoiceDetails | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

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
  const stripeSessionId = searchParams.get("session_id");
  const showPaymentSuccessNotice =
    paymentSuccess && (isConfirmingPayment || invoice?.status !== "cancelled");

  useEffect(() => {
    if (!token || !paymentSuccess || !stripeSessionId || !invoice || invoice.status === "paid") {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setIsConfirmingPayment(true);
        const response = await fetch(`/api/public/invoice/${token}/stripe/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: stripeSessionId }),
        });

        const result = (await response.json()) as {
          error?: string;
          status?: PublicInvoiceDetails["status"];
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Could not confirm payment");
        }

        if (!mounted) {
          return;
        }

        setInvoice((current) =>
          current ? { ...current, status: result.status ?? current.status } : current
        );
      } catch (error) {
        console.error("Error confirming payment:", error);
      } finally {
        if (mounted) {
          setIsConfirmingPayment(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [invoice, paymentSuccess, stripeSessionId, token]);

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
  const invoiceAmountDue = invoice ? getInvoiceAmountDue(invoice.status, totalAmountDue) : 0;
  const canCollectPayment = invoice?.status !== "paid" && invoice?.status !== "cancelled";
  const shouldRenderQRSection = canCollectPayment && Boolean(invoice?.qrBill);
  const cardPaymentAvailable = Boolean(invoice?.cardPaymentAvailable);
  const shouldShareQrOnFirstPage = shouldRenderQRSection && lineItems.length <= MAX_ROWS_WITH_QR_ON_FIRST_PAGE;
  const shouldRenderStandaloneQrPage = shouldRenderQRSection && !shouldShareQrOnFirstPage;

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

  const onlinePaymentLink = useMemo(() => {
    if (!token) return null;

    try {
      return buildPublicInvoiceLinkFromToken(token);
    } catch (error) {
      console.error("Error building public invoice link:", error);
      return null;
    }
  }, [token]);
  const paymentReference = invoice?.reference?.trim() || invoice?.invoiceNumber || "";
  const shouldRenderManualTransferSection =
    canCollectPayment &&
    !shouldRenderQRSection &&
    Boolean(
      onlinePaymentLink ||
        invoice?.business.iban ||
        invoice?.business.bic ||
        invoice?.business.bankName
    );
  const invoiceLanguage = normalizeInvoiceLanguage(invoice?.client.language);
  const strings = getInvoiceStrings(invoiceLanguage);
  const defaultMessage = useMemo(() => {
    return buildDefaultInvoiceMessage(
      invoiceLanguage,
      invoice?.client.contactName || invoice?.client.companyName || clientName,
      senderName
    );
  }, [clientName, invoice?.client.companyName, invoice?.client.contactName, invoiceLanguage, senderName]);

  const handleCheckout = async () => {
    if (!invoice || !token || !canCollectPayment) return;

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
    return <div className="mx-auto max-w-[210mm] p-8 text-slate-600">{strings.loadingInvoice}</div>;
  }

  const qrBillSection = (
    <section className="qr-bill pt-3">
      <div className="relative mb-2">
        <div className="border-t border-dashed border-black" />
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px]">{"\u2702"}</span>
      </div>

      <div
        className="qr-bill__row grid min-h-[105mm] gap-0"
        style={{
          gridTemplateColumns: "62mm 1fr",
          paddingTop: "5mm",
        }}
      >
        <div className="qr-bill__receipt flex h-full flex-col border-r border-dashed border-black pl-[4.5mm] pr-[4.5mm] pb-[3mm]">
          <div>
            <p className="mb-[5mm] text-[11px] font-semibold text-black">{strings.receipt}</p>
            <div className="min-h-[46mm] space-y-[5mm] text-[8px] leading-[1.18] text-black">
              <div>
                <p className="mb-[0.7mm] text-[6px] font-semibold">{strings.accountPayableTo}</p>
                <p>{formatIban(invoice.qrBill?.account || invoice.business.iban)}</p>
                <p>{senderName}</p>
                {toPaymentAddressLines(businessAddress).map((line, index) => (
                  <p key={`receipt-creditor-${index}`}>{line}</p>
                ))}
              </div>

              <div>
                <p className="mb-[0.7mm] text-[6px] font-semibold">{strings.payableBy}</p>
                <p>{clientName}</p>
                {toPaymentAddressLines(clientAddress).map((line, index) => (
                  <p key={`receipt-debtor-${index}`}>{line}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-[10mm]">
            <div className="grid grid-cols-2 gap-3 text-black">
              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">{strings.currency}</p>
                <p className="text-[10px] leading-[1.16]">{invoice.currency}</p>
              </div>
              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">{strings.amount}</p>
                <p className="text-[10px] leading-[1.16]">{formatInvoiceMoney(totalAmountDue, invoiceLanguage)}</p>
              </div>
            </div>
            <div className="flex h-[7mm] items-end justify-end">
              <p className="text-[8px] font-semibold text-black">{strings.acceptancePoint}</p>
            </div>
          </div>
        </div>

        <div className="qr-bill__payment flex h-full flex-col pl-[4.5mm] pr-[4.5mm] pb-[3mm]">
          <p className="mb-[5mm] text-[11px] font-semibold text-black">{strings.paymentPart}</p>

          <div
            className="qr-bill__payment-grid grid flex-1"
            style={{
              gridTemplateColumns: "46mm 1fr",
              columnGap: "6mm",
            }}
          >
            <div className="qr-bill__qr-column flex h-full flex-col justify-start">
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
                    {strings.qrCodeUnavailable}
                  </div>
                )}
              </div>

              <div className="mt-[10mm] text-black">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-[0.8mm] text-[8px] font-semibold">{strings.currency}</p>
                    <p className="text-[10px] leading-[1.16]">{invoice.currency}</p>
                  </div>
                  <div>
                    <p className="mb-[0.8mm] text-[8px] font-semibold">{strings.amount}</p>
                    <p className="text-[10px] leading-[1.16]">{formatInvoiceMoney(totalAmountDue, invoiceLanguage)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="qr-bill__payment-details -mt-[10mm] space-y-[5mm] self-start text-[10px] leading-[1.16] text-black">
              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">{strings.accountPayableTo}</p>
                <p>{formatIban(invoice.qrBill?.account || invoice.business.iban)}</p>
                <p>{senderName}</p>
                {toPaymentAddressLines(businessAddress).map((line, index) => (
                  <p key={`payment-creditor-${index}`}>{line}</p>
                ))}
              </div>

              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">{strings.additionalInformation}</p>
                <p>{invoice.qrBill?.additionalInformation || buildInvoiceAdditionalInformation(invoice.invoiceNumber, invoiceLanguage)}</p>
              </div>

              <div>
                <p className="mb-[0.8mm] text-[8px] font-semibold">{strings.payableBy}</p>
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
    <div className="min-h-screen bg-slate-100 py-4 text-slate-900 dark:bg-slate-800/60 dark:text-slate-100 print:min-h-0 print:bg-white print:py-0">
      <div className="invoice-print-shell mx-auto max-w-[210mm] space-y-4 px-4 py-6 print:space-y-0 print:px-0 print:py-0">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 18mm 14mm 18mm 14mm;
        }

        @media print {
          .invoice-print-shell {
            background: white !important;
          }

          .invoice-document {
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }

        .invoice-document {
          box-sizing: border-box;
          padding: 18mm 14mm;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
        }

        .invoice-document--qr {
          padding-bottom: 0;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10mm;
        }

        .invoice-table thead {
          display: table-header-group;
        }

        .invoice-table tbody {
          display: table-row-group;
        }

        .invoice-table tr {
          break-inside: auto;
          page-break-inside: auto;
        }

        .invoice-table th,
        .invoice-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #ddd;
          vertical-align: top;
        }

        .invoice-table th {
          text-align: left;
        }

        .invoice-table td.num,
        .invoice-table th.num {
          text-align: right;
        }

        .invoice-table tbody tr:nth-child(even) {
          background: #fafafa;
        }

        .qr-bill {
          break-inside: avoid-page;
          page-break-inside: avoid;
        }

        .manual-payment {
          break-inside: avoid-page;
          page-break-inside: avoid;
        }

        .invoice-line-mobile-meta {
          display: none;
        }

        @media (max-width: 767px) {
          .invoice-document {
            padding: 20px 18px;
            border-radius: 20px;
          }

          .qr-bill__row {
            min-height: auto !important;
            grid-template-columns: 1fr !important;
            gap: 16px;
            padding-top: 16px !important;
          }

          .qr-bill__receipt {
            border-right: none !important;
            border-bottom: 1px dashed #000;
            padding-bottom: 16px !important;
          }

          .qr-bill__payment-grid {
            grid-template-columns: 1fr !important;
            row-gap: 16px;
          }

          .qr-bill__qr-column {
            align-items: center;
          }

          .qr-bill__payment-details {
            margin-top: 0 !important;
          }

          .invoice-table__col-qty,
          .invoice-table__col-unit,
          .invoice-table__col-amount {
            display: none;
          }

          .invoice-line-mobile-meta {
            display: grid;
            gap: 2px;
            margin-top: 6px;
            color: #475569;
            font-size: 10px;
            line-height: 1.35;
          }
        }
      `}</style>
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{strings.invoice} {invoice.invoiceNumber}</h1>
          <Badge
            variant={statusVariant(invoice.status)}
            className="self-start px-2 py-px text-[11px] tracking-[0.08em] uppercase"
          >
            {translateInvoiceStatus(invoice.status, invoiceLanguage)}
          </Badge>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            onClick={() => window.open(`/api/public/invoice/${token}/pdf`, "_blank")}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            {strings.downloadPdf}
          </Button>
          {cardPaymentAvailable ? (
            <Button
              onClick={handleCheckout}
              disabled={isCheckoutLoading || !canCollectPayment}
              className="w-full sm:w-auto"
            >
              <CreditCard className="h-4 w-4" />
              {isCheckoutLoading
                ? strings.redirectingToStripe
                : invoice.status === "cancelled"
                  ? translateInvoiceStatus("cancelled", invoiceLanguage)
                  : invoice.status === "paid"
                  ? strings.invoiceAlreadyPaid
                  : strings.payWithCard}
            </Button>
          ) : null}
        </div>
      </div>

      {showPaymentSuccessNotice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 print:hidden">
          {isConfirmingPayment ? strings.paymentReceivedUpdating : strings.paymentCompletedThankYou}
        </div>
      ) : null}
      {paymentCancelled ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 print:hidden">
          {strings.paymentCancelled}
        </div>
      ) : null}
      {invoice.status === "cancelled" ? (
        <div className="rounded-md border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 print:hidden">
          {strings.invoiceCancelledNoPaymentDue}
        </div>
      ) : null}
      {checkoutError ? (
        <div className="rounded-md border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 print:hidden">
          {checkoutError}
        </div>
      ) : null}
      {!cardPaymentAvailable && canCollectPayment ? (
        <div className="rounded-md border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 print:hidden">
          {strings.onlineCardPaymentUnavailable}
        </div>
      ) : null}

      <article
        data-force-light
        className={`invoice-document bg-white text-[11px] text-slate-900 shadow-sm print:shadow-none${
          shouldShareQrOnFirstPage ? " invoice-document--qr" : ""
        }`}
      >
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="w-full space-y-1 sm:max-w-[58%]">
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

          <div className="w-full text-[11px] sm:mt-1 sm:max-w-[36%]">
            <p className="text-[18px] font-semibold leading-none">{clientName}</p>
            {clientAddress.displayLines.map((line, index) => (
              <p key={`client-address-${index}`}>{line}</p>
            ))}
          </div>
        </header>

        <section className="mt-9 space-y-1">
          <p className="text-[24px] font-semibold leading-none">{strings.invoice}: {invoice.invoiceNumber}</p>
          <p className="text-slate-700">{formatInvoiceDate(invoice.issueDate, invoiceLanguage)}</p>
          <p className="text-slate-700">{strings.dueDate}: {formatInvoiceDate(invoice.dueDate, invoiceLanguage)}</p>
          {invoice.subject ? <p className="text-slate-700">{strings.subject}: {invoice.subject}</p> : null}
        </section>

        <section className="overflow-x-auto">
          <table className="invoice-table w-full md:min-w-[34rem]">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>{strings.position}</th>
                <th style={{ width: "46%" }}>{strings.description}</th>
                <th className="invoice-table__col-qty" style={{ width: "12%" }}>
                  {strings.quantity}
                </th>
                <th className="num invoice-table__col-unit" style={{ width: "16%" }}>
                  {strings.unitPrice}
                </th>
                <th className="num invoice-table__col-amount" style={{ width: "18%" }}>
                  {strings.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={`line-item-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    <div>{item.description}</div>
                    <div className="invoice-line-mobile-meta">
                      <span>{strings.quantity}: {formatQuantity(item.quantity)}</span>
                      <span>{strings.unitPrice}: {formatInvoiceMoney(item.unitPrice, invoiceLanguage)}</span>
                      <span>{strings.amount}: {formatInvoiceMoney(item.lineTotal, invoiceLanguage)}</span>
                    </div>
                  </td>
                  <td className="invoice-table__col-qty">{formatQuantity(item.quantity)}</td>
                  <td className="num invoice-table__col-unit">{formatInvoiceMoney(item.unitPrice, invoiceLanguage)}</td>
                  <td className="num invoice-table__col-amount">{formatInvoiceMoney(item.lineTotal, invoiceLanguage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 ml-auto w-full max-w-[80mm] text-[11px]">
          <div className="border-t border-slate-300 pt-3">
            <div className="mb-1 flex items-center justify-between text-slate-700">
              <span>{strings.subtotal}</span>
              <span>
                {invoice.currency} {formatInvoiceMoney(subtotal, invoiceLanguage)}
              </span>
            </div>
            {taxAmount > 0 ? (
              <div className="mb-3 flex items-center justify-between text-slate-700">
                <span>{strings.vat}</span>
                <span>
                  {invoice.currency} {formatInvoiceMoney(taxAmount, invoiceLanguage)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-[20px] font-semibold leading-none">
              <span>{strings.total}</span>
              <span>
                {invoice.currency} {formatInvoiceMoney(totalAmountDue, invoiceLanguage)}
              </span>
            </div>
            {invoiceAmountDue !== totalAmountDue ? (
              <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                <span>{strings.amountDue}</span>
                <span>
                  {invoice.currency} {formatInvoiceMoney(invoiceAmountDue, invoiceLanguage)}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-6 max-w-[120mm] text-[10px] leading-[1.35] whitespace-pre-line text-slate-700">
          {invoice.notes?.trim() ? invoice.notes.trim() : defaultMessage}
        </section>

        {invoice.paymentNote?.trim() ? (
          <section className="mt-4 max-w-[120mm] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] leading-[1.35] whitespace-pre-line text-slate-700">
            {invoice.paymentNote.trim()}
          </section>
        ) : null}

        {shouldRenderManualTransferSection ? (
          <section className="manual-payment mt-8 border border-slate-300 p-4">
            <h2 className="mb-3 text-[14px] font-semibold text-slate-900">{strings.paymentOptions}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {onlinePaymentLink ? (
                <div className="border border-slate-200 p-3">
                  <p className="mb-2 text-[12px] font-semibold text-slate-900">
                    {cardPaymentAvailable ? strings.payOnline : strings.viewInvoiceOnline}
                  </p>
                  <p className="mb-2 text-[10px] leading-[1.4] text-slate-700">
                    {cardPaymentAvailable
                      ? strings.payOnlineDescription
                      : strings.viewInvoiceOnlineDescription}
                  </p>
                  <p className="break-all text-[10px] leading-[1.4] text-slate-900 underline">
                    {onlinePaymentLink}
                  </p>
                </div>
              ) : null}

              <div className="border border-slate-200 p-3">
                <p className="mb-2 text-[12px] font-semibold text-slate-900">{strings.internationalBankTransfer}</p>
                <dl className="space-y-2 text-[10px] leading-[1.4] text-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-500">{strings.accountHolder}</dt>
                    <dd className="text-right text-slate-900">{senderName}</dd>
                  </div>
                  {invoice.business.bankName ? (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{strings.bank}</dt>
                      <dd className="text-right text-slate-900">{invoice.business.bankName}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-500">{strings.iban}</dt>
                    <dd className="text-right text-slate-900">{formatIban(invoice.business.iban)}</dd>
                  </div>
                  {invoice.business.bic ? (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{strings.bicSwift}</dt>
                      <dd className="text-right text-slate-900">{invoice.business.bic}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-500">{strings.amount}</dt>
                    <dd className="text-right text-slate-900">
                      {invoice.currency} {formatInvoiceMoney(totalAmountDue, invoiceLanguage)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-500">{strings.referenceMessage}</dt>
                    <dd className="text-right text-slate-900">{paymentReference}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        ) : null}

        {shouldShareQrOnFirstPage ? qrBillSection : null}
      </article>

      {shouldRenderStandaloneQrPage ? (
        <article
          data-force-light
          className="invoice-document invoice-document--qr bg-white text-[11px] text-slate-900 shadow-sm print:break-before-page print:shadow-none"
        >
          {qrBillSection}
        </article>
      ) : null}
      </div>
    </div>
  );
}
