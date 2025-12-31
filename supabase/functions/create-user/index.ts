import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create a Supabase client with the user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // First verify the user is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Parse request body
    const { email, password, displayName, salesRank, yearlyGoal, role } = await req.json();

    // Validate required fields
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Create user with service role key (admin privileges)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create the user with metadata
    // The handle_new_user trigger will automatically create profile, user_roles, and user_metrics
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: displayName || null,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    console.log("User created successfully:", newUser.user.id);

    // Wait a brief moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update user_roles to the specified role if admin was requested
    if (role === "admin") {
      const { error: roleUpdateError } = await adminClient
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", newUser.user.id);

      if (roleUpdateError) {
        console.error("Error updating user role:", roleUpdateError);
      } else {
        console.log("User role updated to admin");
      }
    }

    // Update user_metrics with the specified values
    const { error: metricsUpdateError } = await adminClient
      .from("user_metrics")
      .update({
        display_name: displayName || null,
        sales_rank: salesRank || "SR1",
        yearly_goal: yearlyGoal || 0,
      })
      .eq("user_id", newUser.user.id);

    if (metricsUpdateError) {
      console.error("Error updating user metrics:", metricsUpdateError);
    } else {
      console.log("User metrics updated");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
