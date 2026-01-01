import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header to identify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify they're an admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin checks and updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
    const { data: callerRoleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || callerRoleData?.role !== "admin") {
      console.error("Role check error:", roleError, "Role:", callerRoleData?.role);
      return new Response(
        JSON.stringify({ error: "Only admins can change user roles" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { targetUserId, newRole } = await req.json();
    
    if (!targetUserId || !newRole) {
      return new Response(
        JSON.stringify({ error: "Missing targetUserId or newRole" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["user", "canvasser"].includes(newRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'user' or 'canvasser'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} changing role for ${targetUserId} to ${newRole}`);

    // Update or insert the role
    const { error: upsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: targetUserId, role: newRole },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Role upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to update role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's display name from profiles
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", targetUserId)
      .maybeSingle();

    const displayName = profileData?.full_name || null;

    // Ensure baseline metrics exist for the new role
    if (newRole === "canvasser") {
      // Check if canvasser metrics exist
      const { data: existingCanvasserMetrics } = await supabaseAdmin
        .from("canvasser_metrics")
        .select("id")
        .eq("user_id", targetUserId)
        .limit(1);

      if (!existingCanvasserMetrics || existingCanvasserMetrics.length === 0) {
        const { error: insertError } = await supabaseAdmin
          .from("canvasser_metrics")
          .insert({
            user_id: targetUserId,
            display_name: displayName,
            metric_date: new Date().toISOString().split("T")[0],
          });

        if (insertError) {
          console.error("Failed to create canvasser metrics:", insertError);
        } else {
          console.log("Created canvasser metrics for user:", targetUserId);
        }
      }
    } else if (newRole === "user") {
      // Check if user metrics exist
      const { data: existingUserMetrics } = await supabaseAdmin
        .from("user_metrics")
        .select("id")
        .eq("user_id", targetUserId)
        .limit(1);

      if (!existingUserMetrics || existingUserMetrics.length === 0) {
        const { error: insertError } = await supabaseAdmin
          .from("user_metrics")
          .insert({
            user_id: targetUserId,
            display_name: displayName,
            sales_rank: "SR1",
            yearly_goal: 0,
            metric_date: new Date().toISOString().split("T")[0],
          });

        if (insertError) {
          console.error("Failed to create user metrics:", insertError);
        } else {
          console.log("Created user metrics for user:", targetUserId);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, newRole }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
