import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, email } = body;

    const user = await prisma.user.create({
      data: {
        id,
        email,
        name: email,
        businesses: {
          create: {
            name: "My Business",
            address: "",
            country: "",
            currency: "CHF",
            invoicePrefix: "INV",
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}