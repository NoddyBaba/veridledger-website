import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = process.env.PAYSTACK_SECRET_KEY;
    
    if (!secret || !signature) {
      return NextResponse.json({ error: "Missing secret or signature" }, { status: 400 });
    }

    // Verify signature
    const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    // We only care about successful charges for the manual treasury pilot
    if (event.event === "charge.success") {
      const data = event.data;
      const metadata = data.metadata;

      if (metadata && metadata.type === "subscription") {
        const allocatorId = metadata.allocator_id;
        const analystId = metadata.analyst_id;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Grant 30 days of access
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30); 

        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            allocator_id: allocatorId,
            analyst_id: analystId,
            status: "active",
            current_period_end: currentPeriodEnd.toISOString(),
            stripe_sub_id: data.reference // Reusing this column to store Paystack reference
          }, { onConflict: "allocator_id, analyst_id" });
          
        if (subError) {
          console.error("Error upserting subscription:", subError);
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        // Trigger Alerts
        // Alert for Analyst
        await supabaseAdmin.from("alerts").insert({
          user_id: analystId,
          title: "New Subscriber!",
          message: `An allocator just subscribed to your premium picks! (+₦2,000 MRR)`,
          type: "subscription"
        });

        // Alert for Allocator
        await supabaseAdmin.from("alerts").insert({
          user_id: allocatorId,
          title: "Subscription Active",
          message: `Your payment was successful. You now have access to premium picks.`,
          type: "subscription"
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
