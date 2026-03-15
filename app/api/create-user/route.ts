import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const email = authUser.email?.trim() ?? null;

    if (!email) {
      return apiError("Authenticated email is required", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true },
    });

    const user = existingUser
      ? await prisma.user.update({
          where: { id: authUser.id },
          data: {
            email,
            name: email,
          },
        })
      : await prisma.user.create({
          data: {
            id: authUser.id,
            email,
            name: email,
          },
        });

    await ensureBusiness(user.id);

    if (!existingUser) {
      try {
        await sendWelcomeEmail({
          to: email,
          dashboardLink: `${getPublicInvoiceBaseUrl()}/dashboard`,
        });
      } catch (error) {
        console.error("Error sending welcome email:", error);
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating user:", error);
    return apiError("Server Error", 500);
  }
}
