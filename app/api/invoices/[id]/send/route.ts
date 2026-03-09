import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function markInvoiceSent(request: Request, id: string) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();

  const existingInvoice = await prisma.invoice.findFirst({
    where: userId ? { id, business: { userId } } : { id },
    select: { id: true },
  });

  if (!existingInvoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const invoice = await prisma.invoice.update({
    where: { id: existingInvoice.id },
    data: { status: "sent" },
  });

  return NextResponse.json(invoice);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return await markInvoiceSent(request, id);
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return await markInvoiceSent(request, id);
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
