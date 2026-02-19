import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

// Role type configuration
interface RoleConfig {
  roles: string[];
  createSalesMetrics: boolean;
  createCanvasserMetrics: boolean;
  createSupplementerMetrics: boolean;
}

function getRoleConfig(roleType: string | undefined, legacyRole?: string): RoleConfig {
  // Handle new roleType parameter
  switch (roleType) {
    case 'admin_only':
      return { roles: ['admin'], createSalesMetrics: false, createCanvasserMetrics: false, createSupplementerMetrics: false };
    case 'sales_rep':
      return { roles: ['user'], createSalesMetrics: true, createCanvasserMetrics: false, createSupplementerMetrics: false };
    case 'canvasser':
      return { roles: ['canvasser'], createSalesMetrics: false, createCanvasserMetrics: true, createSupplementerMetrics: false };
    case 'supplementer':
      return { roles: ['supplementer'], createSalesMetrics: false, createCanvasserMetrics: false, createSupplementerMetrics: true };
    case 'super_admin':
      return { roles: ['admin', 'user', 'canvasser'], createSalesMetrics: true, createCanvasserMetrics: true, createSupplementerMetrics: false };
    default:
      if (legacyRole === 'admin') {
        return { roles: ['admin'], createSalesMetrics: true, createCanvasserMetrics: false, createSupplementerMetrics: false };
      } else if (legacyRole === 'canvasser') {
        return { roles: ['canvasser'], createSalesMetrics: false, createCanvasserMetrics: true, createSupplementerMetrics: false };
      }
      return { roles: ['user'], createSalesMetrics: true, createCanvasserMetrics: false, createSupplementerMetrics: false };
  }
}

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

    const { email, password, displayName, salesRank, canvasserRank, yearlyGoal, roleType, role } = body;

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

    // Get role configuration (handles both new roleType and legacy role parameter)
    const config = getRoleConfig(roleType, role);
    console.log("create-user: Role config:", config);

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

    // UPSERT profile
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

    // Insert all roles (the trigger won't create any since we do it first)
    console.log("create-user: Creating user roles:", config.roles);
    for (const r of config.roles) {
      // Check if role already exists
      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", newUser.user.id)
        .eq("role", r)
        .single();

      if (!existingRole) {
        const { error: roleInsertError } = await adminClient
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role: r });

        if (roleInsertError) {
          console.error(`create-user: Error inserting role ${r}:`, roleInsertError);
        } else {
          console.log(`create-user: Role ${r} inserted`);
        }
      } else {
        console.log(`create-user: Role ${r} already exists`);
      }
    }

    // Create sales metrics if needed
    if (config.createSalesMetrics) {
      console.log("create-user: Creating sales metrics...");
      
      const { data: existingMetrics } = await adminClient
        .from("user_metrics")
        .select("id")
        .eq("user_id", newUser.user.id)
        .single();

      if (existingMetrics) {
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
        const { error: metricsInsertError } = await adminClient
          .from("user_metrics")
          .insert({
            user_id: newUser.user.id,
            display_name: displayName || null,
            sales_rank: salesRank || "SR1",
            yearly_goal: yearlyGoal || 0,
            metric_date: new Date().toISOString().split('T')[0],
          });

        if (metricsInsertError) {
          console.error("create-user: Error inserting user metrics:", metricsInsertError);
        } else {
          console.log("create-user: User metrics inserted");
        }
      }
    }

    // Create canvasser metrics if needed
    if (config.createCanvasserMetrics) {
      console.log("create-user: Creating canvasser metrics...");
      
      const { data: existingCanvasserMetrics } = await adminClient
        .from("canvasser_metrics")
        .select("id")
        .eq("user_id", newUser.user.id)
        .single();

      if (existingCanvasserMetrics) {
        const { error: metricsUpdateError } = await adminClient
          .from("canvasser_metrics")
          .update({
            display_name: displayName || null,
            canvasser_rank: canvasserRank || "C1",
          })
          .eq("user_id", newUser.user.id);

        if (metricsUpdateError) {
          console.error("create-user: Error updating canvasser metrics:", metricsUpdateError);
        } else {
          console.log("create-user: Canvasser metrics updated");
        }
      } else {
        const { error: metricsInsertError } = await adminClient
          .from("canvasser_metrics")
          .insert({
            user_id: newUser.user.id,
            display_name: displayName || null,
            canvasser_rank: canvasserRank || "C1",
            metric_date: new Date().toISOString().split('T')[0],
          });

        if (metricsInsertError) {
          console.error("create-user: Error inserting canvasser metrics:", metricsInsertError);
        } else {
          console.log("create-user: Canvasser metrics inserted");
        }
      }
    }

    // Create supplementer metrics if needed
    if (config.createSupplementerMetrics) {
      console.log("create-user: Creating supplementer metrics...");
      
      const { data: existingSupplementerMetrics } = await adminClient
        .from("supplementer_metrics")
        .select("id")
        .eq("user_id", newUser.user.id)
        .single();

      if (existingSupplementerMetrics) {
        const { error: metricsUpdateError } = await adminClient
          .from("supplementer_metrics")
          .update({
            display_name: displayName || null,
          })
          .eq("user_id", newUser.user.id);

        if (metricsUpdateError) {
          console.error("create-user: Error updating supplementer metrics:", metricsUpdateError);
        } else {
          console.log("create-user: Supplementer metrics updated");
        }
      } else {
        const { error: metricsInsertError } = await adminClient
          .from("supplementer_metrics")
          .insert({
            user_id: newUser.user.id,
            display_name: displayName || null,
          });

        if (metricsInsertError) {
          console.error("create-user: Error inserting supplementer metrics:", metricsInsertError);
        } else {
          console.log("create-user: Supplementer metrics inserted");
        }
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
