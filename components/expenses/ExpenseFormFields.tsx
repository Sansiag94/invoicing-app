"use client";

import { expenseCategoryOptions } from "@/lib/expenses";
import { InvoiceCurrency } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ExpenseFormState = {
  vendor: string;
  description: string;
  category: string;
  amount: string;
  currency: InvoiceCurrency;
  expenseDate: string;
  notes: string;
  isRecurring: boolean;
  taxDeductible: boolean;
  vatReclaimable: boolean;
  vatAmount: string;
};

type ExpenseFormFieldsProps = {
  idPrefix: string;
  formState: ExpenseFormState;
  onChange: (nextState: ExpenseFormState) => void;
};

export default function ExpenseFormFields({
  idPrefix,
  formState,
  onChange,
}: ExpenseFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Vendor`}>Vendor</Label>
        <Input
          id={`${idPrefix}Vendor`}
          value={formState.vendor}
          onChange={(event) => onChange({ ...formState, vendor: event.target.value })}
          placeholder="Optional"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Description`}>Description</Label>
        <Input
          id={`${idPrefix}Description`}
          value={formState.description}
          onChange={(event) => onChange({ ...formState, description: event.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Category`}>Category</Label>
        <Select
          id={`${idPrefix}Category`}
          value={formState.category}
          onChange={(event) => onChange({ ...formState, category: event.target.value })}
        >
          {expenseCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Amount`}>Amount</Label>
        <Input
          id={`${idPrefix}Amount`}
          type="number"
          min="0.01"
          step="0.01"
          value={formState.amount}
          onChange={(event) => onChange({ ...formState, amount: event.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Currency`}>Currency</Label>
        <Select
          id={`${idPrefix}Currency`}
          value={formState.currency}
          onChange={(event) =>
            onChange({ ...formState, currency: event.target.value as InvoiceCurrency })
          }
        >
          <option value="CHF">CHF</option>
          <option value="EUR">EUR</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}ExpenseDate`}>Expense Date</Label>
        <Input
          id={`${idPrefix}ExpenseDate`}
          type="date"
          value={formState.expenseDate}
          onChange={(event) => onChange({ ...formState, expenseDate: event.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}VatAmount`}>VAT Amount</Label>
        <Input
          id={`${idPrefix}VatAmount`}
          type="number"
          min="0"
          step="0.01"
          value={formState.vatAmount}
          onChange={(event) => onChange({ ...formState, vatAmount: event.target.value })}
          disabled={!formState.vatReclaimable}
          placeholder={formState.vatReclaimable ? "0.00" : "Enable VAT reclaim"}
        />
      </div>
      <div className="space-y-2 md:col-span-2 xl:col-span-3">
        <Label htmlFor={`${idPrefix}Notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}Notes`}
          rows={3}
          value={formState.notes}
          onChange={(event) => onChange({ ...formState, notes: event.target.value })}
          placeholder="Optional details for bookkeeping"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:col-span-2 xl:col-span-3 md:grid-cols-3">
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={formState.isRecurring}
            onChange={(event) => onChange({ ...formState, isRecurring: event.target.checked })}
          />
          <span>
            <span className="font-medium text-slate-900">Recurring expense</span>
            <span className="mt-1 block text-slate-500">Include this in recurring cost tracking.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={formState.taxDeductible}
            onChange={(event) =>
              onChange({ ...formState, taxDeductible: event.target.checked })
            }
          />
          <span>
            <span className="font-medium text-slate-900">Tax deductible</span>
            <span className="mt-1 block text-slate-500">Use this for deductible business costs.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={formState.vatReclaimable}
            onChange={(event) =>
              onChange({
                ...formState,
                vatReclaimable: event.target.checked,
                vatAmount: event.target.checked ? formState.vatAmount : "",
              })
            }
          />
          <span>
            <span className="font-medium text-slate-900">VAT reclaimable</span>
            <span className="mt-1 block text-slate-500">Track VAT you expect to reclaim.</span>
          </span>
        </label>
      </div>
    </>
  );
}
