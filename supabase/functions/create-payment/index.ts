import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  productId: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  selectedBumps: string[];
  couponCode?: string;
  subtotal: number;
  discount: number;
  total: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const paymentData: PaymentRequest = await req.json();
    console.log("Processing payment request:", paymentData);

    // Get Mercado Pago access token from secrets
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("Mercado Pago access token not configured");
    }

    // Validate product exists
    const { data: product, error: productError } = await supabaseService
      .from('products')
      .select('*')
      .eq('id', paymentData.productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      throw new Error("Product not found or inactive");
    }

    // Get order bump products if any
    const orderBumpProducts: any[] = [];
    if (paymentData.selectedBumps.length > 0) {
      const { data: bumps, error: bumpsError } = await supabaseService
        .from('order_bumps')
        .select(`
          *,
          product:products!order_bumps_bump_product_id_fkey (*)
        `)
        .in('id', paymentData.selectedBumps)
        .eq('is_active', true);

      if (!bumpsError && bumps) {
        orderBumpProducts.push(...bumps);
      }
    }

    // Validate coupon if provided
    let validCoupon = null;
    if (paymentData.couponCode) {
      const { data: coupon, error: couponError } = await supabaseService
        .from('coupons')
        .select('*')
        .eq('code', paymentData.couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (!couponError && coupon) {
        // Check if coupon is still valid
        if (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) {
          if (coupon.min_order_amount <= paymentData.subtotal) {
            validCoupon = coupon;
          }
        }
      }
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
        coupon_code: validCoupon?.code,
        payment_status: 'pending',
        redirect_url: product.redirect_url
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error("Failed to create order");
    }

    // Create order items
    const orderItems = [
      {
        order_id: order.id,
        product_id: product.id,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        is_order_bump: false
      }
    ];

    // Add order bump items
    orderBumpProducts.forEach(bump => {
      const discountedPrice = bump.product.price * (1 - bump.discount_percentage / 100);
      orderItems.push({
        order_id: order.id,
        product_id: bump.product.id,
        quantity: 1,
        unit_price: discountedPrice,
        total_price: discountedPrice,
        is_order_bump: true
      });
    });

    await supabaseService
      .from('order_items')
      .insert(orderItems);

    // Create Mercado Pago preference
    const items = [
      {
        id: product.id,
        title: product.name,
        description: product.description || product.name,
        quantity: 1,
        currency_id: "ARS", // Change based on your currency
        unit_price: product.price
      }
    ];

    // Add order bump items to Mercado Pago
    orderBumpProducts.forEach(bump => {
      const discountedPrice = bump.product.price * (1 - bump.discount_percentage / 100);
      items.push({
        id: bump.product.id,
        title: bump.title,
        description: bump.description || bump.title,
        quantity: 1,
        currency_id: "ARS",
        unit_price: discountedPrice
      });
    });

    const preference = {
      items,
      payer: {
        name: paymentData.customerInfo.name,
        email: paymentData.customerInfo.email,
        phone: paymentData.customerInfo.phone ? {
          number: paymentData.customerInfo.phone
        } : undefined
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: 1
      },
      shipments: {
        cost: 0,
        mode: "not_specified"
      },
      back_urls: {
        success: `${req.headers.get('origin')}/payment-success?order=${order.id}`,
        failure: `${req.headers.get('origin')}/payment-failure?order=${order.id}`,
        pending: `${req.headers.get('origin')}/payment-success?order=${order.id}`
      },
      auto_return: "approved",
      external_reference: order.id,
      notification_url: `${req.headers.get('origin')}/api/webhook`, // For webhook handling
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Apply coupon discount at Mercado Pago level if needed
    if (validCoupon && paymentData.discount > 0) {
      // Note: Mercado Pago handles discounts differently
      // You might want to create a discount item with negative value
      items.push({
        id: 'discount',
        title: `Descuento: ${validCoupon.code}`,
        description: `Cupón de descuento aplicado`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: -paymentData.discount
      });
    }

    console.log("Creating Mercado Pago preference:", preference);

    // Create preference in Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("Mercado Pago API error:", errorText);
      throw new Error(`Mercado Pago API error: ${mpResponse.status}`);
    }

    const mpData = await mpResponse.json();
    console.log("Mercado Pago preference created:", mpData);

    // Update order with Mercado Pago preference ID
    await supabaseService
      .from('orders')
      .update({ mercadopago_preference_id: mpData.id })
      .eq('id', order.id);

    // Log payment creation
    await supabaseService
      .from('payment_logs')
      .insert({
        order_id: order.id,
        event_type: 'preference_created',
        raw_data: mpData
      });

    return new Response(
      JSON.stringify({
        checkoutUrl: mpData.init_point, // This is the URL to redirect user to
        orderId: order.id,
        preferenceId: mpData.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Payment creation error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create payment"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});