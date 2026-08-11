import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { analystUsername, price } = await req.json();

    // 1. Get user session securely
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    
    // Create an admin client to fetch user by token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Analyst profile ID
    const { data: analystProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, paystack_subaccount")
      .eq("username", analystUsername)
      .single();

    if (profileError || !analystProfile) {
      return NextResponse.json({ error: "Analyst not found" }, { status: 404 });
    }

    if (!analystProfile.paystack_subaccount) {
      return NextResponse.json({ error: "Analyst has not connected a bank account to receive payments" }, { status: 400 });
    }

    // 3. Initialize Paystack Transaction
    const amountInKobo = price * 100;
    
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency: "NGN",
        subaccount: analystProfile.paystack_subaccount,
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/analyst/${analystUsername}`,
        metadata: {
          allocator_id: user.id,
          analyst_id: analystProfile.id,
          type: "subscription"
        }
      })
    });

    const paystackData = await paystackRes.json();
    
    if (!paystackData.status) {
      throw new Error(paystackData.message || "Failed to initialize Paystack");
    }

    // 4. Return checkout URL
    return NextResponse.json({ url: paystackData.data.authorization_url });

  } catch (error: any) {
    console.error("Paystack checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
