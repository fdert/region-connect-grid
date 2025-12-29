import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LocationWebhookPayload {
  phone: string;
  latitude: number | string;
  longitude: number | string;
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

    const rawPayload = await req.json();
    console.log("Raw received payload:", JSON.stringify(rawPayload));
    
    // Extract location data - handle different payload formats from n8n
    let phone = rawPayload.phone || rawPayload.data?.phone || "";
    let latitude = rawPayload.latitude ?? rawPayload.data?.latitude ?? rawPayload.lat ?? rawPayload.data?.lat;
    let longitude = rawPayload.longitude ?? rawPayload.data?.longitude ?? rawPayload.lng ?? rawPayload.data?.lng;
    let address = rawPayload.address || rawPayload.data?.address || "";

    // Convert to numbers if strings
    latitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    longitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

    console.log("Parsed location data:", { phone, latitude, longitude, address });

    if (!phone) {
      console.error("Missing phone number");
      return new Response(
        JSON.stringify({ error: "Missing required field: phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate coordinates - must be valid numbers and not just zeros
    const isValidCoordinates = 
      typeof latitude === 'number' && 
      typeof longitude === 'number' && 
      !isNaN(latitude) && 
      !isNaN(longitude) &&
      (latitude !== 0 || longitude !== 0); // At least one should be non-zero

    if (!isValidCoordinates) {
      console.error("Invalid coordinates:", { latitude, longitude });
      return new Response(
        JSON.stringify({ 
          error: "Invalid coordinates. Please send valid latitude and longitude values.",
          received: { latitude, longitude }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    let formattedPhone = phone.toString().replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    console.log("Formatted phone:", formattedPhone);

    // Generate Google Maps URL
    const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // First try to find an active OTP session
    let { data: otpSession, error: fetchError } = await supabase
      .from("otp_sessions")
      .select("*")
      .eq("phone", formattedPhone)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("Active session search result:", otpSession ? `Found: ${otpSession.id}` : "Not found");

    // If no active session, try to find any recent session within last 24 hours
    if (!otpSession) {
      console.log("No active session found, checking for recent sessions...");
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentSession } = await supabase
        .from("otp_sessions")
        .select("*")
        .eq("phone", formattedPhone)
        .gt("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recentSession) {
        otpSession = recentSession;
        console.log("Found recent session:", recentSession.id);
      }
    }

    // If still no session, create a new one to store the location
    if (!otpSession) {
      console.log("No session found, creating new session for location storage...");
      
      const { data: newSession, error: createError } = await supabase
        .from("otp_sessions")
        .insert({
          phone: formattedPhone,
          otp_code: "LOCATION",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_verified: true,
          location_lat: latitude,
          location_lng: longitude,
          location_address: address || null,
          location_url: locationUrl
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating session for location:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to store location", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Created new session with location:", newSession.id);
      
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
        location_lat: latitude,
        location_lng: longitude,
        location_address: address || null,
        location_url: locationUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", otpSession.id);

    if (updateError) {
      console.error("Error updating OTP session:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update location", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Location updated for phone ${formattedPhone}: ${locationUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Location received and stored",
        location_url: locationUrl,
        latitude,
        longitude
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
