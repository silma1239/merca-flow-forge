import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("Mercado Pago access token not configured");
    }

    // Get webhook payload
    const webhookData = await req.json();
    console.log("Webhook received:", webhookData);

    // Check if it's a payment notification
    if (webhookData.type !== "payment" || !webhookData.data?.id) {
      console.log("Not a payment webhook, ignoring");
      return new Response("OK", { status: 200 });
    }

    const paymentId = webhookData.data.id;

    // Get payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!mpResponse.ok) {
      throw new Error(`Failed to fetch payment details: ${mpResponse.status}`);
    }

    const paymentDetails = await mpResponse.json();
    console.log("Payment details:", paymentDetails);

    // Find order by external_reference
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('id', paymentDetails.external_reference)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", paymentDetails.external_reference);
      return new Response("Order not found", { status: 404 });
    }

    // Update order status based on payment status
    let newStatus = paymentDetails.status;
    if (paymentDetails.status_detail) {
      // Map Mercado Pago status to our status
      switch (paymentDetails.status) {
        case 'approved':
          newStatus = 'approved';
          break;
        case 'pending':
          newStatus = 'pending';
          break;
        case 'rejected':
        case 'cancelled':
          newStatus = 'failed';
          break;
        default:
          newStatus = paymentDetails.status;
      }
    }

    // Update order in database
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({ 
        payment_status: newStatus,
        mercadopago_payment_id: paymentId.toString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    // Log webhook event
    await supabaseService
      .from('payment_logs')
      .insert({
        order_id: order.id,
        mercadopago_payment_id: paymentId.toString(),
        event_type: 'webhook_received',
        payment_status: newStatus,
        raw_data: paymentDetails
      });

    console.log(`Order ${order.id} updated with status ${newStatus}`);

    // If payment was approved, trigger any post-payment actions
    if (newStatus === 'approved') {
      console.log(`Payment approved for order ${order.id}, customer can access product`);
      
      // Here you could send email notifications, update user access, etc.
      // For now, just log it
    }

    return new Response("OK", {
      headers: { ...corsHeaders },
      status: 200
    });

  } catch (error) {
    console.error("Webhook error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Webhook processing failed"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});