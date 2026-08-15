import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountNumber = searchParams.get("account_number");
  const bankCode = searchParams.get("bank_code");

  if (!accountNumber || !bankCode) {
    return NextResponse.json(
      { error: "Missing account_number or bank_code" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || "Could not resolve account" },
        { status: 400 }
      );
    }

    return NextResponse.json({ accountName: data.data.account_name });
  } catch (error: any) {
    console.error("Paystack resolve error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

