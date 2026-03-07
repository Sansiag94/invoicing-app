import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';

// API route for creating a new Business record
export async function POST(request: Request) {
  try {
    // Parse the incoming JSON request body
    const body = await request.json();
    const { userId, name, address, country, currency, vatNumber, iban, logoUrl, invoicePrefix } = body;

    // Create a new Business record in the database using Prisma
    const newBusiness = await prisma.business.create({
      data: {
        userId,
        name,
        address,
        country,
        currency,
        vatNumber,
        iban,
        logoUrl,
        invoicePrefix,
        invoiceCounter: 1, // Initialize invoiceCounter to 1
      },
    });

    // Return the created Business object in JSON format
    return NextResponse.json(newBusiness);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error creating business:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 }); // Return status 500 on server errors
  }
}