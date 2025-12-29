import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.log("No authorization header found");
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token length:", token.length);
    
    // Verify the user using the token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError) {
      console.log("Auth error:", authError.message);
      throw new Error("Unauthorized: " + authError.message);
    }
    
    if (!user) {
      console.log("No user found from token");
      throw new Error("Unauthorized");
    }
    
    console.log("User authenticated:", user.id);

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Access denied: Admin only");
    }

    // Fetch all users from auth.users
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profilesError) {
      throw profilesError;
    }

    // Fetch roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("*");

    if (rolesError) {
      throw rolesError;
    }

    // Combine data
    const users = authUsers.users.map((authUser) => {
      const profile = profiles?.find((p) => p.user_id === authUser.id);
      const role = roles?.find((r) => r.user_id === authUser.id);
      
      return {
        id: authUser.id,
        email: authUser.email,
        phone: authUser.phone || profile?.phone,
        full_name: profile?.full_name || authUser.user_metadata?.full_name,
        avatar_url: profile?.avatar_url,
        role: role?.role || "customer",
        role_id: role?.id,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        force_password_change: profile?.force_password_change || false,
      };
    });

    console.log(`Fetched ${users.length} users`);

    return new Response(
      JSON.stringify({ users }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
