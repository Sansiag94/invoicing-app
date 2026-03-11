import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const email = authUser.email?.trim() ?? null;

    if (!email) {
      return apiError("Authenticated email is required", 400);
    }

    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email,
        name: email,
      },
      create: {
        id: authUser.id,
        email,
        name: email,
      },
    });

    await ensureBusiness(user.id);

    return NextResponse.json(user);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating user:", error);
    return apiError("Server Error", 500);
  }
}
