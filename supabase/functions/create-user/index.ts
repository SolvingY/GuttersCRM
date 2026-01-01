import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("create-user request received:", { method: req.method, url: req.url });

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("create-user: missing Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: missing token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create a Supabase client with the user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("create-user: Supabase URL configured:", !!supabaseUrl);
    console.log("create-user: Service key configured:", !!supabaseServiceKey);

    // First verify the user is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("create-user: Invalid token", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("create-user: Authenticated user:", user.id);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    console.log("create-user: Admin check result:", { roleData, roleError });

    if (roleError || !roleData) {
      console.error("create-user: non-admin attempted access", { userId: user.id, roleError });
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log("create-user: Request body keys:", Object.keys(body));
    } catch (parseError) {
      console.error("create-user: Failed to parse request body", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { email, password, displayName, salesRank, yearlyGoal, role } = body;

    // Validate required fields
    if (!email || !password) {
      console.error("create-user: Missing email or password");
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create user with service role key (admin privileges)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("create-user: Creating auth user for:", email);

    // Create the user with metadata
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: displayName || null,
      },
    });

    if (createError) {
      console.error("create-user: Error creating auth user:", createError);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (!newUser.user) {
      console.error("create-user: No user returned after creation");
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("create-user: Auth user created successfully:", newUser.user.id);

    // Wait for trigger to complete (if it exists)
    await new Promise(resolve => setTimeout(resolve, 800));

    // Use UPSERT pattern to ensure data exists regardless of trigger
    // This handles both cases: trigger exists or doesn't exist

    // 1. UPSERT profiles
    console.log("create-user: Upserting profile...");
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        full_name: displayName || null,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error("create-user: Error upserting profile:", profileError);
    } else {
      console.log("create-user: Profile upserted successfully");
    }

    // 2. UPSERT user_roles
    console.log("create-user: Upserting user role...");
    const targetRole = role === "admin" ? "admin" : "user";
    
    // First check if role exists
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", newUser.user.id)
      .single();

    if (existingRole) {
      // Update existing role
      const { error: roleUpdateError } = await adminClient
        .from("user_roles")
        .update({ role: targetRole })
        .eq("user_id", newUser.user.id);

      if (roleUpdateError) {
        console.error("create-user: Error updating user role:", roleUpdateError);
      } else {
        console.log("create-user: User role updated to:", targetRole);
      }
    } else {
      // Insert new role
      const { error: roleInsertError } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: targetRole });

      if (roleInsertError) {
        console.error("create-user: Error inserting user role:", roleInsertError);
      } else {
        console.log("create-user: User role inserted:", targetRole);
      }
    }

    // 3. UPSERT user_metrics
    console.log("create-user: Upserting user metrics...");
    
    // Check if metrics exist
    const { data: existingMetrics } = await adminClient
      .from("user_metrics")
      .select("id")
      .eq("user_id", newUser.user.id)
      .single();

    const metricsData = {
      user_id: newUser.user.id,
      display_name: displayName || null,
      sales_rank: salesRank || "SR1",
      yearly_goal: yearlyGoal || 0,
      metric_date: new Date().toISOString().split('T')[0],
    };

    if (existingMetrics) {
      // Update existing metrics
      const { error: metricsUpdateError } = await adminClient
        .from("user_metrics")
        .update({
          display_name: displayName || null,
          sales_rank: salesRank || "SR1",
          yearly_goal: yearlyGoal || 0,
        })
        .eq("user_id", newUser.user.id);

      if (metricsUpdateError) {
        console.error("create-user: Error updating user metrics:", metricsUpdateError);
      } else {
        console.log("create-user: User metrics updated");
      }
    } else {
      // Insert new metrics
      const { error: metricsInsertError } = await adminClient
        .from("user_metrics")
        .insert(metricsData);

      if (metricsInsertError) {
        console.error("create-user: Error inserting user metrics:", metricsInsertError);
      } else {
        console.log("create-user: User metrics inserted");
      }
    }

    console.log("create-user: User creation completed successfully");

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
    console.error("create-user: Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
