import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json([]);
    }

    const business = await prisma.business.findFirst({
      where: { userId }
    });

    if (!business) {
      console.error("Business not found for user:", userId);
      return NextResponse.json([]);
    }

    const clients = await prisma.client.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error loading clients:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, address, country, companyName, contactName, vatNumber } = body; 

    console.log("Incoming request body:", body);

    // Updated validation without name
    if (!userId || !email || !address || !country) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Additional validation for companyName and contactName
    if (!companyName && !contactName) {
      return NextResponse.json(
        { error: "Client must have a company name or contact name" },
        { status: 400 }
      );
    }

    const business = await prisma.business.findFirst({
      where: { userId }
    });

    if (!business) {
      console.error("Business not found for user:", userId);
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const client = await prisma.client.create({
      data: {
        businessId: business.id,
        companyName, // Updated to include companyName
        contactName, // Updated to include contactName
        email,
        address,
        country,
        vatNumber // Optional field
      }
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}