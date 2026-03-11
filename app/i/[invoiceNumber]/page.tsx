import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";

type PageProps = {
  params: Promise<{ invoiceNumber: string }>;
};

function normalizeInvoiceNumber(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export default async function PublicInvoiceNumberRedirectPage({ params }: PageProps) {
  const { invoiceNumber } = await params;
  const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);

  if (!normalizedInvoiceNumber) {
    notFound();
  }

  const invoiceMatches = await prisma.invoice.findMany({
    where: {
      invoiceNumber: normalizedInvoiceNumber,
      publicToken: {
        not: null,
      },
    },
    select: {
      publicToken: true,
    },
    take: 2,
  });

  if (invoiceMatches.length !== 1) {
    notFound();
  }

  const publicToken = invoiceMatches[0].publicToken?.trim();
  if (!publicToken) {
    notFound();
  }

  redirect(`/invoice/pay/${publicToken}`);
}

