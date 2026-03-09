import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";

type CreateUserBody = {
  id: unknown;
  email: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateUserBody;
    const id = asString(body.id);
    const email = asString(body.email);

    if (!id || !email) {
      return NextResponse.json({ error: "id and email are required" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email,
        name: email,
      },
      create: {
        id,
        email,
        name: email,
      },
    });

    await ensureBusiness(user.id);

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
