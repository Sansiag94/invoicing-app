"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SampleInvoicePage() {
  const [rows, setRows] = useState(8);
  const pdfUrl = useMemo(() => `/api/dev/sample-invoice-pdf?rows=${rows}`, [rows]);

  if (process.env.NODE_ENV !== "development") {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-600">
          This page is only intended for development.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sample Invoice PDF</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-700">
            Rows
            <input
              className="ml-2 rounded border border-slate-300 px-2 py-1"
              type="number"
              min={2}
              max={18}
              value={rows}
              onChange={(event) => setRows(Math.min(18, Math.max(2, Number(event.target.value) || 2)))}
            />
          </label>
          <Button asChild variant="outline">
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              Open PDF
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <iframe title="Sample invoice PDF" src={pdfUrl} className="h-[calc(100vh-12rem)] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
