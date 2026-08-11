import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Note: Using Service Role key to bypass RLS for updating the profile
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: Request) {
  try {
    const { userId, bankCode, accountNumber, accountName } = await req.json();

    if (!userId || !bankCode || !accountNumber || !accountName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Server misconfiguration: Paystack keys missing." }, { status: 500 });
    }

    // 1. Create the Subaccount on Paystack
    // We set percentage_charge to 20% (Platform takes 20%, Analyst gets 80%)
    const paystackRes = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: accountName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 20.0, 
        description: `Analyst Payout Account for ${accountName}`,
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error("Paystack Subaccount Error:", paystackData);
      return NextResponse.json({ 
        error: paystackData.message || "Failed to create Paystack Subaccount" 
      }, { status: 400 });
    }

    const subaccountCode = paystackData.data.subaccount_code;

    // 2. Update the analyst's profile in Supabase with the subaccount code
    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .update({ paystack_subaccount: subaccountCode })
      .eq("id", userId);

    if (dbError) {
      console.error("Supabase Update Error:", dbError);
      return NextResponse.json({ error: "Failed to update profile with subaccount" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      subaccount_code: subaccountCode,
      message: "Bank account connected successfully" 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Subaccount creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
