export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_spend_tracking: {
        Row: {
          ad_spend: number
          created_at: string
          id: string
          month: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ad_spend?: number
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ad_spend?: number
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title?: string
        }
        Relationships: []
      }
      auto_assignment_settings: {
        Row: {
          assignment_method: string
          enabled: boolean
          id: string
          max_leads_per_rep: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignment_method?: string
          enabled?: boolean
          id?: string
          max_leads_per_rep?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignment_method?: string
          enabled?: boolean
          id?: string
          max_leads_per_rep?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      canvasser_metrics: {
        Row: {
          canvasser_rank: string | null
          contest_points: number | null
          conversations_had: number | null
          created_at: string | null
          display_name: string | null
          doors_knocked: number | null
          hours_worked: number | null
          id: string
          income: number | null
          income_goal: number | null
          leads_closed: number | null
          leads_set: number | null
          leads_set_goal: number | null
          leads_with_damage: number | null
          leads_without_damage: number | null
          metric_date: string
          not_interested: number | null
          points: number | null
          shifts_worked: number | null
          updated_at: string | null
          user_id: string
          wager_points: number | null
          yearly_goal: number | null
        }
        Insert: {
          canvasser_rank?: string | null
          contest_points?: number | null
          conversations_had?: number | null
          created_at?: string | null
          display_name?: string | null
          doors_knocked?: number | null
          hours_worked?: number | null
          id?: string
          income?: number | null
          income_goal?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_set_goal?: number | null
          leads_with_damage?: number | null
          leads_without_damage?: number | null
          metric_date?: string
          not_interested?: number | null
          points?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id: string
          wager_points?: number | null
          yearly_goal?: number | null
        }
        Update: {
          canvasser_rank?: string | null
          contest_points?: number | null
          conversations_had?: number | null
          created_at?: string | null
          display_name?: string | null
          doors_knocked?: number | null
          hours_worked?: number | null
          id?: string
          income?: number | null
          income_goal?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_set_goal?: number | null
          leads_with_damage?: number | null
          leads_without_damage?: number | null
          metric_date?: string
          not_interested?: number | null
          points?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id?: string
          wager_points?: number | null
          yearly_goal?: number | null
        }
        Relationships: []
      }
      company_goals: {
        Row: {
          canvasser_leads_goal: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          fiscal_year_end: string
          fiscal_year_start: string
          id: string
          sales_revenue_goal: number | null
          target_cost_per_lead: number | null
          target_lead_to_close_ratio: number | null
          updated_at: string | null
        }
        Insert: {
          canvasser_leads_goal?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_year_end: string
          fiscal_year_start: string
          id?: string
          sales_revenue_goal?: number | null
          target_cost_per_lead?: number | null
          target_lead_to_close_ratio?: number | null
          updated_at?: string | null
        }
        Update: {
          canvasser_leads_goal?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_year_end?: string
          fiscal_year_start?: string
          id?: string
          sales_revenue_goal?: number | null
          target_cost_per_lead?: number | null
          target_lead_to_close_ratio?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contest_victories: {
        Row: {
          acknowledged: boolean | null
          contest_id: string
          created_at: string | null
          id: string
          place: number
          points_awarded: number
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          contest_id: string
          created_at?: string | null
          id?: string
          place: number
          points_awarded?: number
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          contest_id?: string
          created_at?: string | null
          id?: string
          place?: number
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_victories_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          icon: string | null
          id: string
          is_active: boolean | null
          metric_type: string
          points_awarded: boolean | null
          prize_2nd_description: string | null
          prize_2nd_value: number | null
          prize_3rd_description: string | null
          prize_3rd_value: number | null
          prize_description: string
          prize_value: number | null
          start_date: string
          target_role: string | null
          title: string
          updated_at: string | null
          winner_2nd_display_name: string | null
          winner_2nd_user_id: string | null
          winner_3rd_display_name: string | null
          winner_3rd_user_id: string | null
          winner_display_name: string | null
          winner_user_id: string | null
          winner_value: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          metric_type?: string
          points_awarded?: boolean | null
          prize_2nd_description?: string | null
          prize_2nd_value?: number | null
          prize_3rd_description?: string | null
          prize_3rd_value?: number | null
          prize_description: string
          prize_value?: number | null
          start_date: string
          target_role?: string | null
          title: string
          updated_at?: string | null
          winner_2nd_display_name?: string | null
          winner_2nd_user_id?: string | null
          winner_3rd_display_name?: string | null
          winner_3rd_user_id?: string | null
          winner_display_name?: string | null
          winner_user_id?: string | null
          winner_value?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          metric_type?: string
          points_awarded?: boolean | null
          prize_2nd_description?: string | null
          prize_2nd_value?: number | null
          prize_3rd_description?: string | null
          prize_3rd_value?: number | null
          prize_description?: string
          prize_value?: number | null
          start_date?: string
          target_role?: string | null
          title?: string
          updated_at?: string | null
          winner_2nd_display_name?: string | null
          winner_2nd_user_id?: string | null
          winner_3rd_display_name?: string | null
          winner_3rd_user_id?: string | null
          winner_display_name?: string | null
          winner_user_id?: string | null
          winner_value?: number | null
        }
        Relationships: []
      }
      daily_canvasser_metric_entries: {
        Row: {
          conversations_had_delta: number | null
          created_at: string
          doors_knocked_delta: number | null
          entered_by: string | null
          entry_date: string
          hours_worked_delta: number | null
          id: string
          income_delta: number | null
          leads_closed_delta: number | null
          leads_set_delta: number | null
          leads_with_damage_delta: number | null
          leads_without_damage_delta: number | null
          not_interested_delta: number | null
          notes: string | null
          points_earned: number | null
          shifts_worked_delta: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversations_had_delta?: number | null
          created_at?: string
          doors_knocked_delta?: number | null
          entered_by?: string | null
          entry_date?: string
          hours_worked_delta?: number | null
          id?: string
          income_delta?: number | null
          leads_closed_delta?: number | null
          leads_set_delta?: number | null
          leads_with_damage_delta?: number | null
          leads_without_damage_delta?: number | null
          not_interested_delta?: number | null
          notes?: string | null
          points_earned?: number | null
          shifts_worked_delta?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversations_had_delta?: number | null
          created_at?: string
          doors_knocked_delta?: number | null
          entered_by?: string | null
          entry_date?: string
          hours_worked_delta?: number | null
          id?: string
          income_delta?: number | null
          leads_closed_delta?: number | null
          leads_set_delta?: number | null
          leads_with_damage_delta?: number | null
          leads_without_damage_delta?: number | null
          not_interested_delta?: number | null
          notes?: string | null
          points_earned?: number | null
          shifts_worked_delta?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_user_metric_entries: {
        Row: {
          approved_revenue_delta: number | null
          canvass_deals_closed_delta: number | null
          canvass_leads_delta: number | null
          closed_deals_delta: number | null
          collections_delta: number | null
          created_at: string
          earnings_delta: number | null
          entered_by: string | null
          entry_date: string
          id: string
          leads_delta: number | null
          notes: string | null
          points_earned: number | null
          sales_delta: number | null
          self_generated_deals_delta: number | null
          self_generated_leads_delta: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_revenue_delta?: number | null
          canvass_deals_closed_delta?: number | null
          canvass_leads_delta?: number | null
          closed_deals_delta?: number | null
          collections_delta?: number | null
          created_at?: string
          earnings_delta?: number | null
          entered_by?: string | null
          entry_date?: string
          id?: string
          leads_delta?: number | null
          notes?: string | null
          points_earned?: number | null
          sales_delta?: number | null
          self_generated_deals_delta?: number | null
          self_generated_leads_delta?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_revenue_delta?: number | null
          canvass_deals_closed_delta?: number | null
          canvass_leads_delta?: number | null
          closed_deals_delta?: number | null
          collections_delta?: number | null
          created_at?: string
          earnings_delta?: number | null
          entered_by?: string | null
          entry_date?: string
          id?: string
          leads_delta?: number | null
          notes?: string | null
          points_earned?: number | null
          sales_delta?: number | null
          self_generated_deals_delta?: number | null
          self_generated_leads_delta?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_code: string
          invited_by: string | null
          is_used: boolean
          preset_canvasser_rank: string | null
          preset_display_name: string | null
          preset_role: Database["public"]["Enums"]["app_role"]
          preset_sales_rank: string | null
          preset_yearly_goal: number | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invite_code: string
          invited_by?: string | null
          is_used?: boolean
          preset_canvasser_rank?: string | null
          preset_display_name?: string | null
          preset_role?: Database["public"]["Enums"]["app_role"]
          preset_sales_rank?: string | null
          preset_yearly_goal?: number | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invited_by?: string | null
          is_used?: boolean
          preset_canvasser_rank?: string | null
          preset_display_name?: string | null
          preset_role?: Database["public"]["Enums"]["app_role"]
          preset_sales_rank?: string | null
          preset_yearly_goal?: number | null
          used_at?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          admin_notes: string | null
          alignment_category: string
          archived: boolean
          archived_at: string | null
          availability: string
          contacted_at: string | null
          created_at: string
          created_user_id: string | null
          current_job_title: string | null
          desired_position: string
          dna_answers: Json
          dna_score: number
          email: string
          full_name: string
          hired_at: string | null
          id: string
          interview_notes: string | null
          narrative_mentor: string
          narrative_ownership: string
          narrative_why_ngr: string
          phone: string
          recommended_role: string | null
          red_flags: Json
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string
          years_experience: string
        }
        Insert: {
          admin_notes?: string | null
          alignment_category: string
          archived?: boolean
          archived_at?: string | null
          availability: string
          contacted_at?: string | null
          created_at?: string
          created_user_id?: string | null
          current_job_title?: string | null
          desired_position: string
          dna_answers: Json
          dna_score: number
          email: string
          full_name: string
          hired_at?: string | null
          id?: string
          interview_notes?: string | null
          narrative_mentor: string
          narrative_ownership: string
          narrative_why_ngr: string
          phone: string
          recommended_role?: string | null
          red_flags?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
          years_experience: string
        }
        Update: {
          admin_notes?: string | null
          alignment_category?: string
          archived?: boolean
          archived_at?: string | null
          availability?: string
          contacted_at?: string | null
          created_at?: string
          created_user_id?: string | null
          current_job_title?: string | null
          desired_position?: string
          dna_answers?: Json
          dna_score?: number
          email?: string
          full_name?: string
          hired_at?: string | null
          id?: string
          interview_notes?: string | null
          narrative_mentor?: string
          narrative_ownership?: string
          narrative_why_ngr?: string
          phone?: string
          recommended_role?: string | null
          red_flags?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
          years_experience?: string
        }
        Relationships: []
      }
      lead_activity_log: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string
          id: string
          lead_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          thread: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          thread?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          thread?: string
          user_id?: string
        }
        Relationships: []
      }
      leads_attribution: {
        Row: {
          canvasser_id: string
          closed_at: string | null
          created_at: string | null
          deal_value: number | null
          id: string
          lead_status: string | null
          sales_rep_id: string | null
        }
        Insert: {
          canvasser_id: string
          closed_at?: string | null
          created_at?: string | null
          deal_value?: number | null
          id?: string
          lead_status?: string | null
          sales_rep_id?: string | null
        }
        Update: {
          canvasser_id?: string
          closed_at?: string | null
          created_at?: string | null
          deal_value?: number | null
          id?: string
          lead_status?: string | null
          sales_rep_id?: string | null
        }
        Relationships: []
      }
      pit_point_transactions: {
        Row: {
          balance_after: number
          created_at: string | null
          id: string
          points_change: number
          transaction_type: string
          user_id: string
          wager_id: string | null
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          id?: string
          points_change: number
          transaction_type: string
          user_id: string
          wager_id?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          id?: string
          points_change?: number
          transaction_type?: string
          user_id?: string
          wager_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pit_point_transactions_wager_id_fkey"
            columns: ["wager_id"]
            isOneToOne: false
            referencedRelation: "pit_wagers"
            referencedColumns: ["id"]
          },
        ]
      }
      pit_wager_events: {
        Row: {
          contest_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          max_wager: number | null
          min_wager: number | null
          resolved_at: string | null
          resolves_at: string | null
          status: string
          title: string
          updated_at: string | null
          wagers_close_at: string
        }
        Insert: {
          contest_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          max_wager?: number | null
          min_wager?: number | null
          resolved_at?: string | null
          resolves_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
          wagers_close_at: string
        }
        Update: {
          contest_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          max_wager?: number | null
          min_wager?: number | null
          resolved_at?: string | null
          resolves_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          wagers_close_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pit_wager_events_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      pit_wager_options: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_winner: boolean | null
          option_label: string
          payout_multiplier: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_winner?: boolean | null
          option_label: string
          payout_multiplier?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_winner?: boolean | null
          option_label?: string
          payout_multiplier?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pit_wager_options_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pit_wager_events"
            referencedColumns: ["id"]
          },
        ]
      }
      pit_wagers: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          option_id: string
          points_wagered: number
          points_won: number | null
          potential_payout: number
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          option_id: string
          points_wagered: number
          points_won?: number | null
          potential_payout: number
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          option_id?: string
          points_wagered?: number
          points_won?: number | null
          potential_payout?: number
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pit_wagers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pit_wager_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pit_wagers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "pit_wager_options"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          hidden_from_leaderboard: boolean | null
          id: string
          is_archived: boolean | null
          preferred_view: string | null
          tour_completed: boolean | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          hidden_from_leaderboard?: boolean | null
          id: string
          is_archived?: boolean | null
          preferred_view?: string | null
          tour_completed?: boolean | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          hidden_from_leaderboard?: boolean | null
          id?: string
          is_archived?: boolean | null
          preferred_view?: string | null
          tour_completed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          best_contact_time: string[] | null
          city: string
          contacted_at: string | null
          counted_as_lead: boolean
          created_at: string
          created_by: string | null
          email: string
          followup_count: number
          form_data: Json
          full_name: string
          id: string
          last_followup_at: string | null
          lead_counted_at: string | null
          lead_source: string
          lead_type: string
          lost_at: string | null
          lost_reason: string | null
          manually_created: boolean
          next_followup_due: string | null
          phone: string
          photo_urls: string[] | null
          priority: string
          quote_amount: number | null
          quote_approved: boolean | null
          quote_approved_at: string | null
          quote_approved_by: string | null
          quote_rejected_reason: string | null
          quote_sent_at: string | null
          quote_status: string | null
          quote_submitted_at: string | null
          quote_submitted_by: string | null
          quoted_at: string | null
          reference_number: string | null
          referral_source: string | null
          service_type: string
          state: string
          status: string
          street_address: string
          updated_at: string
          won_at: string | null
          zip_code: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          best_contact_time?: string[] | null
          city: string
          contacted_at?: string | null
          counted_as_lead?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          followup_count?: number
          form_data?: Json
          full_name: string
          id?: string
          last_followup_at?: string | null
          lead_counted_at?: string | null
          lead_source?: string
          lead_type?: string
          lost_at?: string | null
          lost_reason?: string | null
          manually_created?: boolean
          next_followup_due?: string | null
          phone: string
          photo_urls?: string[] | null
          priority?: string
          quote_amount?: number | null
          quote_approved?: boolean | null
          quote_approved_at?: string | null
          quote_approved_by?: string | null
          quote_rejected_reason?: string | null
          quote_sent_at?: string | null
          quote_status?: string | null
          quote_submitted_at?: string | null
          quote_submitted_by?: string | null
          quoted_at?: string | null
          reference_number?: string | null
          referral_source?: string | null
          service_type: string
          state?: string
          status?: string
          street_address: string
          updated_at?: string
          won_at?: string | null
          zip_code: string
        }
        Update: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          best_contact_time?: string[] | null
          city?: string
          contacted_at?: string | null
          counted_as_lead?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          followup_count?: number
          form_data?: Json
          full_name?: string
          id?: string
          last_followup_at?: string | null
          lead_counted_at?: string | null
          lead_source?: string
          lead_type?: string
          lost_at?: string | null
          lost_reason?: string | null
          manually_created?: boolean
          next_followup_due?: string | null
          phone?: string
          photo_urls?: string[] | null
          priority?: string
          quote_amount?: number | null
          quote_approved?: boolean | null
          quote_approved_at?: string | null
          quote_approved_by?: string | null
          quote_rejected_reason?: string | null
          quote_sent_at?: string | null
          quote_status?: string | null
          quote_submitted_at?: string | null
          quote_submitted_by?: string | null
          quoted_at?: string | null
          reference_number?: string | null
          referral_source?: string | null
          service_type?: string
          state?: string
          status?: string
          street_address?: string
          updated_at?: string
          won_at?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      report_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_announcement_reads: {
        Row: {
          announcement_id: string | null
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_metrics: {
        Row: {
          approved_revenue: number | null
          canvass_deals_closed: number | null
          canvass_leads: number | null
          closed_deals: number | null
          collections: number | null
          contest_points: number | null
          created_at: string
          display_name: string | null
          earnings_ytd: number | null
          id: string
          internet_leads: number
          internet_leads_closed: number
          leads: number | null
          metric_date: string
          points: number | null
          sales: number | null
          sales_rank: string | null
          self_generated_deals: number | null
          self_generated_leads: number | null
          updated_at: string
          user_id: string
          wager_points: number | null
          yearly_goal: number | null
        }
        Insert: {
          approved_revenue?: number | null
          canvass_deals_closed?: number | null
          canvass_leads?: number | null
          closed_deals?: number | null
          collections?: number | null
          contest_points?: number | null
          created_at?: string
          display_name?: string | null
          earnings_ytd?: number | null
          id?: string
          internet_leads?: number
          internet_leads_closed?: number
          leads?: number | null
          metric_date?: string
          points?: number | null
          sales?: number | null
          sales_rank?: string | null
          self_generated_deals?: number | null
          self_generated_leads?: number | null
          updated_at?: string
          user_id: string
          wager_points?: number | null
          yearly_goal?: number | null
        }
        Update: {
          approved_revenue?: number | null
          canvass_deals_closed?: number | null
          canvass_leads?: number | null
          closed_deals?: number | null
          collections?: number | null
          contest_points?: number | null
          created_at?: string
          display_name?: string | null
          earnings_ytd?: number | null
          id?: string
          internet_leads?: number
          internet_leads_closed?: number
          leads?: number | null
          metric_date?: string
          points?: number | null
          sales?: number | null
          sales_rank?: string | null
          self_generated_deals?: number | null
          self_generated_leads?: number | null
          updated_at?: string
          user_id?: string
          wager_points?: number | null
          yearly_goal?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_canvasser_metrics: {
        Row: {
          canvasser_rank: string | null
          conversations_had: number | null
          created_at: string
          doors_knocked: number | null
          hours_worked: number | null
          id: string
          income: number | null
          leads_closed: number | null
          leads_set: number | null
          leads_with_damage: number | null
          leads_without_damage: number | null
          not_interested: number | null
          points_earned: number | null
          shifts_worked: number | null
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          canvasser_rank?: string | null
          conversations_had?: number | null
          created_at?: string
          doors_knocked?: number | null
          hours_worked?: number | null
          id?: string
          income?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          leads_without_damage?: number | null
          not_interested?: number | null
          points_earned?: number | null
          shifts_worked?: number | null
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          canvasser_rank?: string | null
          conversations_had?: number | null
          created_at?: string
          doors_knocked?: number | null
          hours_worked?: number | null
          id?: string
          income?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          leads_without_damage?: number | null
          not_interested?: number | null
          points_earned?: number | null
          shifts_worked?: number | null
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_user_metrics: {
        Row: {
          approved_revenue: number | null
          canvass_deals_closed: number | null
          canvass_leads: number | null
          closed_deals: number | null
          collections: number | null
          created_at: string
          earnings: number | null
          id: string
          leads: number | null
          points_earned: number | null
          sales: number | null
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          approved_revenue?: number | null
          canvass_deals_closed?: number | null
          canvass_leads?: number | null
          closed_deals?: number | null
          collections?: number | null
          created_at?: string
          earnings?: number | null
          id?: string
          leads?: number | null
          points_earned?: number | null
          sales?: number | null
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          approved_revenue?: number | null
          canvass_deals_closed?: number | null
          canvass_leads?: number | null
          closed_deals?: number | null
          collections?: number | null
          created_at?: string
          earnings?: number | null
          id?: string
          leads?: number | null
          points_earned?: number | null
          sales?: number | null
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      canvasser_metrics_leaderboard: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string | null
          leads_closed: number | null
          leads_set: number | null
          leads_with_damage: number | null
          metric_date: string | null
          points: number | null
          shifts_worked: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          metric_date?: string | null
          points?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          metric_date?: string | null
          points?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_metrics_leaderboard: {
        Row: {
          approved_revenue: number | null
          closed_deals: number | null
          created_at: string | null
          display_name: string | null
          id: string | null
          leads: number | null
          metric_date: string | null
          points: number | null
          sales_rank: string | null
          self_generated_deals: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_revenue?: number | null
          closed_deals?: number | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          leads?: number | null
          metric_date?: string | null
          points?: number | null
          sales_rank?: string | null
          self_generated_deals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_revenue?: number | null
          closed_deals?: number | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          leads?: number | null
          metric_date?: string | null
          points?: number | null
          sales_rank?: string | null
          self_generated_deals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      weekly_canvasser_metrics_leaderboard: {
        Row: {
          canvasser_rank: string | null
          conversations_had: number | null
          created_at: string | null
          doors_knocked: number | null
          hours_worked: number | null
          id: string | null
          leads_closed: number | null
          leads_set: number | null
          leads_with_damage: number | null
          leads_without_damage: number | null
          not_interested: number | null
          points_earned: number | null
          shifts_worked: number | null
          updated_at: string | null
          user_id: string | null
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          canvasser_rank?: string | null
          conversations_had?: number | null
          created_at?: string | null
          doors_knocked?: number | null
          hours_worked?: number | null
          id?: string | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          leads_without_damage?: number | null
          not_interested?: number | null
          points_earned?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          canvasser_rank?: string | null
          conversations_had?: number | null
          created_at?: string | null
          doors_knocked?: number | null
          hours_worked?: number | null
          id?: string | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          leads_without_damage?: number | null
          not_interested?: number | null
          points_earned?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_old_applications: { Args: never; Returns: undefined }
      create_manual_lead: {
        Args: {
          p_admin_notes?: string
          p_assigned_to?: string
          p_city: string
          p_description?: string
          p_email: string
          p_full_name: string
          p_lead_source: string
          p_phone: string
          p_priority?: string
          p_service_type: string
          p_state?: string
          p_street_address: string
          p_timeline?: string
          p_zip_code?: string
        }
        Returns: string
      }
      generate_reference_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_quote_request: {
        Args: {
          p_best_contact_time?: string[]
          p_city: string
          p_email: string
          p_form_data: Json
          p_full_name: string
          p_phone: string
          p_photo_urls?: string[]
          p_referral_source?: string
          p_service_type: string
          p_state?: string
          p_street_address: string
          p_zip_code?: string
        }
        Returns: string
      }
      update_ad_spend: {
        Args: { p_ad_spend: number; p_month: string }
        Returns: undefined
      }
      verify_invite_code: {
        Args: { _email: string; _invite_code: string }
        Returns: {
          error_message: string
          is_valid: boolean
          preset_display_name: string
          preset_role: Database["public"]["Enums"]["app_role"]
          preset_sales_rank: string
          preset_yearly_goal: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "canvasser"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "canvasser"],
    },
  },
} as const
