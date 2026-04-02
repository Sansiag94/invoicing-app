import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";

function asQuery(value: string | null): string {
  return (value ?? "").trim();
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const q = asQuery(searchParams.get("q"));

    if (q.length < 2) {
      return NextResponse.json({ clients: [], invoices: [] });
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const normalizedQuery = q.toLowerCase();
    const matchesStatus =
      normalizedQuery === "draft" ||
      normalizedQuery === "sent" ||
      normalizedQuery === "paid" ||
      normalizedQuery === "overdue" ||
      normalizedQuery === "cancelled";

    const [clients, invoices] = await prisma.$transaction([
      prisma.client.findMany({
        where: {
          businessId: business.id,
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: [{ companyName: "asc" }, { contactName: "asc" }],
        take: 5,
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          country: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          businessId: business.id,
          OR: [
            { invoiceNumber: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
            { client: { is: { companyName: { contains: q, mode: "insensitive" } } } },
            { client: { is: { contactName: { contains: q, mode: "insensitive" } } } },
            { client: { is: { email: { contains: q, mode: "insensitive" } } } },
            ...(matchesStatus
              ? [{ status: normalizedQuery as "draft" | "sent" | "paid" | "overdue" | "cancelled" }]
              : []),
          ],
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          issueDate: true,
          dueDate: true,
          client: {
            select: {
              companyName: true,
              contactName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ clients, invoices });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading search results:", error);
    return apiError("Server error", 500);
  }
}
