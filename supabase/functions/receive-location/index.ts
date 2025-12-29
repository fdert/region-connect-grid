import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("=== RECEIVE LOCATION ===");
    console.log("Full payload received:", JSON.stringify(rawPayload, null, 2));
    
    // Try to extract location from various common WhatsApp/n8n payload formats
    let phone = "";
    let latitude: number | null = null;
    let longitude: number | null = null;
    let address = "";

    // Try different phone sources
    // Format: darcoom.com/wsender uses "sender"
    if (rawPayload.sender) phone = rawPayload.sender;
    if (rawPayload.phone) phone = rawPayload.phone;
    if (rawPayload.data?.phone) phone = rawPayload.data.phone;
    if (rawPayload.from) phone = rawPayload.from;
    
    console.log("Phone extracted:", phone);

    // Try different location structures
    // Format 1: darcoom.com/wsender uses raw_message.locationMessage
    if (rawPayload.raw_message?.locationMessage) {
      const loc = rawPayload.raw_message.locationMessage;
      latitude = loc.degreesLatitude || loc.latitude;
      longitude = loc.degreesLongitude || loc.longitude;
      address = loc.address || loc.name || "";
      console.log("Found location in raw_message.locationMessage:", { latitude, longitude });
    }
    
    // Format 2: WhatsApp message structure
    if (latitude === null && rawPayload.message?.locationMessage) {
      const loc = rawPayload.message.locationMessage;
      latitude = loc.degreesLatitude || loc.latitude;
      longitude = loc.degreesLongitude || loc.longitude;
      address = loc.address || loc.name || "";
      console.log("Found location in message.locationMessage:", { latitude, longitude });
    }
    
    // Format 3: Direct latitude/longitude
    if (latitude === null && rawPayload.latitude !== undefined) {
      latitude = typeof rawPayload.latitude === 'string' ? parseFloat(rawPayload.latitude) : rawPayload.latitude;
    }
    if (longitude === null && rawPayload.longitude !== undefined) {
      longitude = typeof rawPayload.longitude === 'string' ? parseFloat(rawPayload.longitude) : rawPayload.longitude;
    }
    
    // Format 4: Nested in data object
    if (latitude === null && rawPayload.data?.latitude !== undefined) {
      latitude = typeof rawPayload.data.latitude === 'string' ? parseFloat(rawPayload.data.latitude) : rawPayload.data.latitude;
    }
    if (longitude === null && rawPayload.data?.longitude !== undefined) {
      longitude = typeof rawPayload.data.longitude === 'string' ? parseFloat(rawPayload.data.longitude) : rawPayload.data.longitude;
    }
    
    // Format 5: lat/lng short names
    if (latitude === null && rawPayload.lat !== undefined) {
      latitude = typeof rawPayload.lat === 'string' ? parseFloat(rawPayload.lat) : rawPayload.lat;
    }
    if (longitude === null && rawPayload.lng !== undefined) {
      longitude = typeof rawPayload.lng === 'string' ? parseFloat(rawPayload.lng) : rawPayload.lng;
    }
    
    // Format 6: Location object
    if (rawPayload.location) {
      const loc = rawPayload.location;
      if (latitude === null) latitude = loc.latitude || loc.lat;
      if (longitude === null) longitude = loc.longitude || loc.lng;
      address = loc.address || address;
    }
    
    // Format 7: Coordinates array [lat, lng]
    if (rawPayload.coordinates && Array.isArray(rawPayload.coordinates)) {
      if (latitude === null) latitude = rawPayload.coordinates[0];
      if (longitude === null) longitude = rawPayload.coordinates[1];
    }

    // Get address from various sources
    if (!address) {
      address = rawPayload.address || rawPayload.data?.address || "";
    }

    console.log("Extracted data:", { phone, latitude, longitude, address });

    if (!phone) {
      console.error("Missing phone number");
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: phone",
          received_payload: rawPayload 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate coordinates
    const hasValidCoordinates = 
      latitude !== null && 
      longitude !== null && 
      !isNaN(latitude) && 
      !isNaN(longitude) &&
      (latitude !== 0 || longitude !== 0);

    if (!hasValidCoordinates) {
      console.error("Invalid or missing coordinates:", { latitude, longitude });
      return new Response(
        JSON.stringify({ 
          error: "Invalid coordinates. Please send valid latitude and longitude values (not 0,0).",
          received: { latitude, longitude },
          help: "Make sure your webhook sends location data. Check for fields like: raw_message.locationMessage.degreesLatitude"
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
    console.log("Valid coordinates:", { latitude, longitude });

    // Generate Google Maps URL
    const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // First try to find an active OTP session
    let { data: otpSession } = await supabase
      .from("otp_sessions")
      .select("*")
      .eq("phone", formattedPhone)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("Active session search:", otpSession ? `Found: ${otpSession.id}` : "Not found");

    // If no active session, try to find any recent session within last 24 hours
    if (!otpSession) {
      console.log("Checking for recent sessions...");
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

    // If still no session, create a new one
    if (!otpSession) {
      console.log("Creating new session for location storage...");
      
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
        console.error("Error creating session:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to store location", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("SUCCESS: Created new session with location:", newSession.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Location stored in new session",
          location_url: locationUrl,
          session_id: newSession.id,
          coordinates: { latitude, longitude }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the existing OTP session with location data
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
      console.error("Error updating session:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update location", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`SUCCESS: Location updated for ${formattedPhone}: ${locationUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Location received and stored",
        location_url: locationUrl,
        session_id: otpSession.id,
        coordinates: { latitude, longitude }
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
