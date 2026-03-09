import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // Update the invoice status to "sent"
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: "sent" },
  });

  return NextResponse.json(invoice);
}