import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const { token } = params;

  const invoice = await prisma.invoice.findFirst({
    where: { publicToken: token },
    include: {
      client: true,
      lineItems: true,
      business: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}