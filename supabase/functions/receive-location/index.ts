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

    // First try to find an active OTP session
    let { data: otpSession, error: fetchError } = await supabase
      .from("otp_sessions")
      .select("*")
      .eq("phone", formattedPhone)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no active session, try to find any recent session (even expired) within last 24 hours
    if (!otpSession) {
      console.log(`No active session found, checking for recent sessions...`);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentSession, error: recentError } = await supabase
        .from("otp_sessions")
        .select("*")
        .eq("phone", formattedPhone)
        .gt("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recentSession) {
        otpSession = recentSession;
        console.log(`Found recent session: ${recentSession.id}`);
      }
    }

    // If still no session, create a new one to store the location
    if (!otpSession) {
      console.log(`No session found, creating new session for location storage...`);
      
      const { data: newSession, error: createError } = await supabase
        .from("otp_sessions")
        .insert({
          phone: formattedPhone,
          otp_code: "LOCATION",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_verified: true,
          location_lat: payload.latitude,
          location_lng: payload.longitude,
          location_address: payload.address || null,
          location_url: locationUrl
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating session for location:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to store location" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Created new session with location: ${newSession.id}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Location stored in new session",
          location_url: locationUrl,
          session_id: newSession.id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
