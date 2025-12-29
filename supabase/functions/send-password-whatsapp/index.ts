import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordRequest {
  phone: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, password }: PasswordRequest = await req.json();

    if (!phone || !password) {
      throw new Error("Phone and password are required");
    }

    console.log(`Sending password to phone: ${phone}`);

    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "966" + cleanPhone.slice(1);
    }
    if (!cleanPhone.startsWith("966")) {
      cleanPhone = "966" + cleanPhone;
    }

    const appKey = Deno.env.get("WHATSAPP_APP_KEY");
    const authKey = Deno.env.get("WHATSAPP_AUTH_KEY");

    if (!appKey || !authKey) {
      throw new Error("WhatsApp credentials not configured");
    }

    const message = `مرحباً،

تم إنشاء كلمة مرور جديدة لحسابك:

🔐 كلمة المرور: ${password}

⚠️ ملاحظة هامة: سيُطلب منك تغيير كلمة المرور عند تسجيل الدخول القادم.

شكراً لك`;

    const response = await fetch("https://api.maytapi.com/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-maytapi-key": authKey,
      },
      body: JSON.stringify({
        app_key: appKey,
        phone: cleanPhone,
        message: message,
        type: "text",
      }),
    });

    const result = await response.json();
    console.log("WhatsApp API response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to send WhatsApp message");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Password sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending password:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
