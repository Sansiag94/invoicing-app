import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { businessId, name, email } = body;

    const client = await prisma.client.create({
      data: {
        businessId,
        name,
        email,
        address: "",
        country: "",
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Client creation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}