import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find all open canvasser shifts
    const { data: openShifts, error: shiftErr } = await supabaseAdmin
      .from("canvasser_shifts")
      .select("id, canvasser_id, clock_in_at, status")
      .in("status", ["active", "flagged"])
      .is("clock_out_at", null);

    if (shiftErr) throw shiftErr;

    if (!openShifts || openShifts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No open shifts to close" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9 PM CST = current day at 21:00 in America/Chicago (UTC-6 standard, UTC-5 daylight)
    // We'll use the current UTC time and compute 9 PM CST for today
    const now = new Date();
    // Create 9 PM CST cutoff: use fixed offset approach
    // CST = UTC-6, CDT = UTC-5. For simplicity we cap hours at now.
    const cutoffTime = now;

    const closedNames: string[] = [];

    for (const shift of openShifts) {
      const clockIn = new Date(shift.clock_in_at);
      // Calculate hours worked from clock-in to now (the 9 PM cutoff)
      const hoursWorked = Math.round(((cutoffTime.getTime() - clockIn.getTime()) / 3600000) * 100) / 100;
      const cappedHours = Math.min(hoursWorked, 12); // safety cap at 12 hours

      // Close the shift
      await supabaseAdmin
        .from("canvasser_shifts")
        .update({
          clock_out_at: cutoffTime.toISOString(),
          hours_worked: cappedHours,
          status: "auto_closed",
          flagged_reason: "Auto clock-out — 9 PM CST daily cutoff",
        })
        .eq("id", shift.id);

      // Update 3-tier metrics: daily, weekly, YTD
      // We do direct DB updates here since we can't import the client-side utility
      const entryDate = clockIn.toISOString().split("T")[0];

      // TIER 1: Daily entry
      const { data: existingDaily } = await supabaseAdmin
        .from("daily_canvasser_metric_entries")
        .select("id, hours_worked_delta")
        .eq("user_id", shift.canvasser_id)
        .eq("entry_date", entryDate)
        .maybeSingle();

      if (existingDaily) {
        await supabaseAdmin
          .from("daily_canvasser_metric_entries")
          .update({
            hours_worked_delta: Math.max(0, (Number(existingDaily.hours_worked_delta) || 0) + cappedHours),
            shifts_worked_delta: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDaily.id);
      } else {
        await supabaseAdmin
          .from("daily_canvasser_metric_entries")
          .insert({
            user_id: shift.canvasser_id,
            entry_date: entryDate,
            hours_worked_delta: cappedHours,
            shifts_worked_delta: 1,
          });
      }

      // TIER 2: Weekly aggregate (Thursday-based week)
      const shiftDate = clockIn;
      const dayOfWeek = shiftDate.getDay(); // 0=Sun
      // Thursday = 4. Calculate days since last Thursday
      const daysSinceThursday = (dayOfWeek + 7 - 4) % 7;
      const weekStartDate = new Date(shiftDate);
      weekStartDate.setDate(shiftDate.getDate() - daysSinceThursday);
      const weekStart = weekStartDate.toISOString().split("T")[0];
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      const weekEnd = weekEndDate.toISOString().split("T")[0];

      const { data: weeklyRow } = await supabaseAdmin
        .from("weekly_canvasser_metrics")
        .select("id, hours_worked")
        .eq("user_id", shift.canvasser_id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (weeklyRow) {
        await supabaseAdmin
          .from("weekly_canvasser_metrics")
          .update({
            hours_worked: Math.max(0, (Number(weeklyRow.hours_worked) || 0) + cappedHours),
          })
          .eq("id", weeklyRow.id);
      } else {
        await supabaseAdmin
          .from("weekly_canvasser_metrics")
          .insert({
            user_id: shift.canvasser_id,
            week_start: weekStart,
            week_end: weekEnd,
            hours_worked: cappedHours,
          });
      }

      // TIER 3: YTD
      const { data: ytdRow } = await supabaseAdmin
        .from("canvasser_metrics")
        .select("id, hours_worked")
        .eq("user_id", shift.canvasser_id)
        .maybeSingle();

      if (ytdRow) {
        await supabaseAdmin
          .from("canvasser_metrics")
          .update({
            hours_worked: Math.max(0, (Number(ytdRow.hours_worked) || 0) + cappedHours),
          })
          .eq("id", ytdRow.id);
      }

      // Get canvasser name
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", shift.canvasser_id)
        .maybeSingle();

      closedNames.push(profile?.full_name || shift.canvasser_id);
    }

    // Send ONE summary email to Matt Fowler
    if (closedNames.length > 0) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const APP_URL = Deno.env.get("APP_URL") || "https://nextgenroofing.lovable.app";
        const listHtml = closedNames.map((n) => `<li style="padding:4px 0;">${n}</li>`).join("");

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 24px; margin: 0;">🔴 9 PM Auto Clock-Out Summary</h1>
    <p style="color: #c91f5e; font-size: 14px; margin: 8px 0 0;">Next Generation Roofing</p>
  </div>
  <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin: 0 0 16px;">
      The following <strong>${closedNames.length}</strong> canvasser(s) were automatically clocked out at 9 PM CST because they did not manually clock out:
    </p>
    
    <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
      <ul style="margin: 0; padding-left: 20px;">${listHtml}</ul>
    </div>
    
    <p style="margin: 16px 0; color: #666;">
      Please review these shifts in the admin panel. Canvassers may need to adjust their hours.
    </p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${APP_URL}/admin/timeclock" style="display: inline-block; background: #ef4444; color: #fff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        REVIEW SHIFTS
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999; text-align: center;">
      Next Generation Roofing • Daily Auto Clock-Out Summary
    </p>
  </div>
</body>
</html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Next Generation Roofing <notifications@oknextgen.com>",
            to: ["m.fowler@oknextgen.com"],
            subject: `🔴 9 PM Auto Clock-Out — ${closedNames.length} canvasser(s)`,
            html,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, closed: closedNames.length, names: closedNames }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auto-clockout-9pm error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
