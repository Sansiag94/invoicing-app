"use client";

import { Building2, CalendarDays, FileText } from "lucide-react";
import { ClientSummary, InvoiceCurrency } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InvoiceCreateSidebarProps = {
  client: ClientSummary | null;
  issueDate: string;
  dueDate: string;
  currency: InvoiceCurrency;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
};

export default function InvoiceCreateSidebar({
  client,
  issueDate,
  dueDate,
  currency,
  subtotal,
  taxAmount,
  totalAmount,
}: InvoiceCreateSidebarProps) {
  return (
    <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      <Card className="border-slate-200 bg-slate-50/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Quick Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Client</span>
            </div>
            {client ? (
              <div className="space-y-1 text-slate-700">
                <p className="font-medium text-slate-900">
                  {client.companyName || client.contactName || client.email}
                </p>
                {client.contactName && client.companyName ? <p>{client.contactName}</p> : null}
                <p>{client.email}</p>
                {client.phone ? <p>{client.phone}</p> : null}
                <p>{client.country}</p>
              </div>
            ) : (
              <p className="text-slate-500">Select a client to see billing details.</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Schedule</span>
            </div>
            <div className="space-y-1 text-slate-700">
              <p>Issue date: {issueDate || "-"}</p>
              <p>Due date: {dueDate || "-"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Totals</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span>
                  {currency} {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="mb-2 flex items-center justify-between text-slate-600">
                <span>Tax</span>
                <span>
                  {currency} {taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <span>Total</span>
                <span>
                  {currency} {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
