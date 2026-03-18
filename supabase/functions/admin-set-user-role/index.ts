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
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !callerRoleData) {
      console.error("Role check error:", roleError, "Role:", callerRoleData);
      return new Response(
        JSON.stringify({ error: "Only admins can change user roles" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { targetUserId, roles, newRole, salesRank, canvasserRank, isAdminOnly, hiddenFromLeaderboard } = body;
    
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Missing targetUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle both formats: new `roles` array or legacy `newRole` string
    let rolesToSet: string[] = [];
    if (roles && Array.isArray(roles)) {
      rolesToSet = roles;
    } else if (newRole) {
      rolesToSet = [newRole];
    }

    if (rolesToSet.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one role is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate roles - now including 'admin' and 'supplementer' as valid
    const validRoles = ['user', 'canvasser', 'admin', 'supplementer', 'production', 'office'];
    for (const role of rolesToSet) {
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role: ${role}. Must be 'user', 'canvasser', 'admin', 'supplementer', 'production', or 'office'` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate ranks if provided
    const validSalesRanks = ['SR1', 'SR2', 'SR3', 'SR4', 'SR5', 'SR6', 'Y?', 'CEO', 'GM'];
    const validCanvasserRanks = ['C1', 'C2', 'C3'];
    
    if (salesRank && !validSalesRanks.includes(salesRank)) {
      return new Response(
        JSON.stringify({ error: "Invalid sales rank" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (canvasserRank && !validCanvasserRanks.includes(canvasserRank)) {
      return new Response(
        JSON.stringify({ error: "Invalid canvasser rank" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} changing roles for ${targetUserId} to [${rolesToSet.join(', ')}], isAdminOnly: ${isAdminOnly}`);

    // Delete ALL existing roles for the user (including admin if setting new configuration)
    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);

    if (deleteError) {
      console.error("Error deleting old roles:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to update roles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new roles
    for (const role of rolesToSet) {
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: targetUserId, role });

      if (insertError) {
        // Ignore duplicate key errors (role already exists)
        if (!insertError.message.includes("duplicate")) {
          console.error("Error inserting role:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to insert role" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get the user's display name from profiles
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", targetUserId)
      .maybeSingle();

    const displayName = profileData?.full_name || null;

    // Update hidden_from_leaderboard in profiles if provided
    if (typeof hiddenFromLeaderboard === 'boolean') {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ hidden_from_leaderboard: hiddenFromLeaderboard })
        .eq('id', targetUserId);
      
      if (profileUpdateError) {
        console.error("Failed to update hidden_from_leaderboard:", profileUpdateError);
      } else {
        console.log(`Updated hidden_from_leaderboard to ${hiddenFromLeaderboard} for user ${targetUserId}`);
      }
    }

    // Determine what metrics to create/update
    const hasSalesRole = rolesToSet.includes('user');
    const hasCanvasserRole = rolesToSet.includes('canvasser');
    const hasAdminRole = rolesToSet.includes('admin');
    const hasSupplementerRole = rolesToSet.includes('supplementer');
    const hasProductionRole = rolesToSet.includes('production');
    const hasOfficeRole = rolesToSet.includes('office');

    // For admin-only users (admin but no operational roles), we don't create any metrics
    if (isAdminOnly || (hasAdminRole && !hasSalesRole && !hasCanvasserRole && !hasSupplementerRole && !hasProductionRole)) {
      console.log("Admin-only user, skipping metrics creation");
      return new Response(
        JSON.stringify({ success: true, roles: rolesToSet, adminOnly: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (hasCanvasserRole) {
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
            canvasser_rank: canvasserRank || 'C1',
          });

        if (insertError) {
          console.error("Failed to create canvasser metrics:", insertError);
        } else {
          console.log("Created canvasser metrics for user:", targetUserId);
        }
      } else if (canvasserRank) {
        // Update the rank if metrics exist and rank provided
        const { error: updateError } = await supabaseAdmin
          .from("canvasser_metrics")
          .update({ canvasser_rank: canvasserRank })
          .eq("user_id", targetUserId);
        
        if (updateError) {
          console.error("Failed to update canvasser rank:", updateError);
        }
      }
    }

    if (hasSalesRole) {
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
            sales_rank: salesRank || "SR1",
            yearly_goal: 0,
            metric_date: new Date().toISOString().split("T")[0],
          });

        if (insertError) {
          console.error("Failed to create user metrics:", insertError);
        } else {
          console.log("Created user metrics for user:", targetUserId);
        }
      } else if (salesRank) {
        // Update the rank if metrics exist and rank provided
        const { error: updateError } = await supabaseAdmin
          .from("user_metrics")
          .update({ sales_rank: salesRank })
          .eq("user_id", targetUserId);
        
        if (updateError) {
          console.error("Failed to update sales rank:", updateError);
        }
      }
    }

    if (hasSupplementerRole) {
      // Check if supplementer metrics exist
      const { data: existingSupplementerMetrics } = await supabaseAdmin
        .from("supplementer_metrics")
        .select("id")
        .eq("user_id", targetUserId)
        .limit(1);

      if (!existingSupplementerMetrics || existingSupplementerMetrics.length === 0) {
        const { error: insertError } = await supabaseAdmin
          .from("supplementer_metrics")
          .insert({
            user_id: targetUserId,
            display_name: displayName,
          });

        if (insertError) {
          console.error("Failed to create supplementer metrics:", insertError);
        } else {
          console.log("Created supplementer metrics for user:", targetUserId);
        }
      }
    }

    if (hasProductionRole) {
      // Check if production metrics exist
      const { data: existingProductionMetrics } = await supabaseAdmin
        .from("production_metrics")
        .select("id")
        .eq("user_id", targetUserId)
        .limit(1);

      if (!existingProductionMetrics || existingProductionMetrics.length === 0) {
        const { error: insertError } = await supabaseAdmin
          .from("production_metrics")
          .insert({
            user_id: targetUserId,
            display_name: displayName,
            metric_date: new Date().toISOString().split("T")[0],
          });

        if (insertError) {
          console.error("Failed to create production metrics:", insertError);
        } else {
          console.log("Created production metrics for user:", targetUserId);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, roles: rolesToSet }),
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
