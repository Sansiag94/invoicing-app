export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type InvoiceCurrency = "CHF" | "EUR";
export type InvoiceSenderType = "company" | "owner";

export interface InvoicePartyData {
  name: string;
  address: string;
  street?: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  iban?: string | null;
  bic?: string | null;
}

export interface LineItemData {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total?: number;
}

export interface ClientSummary {
  id: string;
  companyName: string | null;
  contactName: string | null;
  email: string;
  phone?: string | null;
  address: string;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  vatNumber: string | null;
}

export interface BusinessSettingsData {
  id: string;
  name: string;
  ownerName: string | null;
  invoiceSenderType: InvoiceSenderType;
  address: string;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  currency: InvoiceCurrency;
  vatNumber: string | null;
  iban: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  bic?: string | null;
  logoUrl: string | null;
  invoicePrefix: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: InvoiceCurrency;
  subject: string | null;
  reference: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  publicToken: string | null;
}

export interface InvoiceDetails extends InvoiceSummary {
  client: ClientSummary;
  lineItems: LineItemData[];
  business: BusinessSettingsData;
}

export interface ClientDetails extends ClientSummary {
  invoices: InvoiceSummary[];
}

export interface DashboardRecentInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  status: InvoiceStatus;
  currency: InvoiceCurrency;
}

export interface DashboardOverview {
  currency: InvoiceCurrency;
  revenueThisMonth: number;
  totalRevenue: number;
  openInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  clientCount: number;
  invoiceCount: number;
  recentInvoices: DashboardRecentInvoice[];
}

export interface InvoiceLineItemModel {
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface InvoiceModel {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: InvoiceCurrency;
  seller: InvoicePartyData;
  client: InvoicePartyData;
  line_items: InvoiceLineItemModel[];
  subtotal: number;
  total_amount_due: number;
  invoice_title?: string | null;
  optional_message?: string | null;
  reference_number?: string | null;
  additional_information?: string | null;
}

export interface SwissQRBillPayloadData {
  payload: string;
  account: string;
  referenceType: "NON" | "QRR" | "SCOR";
  reference: string | null;
  additionalInformation: string;
  qrRects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
  }>;
}

export interface PublicInvoiceClientData {
  companyName: string | null;
  contactName: string | null;
  email: string;
  phone?: string | null;
  address: string;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  vatNumber: string | null;
}

export interface PublicInvoiceBusinessData {
  name: string;
  ownerName: string | null;
  invoiceSenderType: InvoiceSenderType;
  logoUrl: string | null;
  address: string;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  vatNumber: string | null;
  currency: InvoiceCurrency;
  iban: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  bic?: string | null;
}

export interface PublicInvoiceDetails {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: InvoiceCurrency;
  subject: string | null;
  reference: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  publicToken: string | null;
  lineItems: LineItemData[];
  client: PublicInvoiceClientData;
  business: PublicInvoiceBusinessData;
  qrBill: SwissQRBillPayloadData | null;
}
