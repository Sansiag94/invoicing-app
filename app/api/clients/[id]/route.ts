import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";

type UpdateClientBody = {
  companyName?: unknown;
  contactName?: unknown;
  email?: unknown;
  address?: unknown;
  country?: unknown;
  vatNumber?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function getOwnedClientId(request: Request, id: string): Promise<string | null> {
  const user = await getAuthenticatedUser(request);

  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!business) {
    return null;
  }

  const client = await prisma.client.findFirst({
    where: { id, businessId: business.id },
    select: { id: true },
  });

  return client?.id ?? null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await prisma.client.findFirst({
      where: { id, businessId: business.id },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error loading client:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const clientId = await getOwnedClientId(request, id);

    if (!clientId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = (await request.json()) as UpdateClientBody;
    const companyName = asString(body.companyName);
    const contactName = asString(body.contactName);
    const email = asString(body.email);
    const address = asString(body.address);
    const country = asString(body.country);
    const vatNumber = asString(body.vatNumber);

    if (!email || !address || !country) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!companyName && !contactName) {
      return NextResponse.json(
        { error: "Client must have a company name or contact name" },
        { status: 400 }
      );
    }

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        companyName,
        contactName,
        email,
        address,
        country,
        vatNumber,
      },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const clientId = await getOwnedClientId(request, id);

    if (!clientId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await prisma.client.delete({ where: { id: clientId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error deleting client:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
