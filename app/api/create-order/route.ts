import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  // Verify the user is authenticated
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { imageId, recipientId, fullName, inmateNumber, facilityName, state } = await req.json();

  if (!imageId) {
    return NextResponse.json({ success: false, error: "Image ID is required." }, { status: 400 });
  }

  if (!recipientId && (!fullName?.trim() || !inmateNumber?.trim())) {
    return NextResponse.json(
      { success: false, error: "Please select a saved recipient or provide full name and inmate number." },
      { status: 400 }
    );
  }

  // Use service role for all DB writes (orders, order_items, delivery_queue require service_role)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Resolve recipient ID — create a new one if not provided
  let resolvedRecipientId = recipientId;
  if (!resolvedRecipientId) {
    const { data: inserted, error: recipientError } = await supabaseAdmin
      .from("inmate_contacts")
      .insert({
        user_id: userData.user.id,
        full_name: fullName.trim(),
        inmate_number: inmateNumber.trim(),
        facility_name: facilityName?.trim() || null,
        state: state?.trim() || null,
      })
      .select("id")
      .single();

    if (recipientError || !inserted) {
      return NextResponse.json(
        { success: false, error: "Failed to save recipient: " + (recipientError?.message || "unknown error") },
        { status: 500 }
      );
    }
    resolvedRecipientId = inserted.id;
  }

  // Create the order
  const { data: orderData, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      recipient_id: resolvedRecipientId,
      purchase_type: "single_image",
      status: "pending",
      total_cents: 199,
      customer_email: userData.user.email || null,
    })
    .select()
    .single();

  if (orderError || !orderData) {
    return NextResponse.json(
      { success: false, error: "Failed to create order: " + (orderError?.message || "unknown error") },
      { status: 500 }
    );
  }

  // Add order item
  const { error: itemError } = await supabaseAdmin.from("order_items").insert({
    order_id: orderData.id,
    generated_image_id: imageId,
    quantity: 1,
  });

  if (itemError) {
    return NextResponse.json(
      { success: false, error: "Failed to add order item: " + itemError.message },
      { status: 500 }
    );
  }

  // Add to delivery queue
  const { error: deliveryError } = await supabaseAdmin.from("delivery_queue").insert({
    order_id: orderData.id,
    recipient_id: resolvedRecipientId,
    status: "pending",
    platform: "Securus/JPay",
  });

  if (deliveryError) {
    return NextResponse.json(
      { success: false, error: "Failed to add to delivery queue: " + deliveryError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, orderId: orderData.id });
}
