import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationWebhookPayload {
  phone: string;
  latitude: number;
  longitude: number;
  address?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: LocationWebhookPayload = await req.json();
    
    console.log("Received location webhook:", payload);

    if (!payload.phone || payload.latitude === undefined || payload.longitude === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, latitude, longitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    let formattedPhone = payload.phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Generate Google Maps URL
    const locationUrl = `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}`;

    // Find the most recent active OTP session for this phone
    const { data: otpSession, error: fetchError } = await supabase
      .from("otp_sessions")
      .select("*")
      .eq("phone", formattedPhone)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpSession) {
      console.log(`No active OTP session found for phone: ${formattedPhone}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No active OTP session found for this phone number" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the OTP session with location data
    const { error: updateError } = await supabase
      .from("otp_sessions")
      .update({
        location_lat: payload.latitude,
        location_lng: payload.longitude,
        location_address: payload.address || null,
        location_url: locationUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", otpSession.id);

    if (updateError) {
      console.error("Error updating OTP session:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update location" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Location updated for phone ${formattedPhone}: ${locationUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Location received and stored",
        location_url: locationUrl
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Location webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
