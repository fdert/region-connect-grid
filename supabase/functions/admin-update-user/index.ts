import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  userId: string;
  email?: string;
  password?: string;
  phone?: string;
  fullName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Access denied: Admin only");
    }

    const { userId, email, password, phone, fullName }: UpdateUserRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log(`Admin ${user.id} updating user ${userId}`);

    // Update auth user (email and/or password)
    const authUpdateData: any = {};
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;

    if (Object.keys(authUpdateData).length > 0) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdateData
      );

      if (updateAuthError) {
        throw updateAuthError;
      }
      console.log("Auth user updated successfully");
    }

    // Update profile
    const profileUpdateData: any = {};
    if (phone !== undefined) profileUpdateData.phone = phone;
    if (fullName !== undefined) profileUpdateData.full_name = fullName;
    if (email !== undefined) profileUpdateData.email = email;

    if (Object.keys(profileUpdateData).length > 0) {
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdateData)
        .eq("user_id", userId);

      if (updateProfileError) {
        throw updateProfileError;
      }
      console.log("Profile updated successfully");
    }

    return new Response(
      JSON.stringify({ success: true, message: "User updated successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error updating user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
