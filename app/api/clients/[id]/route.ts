import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // Unwrap params

  // Fetch the client including associated invoices
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: true, // Fetch associated invoices
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client); // Return the client as JSON
}