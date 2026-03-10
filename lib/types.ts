export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

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
  address: string;
  country: string;
  vatNumber: string | null;
}

export interface BusinessSettingsData {
  id: string;
  name: string;
  address: string;
  country: string;
  currency: string;
  vatNumber: string | null;
  iban: string | null;
  logoUrl: string | null;
  invoicePrefix: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
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
  currency: string;
}

export interface DashboardOverview {
  currency: string;
  revenueThisMonth: number;
  totalRevenue: number;
  openInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  recentInvoices: DashboardRecentInvoice[];
}
