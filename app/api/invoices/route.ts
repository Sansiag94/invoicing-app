import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  const business = await prisma.business.findFirst({ where: { userId } });
  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }
  const invoices = await prisma.invoice.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const {
    userId,
    clientId,
    invoiceNumber,
    issueDate,
    dueDate,
    subtotal,
    taxAmount,
    totalAmount,
    status,
    currency
  } = await request.json();

  if (
    !userId ||
    !clientId ||
    !invoiceNumber ||
    !issueDate ||
    !dueDate ||
    subtotal === undefined ||
    taxAmount === undefined ||
    totalAmount === undefined ||
    !status ||
    !currency
  ) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const business = await prisma.business.findFirst({ where: { userId } });
  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const invoice = await prisma.invoice.create({
    data: {
      businessId: business.id,
      clientId,
      invoiceNumber,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      subtotal,
      taxAmount,
      totalAmount,
      status, // must be one of "draft", "sent", "paid", or "overdue"
      currency
    }
  });

  return NextResponse.json(invoice, { status: 201 });
}