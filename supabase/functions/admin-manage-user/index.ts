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

    // Verify the caller is an admin (supports multi-role users)
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isCallerAdmin = callerRoles?.some(r => r.role === "admin");
    if (roleError || !isCallerAdmin) {
      console.error("Role check error:", roleError, "Roles:", callerRoles);
      return new Response(
        JSON.stringify({ error: "Only admins can manage users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { action, targetUserId, targetUserEmail, newPassword, userIds, newEmail } = body;
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["archive", "unarchive", "delete", "reset-password", "set-password", "fetch-emails", "update-email"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle fetch-emails (doesn't need targetUserId)
    if (action === "fetch-emails") {
      if (!userIds || !Array.isArray(userIds)) {
        return new Response(
          JSON.stringify({ error: "Missing userIds array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const emailMap: Record<string, string> = {};
      for (const uid of userIds) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (data?.user?.email) emailMap[uid] = data.user.email;
      }
      return new Response(
        JSON.stringify({ emailMap }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require targetUserId
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Missing targetUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle update-email (allowed on any user including admins)
    if (action === "update-email") {
      if (!newEmail || typeof newEmail !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing or invalid newEmail" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { email: newEmail }
      );
      if (updateError) {
        console.error("Update email error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Email updated for user ${targetUserId} by admin ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, action: "update-email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user is an admin (cannot archive/delete admins, supports multi-role)
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId);

    const isTargetAdmin = targetRoles?.some(r => r.role === "admin");
    if (isTargetAdmin) {
      return new Response(
        JSON.stringify({ error: "Cannot archive or delete admin users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} performing ${action} on user ${targetUserId}`);

    if (action === "archive") {
      // Update profile to mark as archived
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq("id", targetUserId);

      if (profileError) {
        console.error("Profile update error:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to archive user profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ban user from logging in (100 years)
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { ban_duration: "876000h" }
      );

      if (banError) {
        console.error("Ban error:", banError);
        // Revert profile change
        await supabaseAdmin
          .from("profiles")
          .update({ is_archived: false, archived_at: null, archived_by: null })
          .eq("id", targetUserId);
        return new Response(
          JSON.stringify({ error: "Failed to ban user from login" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "archive" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unarchive") {
      // Update profile to unarchive
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_archived: false,
          archived_at: null,
          archived_by: null,
        })
        .eq("id", targetUserId);

      if (profileError) {
        console.error("Profile update error:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to unarchive user profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove ban
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { ban_duration: "none" }
      );

      if (unbanError) {
        console.error("Unban error:", unbanError);
        // Revert profile change
        await supabaseAdmin
          .from("profiles")
          .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: user.id })
          .eq("id", targetUserId);
        return new Response(
          JSON.stringify({ error: "Failed to unban user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "unarchive" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // Permanently delete the user - this will cascade delete all related data
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to delete user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "delete" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set-password") {
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Set password error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to set password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Password set for user ${targetUserId} by admin ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, action: "set-password" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset-password") {
      // Get user email if not provided
      let emailToReset = targetUserEmail;
      
      if (!emailToReset) {
        const { data: userData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
        if (userFetchError || !userData?.user?.email) {
          console.error("Error fetching user email:", userFetchError);
          return new Response(
            JSON.stringify({ error: "Failed to get user email" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        emailToReset = userData.user.email;
      }

      // Generate password reset link
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: emailToReset,
      });

      if (resetError) {
        console.error("Reset link generation error:", resetError);
        return new Response(
          JSON.stringify({ error: "Failed to generate reset link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send password reset email using Resend
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY not configured");
        return new Response(
          JSON.stringify({ error: "Email service not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const resetUrl = resetData.properties?.action_link;
      
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Next Gen Roofing <noreply@nextgenroofingcompany.com>",
          to: [emailToReset],
          subject: "Reset Your Password - Next Gen Roofing",
          html: `
            <h1>Password Reset Request</h1>
            <p>An administrator has initiated a password reset for your account.</p>
            <p><a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Your Password</a></p>
            <p>If you did not expect this email, please contact your administrator.</p>
            <p>This link will expire in 1 hour.</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorBody = await emailResponse.text();
        console.error("Email send error:", errorBody);
        return new Response(
          JSON.stringify({ error: "Failed to send reset email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Password reset email sent to ${emailToReset}`);

      return new Response(
        JSON.stringify({ success: true, action: "reset-password", email: emailToReset }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
