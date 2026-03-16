export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type InvoiceCurrency = "CHF" | "EUR";
export type InvoiceSenderType = "company" | "owner";
export type ExpenseCategory =
  | "software"
  | "office"
  | "travel"
  | "equipment"
  | "tax"
  | "subcontractor"
  | "marketing"
  | "meals"
  | "education"
  | "other";

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
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  currency: InvoiceCurrency;
  subject: string | null;
  reference: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  publicToken: string | null;
}

export interface InvoicePaymentRecord {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  createdAt: string;
}

export interface InvoiceEventRecord {
  id: string;
  type: string;
  actor: string | null;
  details: string | null;
  createdAt: string;
}

export interface InvoiceDetails extends InvoiceSummary {
  client: ClientSummary;
  lineItems: LineItemData[];
  business: BusinessSettingsData;
  payments: InvoicePaymentRecord[];
  events: InvoiceEventRecord[];
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
  expensesThisMonth: number;
  netProfitThisMonth: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  prospectRevenue: number;
  overdueAmount: number;
  openInvoices: number;
  unpaidInvoices: number;
  paidInvoices: number;
  draftInvoices: number;
  sentInvoices: number;
  overdueInvoices: number;
  clientCount: number;
  invoiceCount: number;
  recentInvoices: DashboardRecentInvoice[];
}

export interface ExpenseRecord {
  id: string;
  vendor: string | null;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: InvoiceCurrency;
  expenseDate: string;
  notes: string | null;
  receiptUrl: string | null;
  isRecurring: boolean;
  taxDeductible: boolean;
  vatReclaimable: boolean;
  vatAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesOverview {
  currency: InvoiceCurrency;
  thisMonthTotal: number;
  last30DaysTotal: number;
  yearToDateTotal: number;
  totalExpenses: number;
  deductibleTotal: number;
  reclaimableVatTotal: number;
  recurringMonthlyTotal: number;
  recentExpenses: ExpenseRecord[];
}

export interface ExpensesPageData {
  overview: ExpensesOverview;
  expenses: ExpenseRecord[];
}

export interface AnalyticsSeriesPoint {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface AnalyticsClientBreakdown {
  clientId: string;
  clientName: string;
  revenue: number;
  invoiceCount: number;
}

export interface AnalyticsExpenseBreakdown {
  category: ExpenseCategory;
  amount: number;
}

export interface AnalyticsOverview {
  currency: InvoiceCurrency;
  revenueThisMonth: number;
  expensesThisMonth: number;
  netProfitThisMonth: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  prospectRevenue: number;
  overdueAmount: number;
  paidInvoices: number;
  unpaidInvoices: number;
  averageDaysToPay: number | null;
  averagePaidInvoiceValue: number;
  monthlySeries: AnalyticsSeriesPoint[];
  topClients: AnalyticsClientBreakdown[];
  expenseBreakdown: AnalyticsExpenseBreakdown[];
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
  cardPaymentAvailable: boolean;
  qrBill: SwissQRBillPayloadData | null;
}
