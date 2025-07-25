import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransparentPaymentRequest {
  productId: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    document?: string;
  };
  selectedBumps: string[];
  couponCode?: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'pix' | 'credit_card' | 'boleto';
  cardData?: {
    number: string;
    name: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
  installments?: number;
  document?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const paymentData: TransparentPaymentRequest = await req.json();
    console.log("Processing transparent payment:", paymentData);

    // Get access token from database or environment
    let accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    // Try to get token from database first
    const { data: tokenData } = await supabaseService
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'MERCADO_PAGO_ACCESS_TOKEN')
      .single();
    
    if (tokenData?.setting_value) {
      accessToken = tokenData.setting_value;
    }

    if (!accessToken) {
      throw new Error("Mercado Pago access token not configured");
    }

    // Validate product
    const { data: product, error: productError } = await supabaseService
      .from('products')
      .select('*')
      .eq('id', paymentData.productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    // Create order in database
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        customer_email: paymentData.customerInfo.email,
        customer_name: paymentData.customerInfo.name,
        customer_phone: paymentData.customerInfo.phone,
        subtotal: paymentData.subtotal,
        discount_amount: paymentData.discount,
        total_amount: paymentData.total,
        coupon_code: paymentData.couponCode,
        payment_status: 'pending',
        payment_method: paymentData.paymentMethod,
        redirect_url: product.redirect_url
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error("Failed to create order");
    }

    // Create payment with Mercado Pago Payment API (transparent checkout)
    const paymentPayload: any = {
      transaction_amount: Math.round(paymentData.total * 100) / 100,
      description: product.name,
      external_reference: order.id,
      payer: {
        email: paymentData.customerInfo.email,
        first_name: paymentData.customerInfo.name.split(' ')[0],
        last_name: paymentData.customerInfo.name.split(' ').slice(1).join(' ') || 'N/A',
        identification: paymentData.customerInfo.document ? {
          type: "CPF",
          number: paymentData.customerInfo.document
        } : undefined
      },
      notification_url: `https://ohttikmdrihmjtzmgwie.supabase.co/functions/v1/mercadopago-webhook`,
      metadata: {
        order_id: order.id
      }
    };

    // Configure payment method
    if (paymentData.paymentMethod === 'pix') {
      paymentPayload.payment_method_id = 'pix';
    } else if (paymentData.paymentMethod === 'credit_card') {
      // For credit card, we need to detect the card brand and configure accordingly
      const cardNumber = paymentData.cardData?.number?.replace(/\s/g, '') || '';
      let paymentMethodId = 'visa'; // default
      
      if (cardNumber.startsWith('4')) paymentMethodId = 'visa';
      else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) paymentMethodId = 'master';
      else if (cardNumber.startsWith('3')) paymentMethodId = 'amex';
      else if (cardNumber.startsWith('6')) paymentMethodId = 'elo';
      
      paymentPayload.payment_method_id = paymentMethodId;
      paymentPayload.installments = paymentData.installments || 1;
      
      // Add card information for transparent checkout
      if (paymentData.cardData) {
        paymentPayload.card = {
          number: cardNumber,
          security_code: paymentData.cardData.cvv,
          expiration_month: parseInt(paymentData.cardData.expiryMonth),
          expiration_year: parseInt('20' + paymentData.cardData.expiryYear),
          cardholder: {
            name: paymentData.cardData.name,
            identification: paymentData.document ? {
              type: paymentData.document.length <= 11 ? 'CPF' : 'CNPJ',
              number: paymentData.document
            } : undefined
          }
        };
      }
    } else if (paymentData.paymentMethod === 'boleto') {
      paymentPayload.payment_method_id = 'bolbradesco';
      paymentPayload.date_of_expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 days
    }

    console.log("Creating transparent payment:", paymentPayload);

    // Create payment
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": order.id
      },
      body: JSON.stringify(paymentPayload)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("Mercado Pago Payment API error:", errorText);
      throw new Error(`Payment creation failed: ${mpResponse.status}`);
    }

    const paymentResult = await mpResponse.json();
    console.log("Payment created:", paymentResult);

    // Update order with payment details
    await supabaseService
      .from('orders')
      .update({ 
        mercadopago_payment_id: paymentResult.id,
        payment_status: paymentResult.status 
      })
      .eq('id', order.id);

    // Log payment
    await supabaseService
      .from('payment_logs')
      .insert({
        order_id: order.id,
        mercadopago_payment_id: paymentResult.id,
        event_type: 'payment_created',
        payment_status: paymentResult.status,
        raw_data: paymentResult
      });

    // Return payment information for the frontend
    const response: any = {
      orderId: order.id,
      paymentId: paymentResult.id,
      status: paymentResult.status,
      paymentMethod: paymentData.paymentMethod
    };

    // Include payment method specific data
    if (paymentData.paymentMethod === 'pix') {
      response.pix = {
        qr_code: paymentResult.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: paymentResult.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: paymentResult.point_of_interaction?.transaction_data?.ticket_url
      };
    } else if (paymentData.paymentMethod === 'boleto') {
      response.boleto = {
        pdf_url: paymentResult.transaction_details?.external_resource_url,
        barcode: paymentResult.barcode?.content
      };
    }

    // Log payment creation
    await supabaseService
      .from('payment_notifications')
      .insert({
        order_id: order.id,
        payment_id: paymentResult.id,
        event_type: 'payment_created',
        status: paymentResult.status,
        data: paymentResult
      });

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Transparent payment error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process payment"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});