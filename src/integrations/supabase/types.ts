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
      canvasser_metrics: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          income: number | null
          leads_closed: number | null
          leads_set: number | null
          leads_with_damage: number | null
          metric_date: string
          points: number | null
          shifts_worked: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          income?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          metric_date?: string
          points?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          income?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          metric_date?: string
          points?: number | null
          shifts_worked?: number | null
          updated_at?: string | null
          user_id?: string
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
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_code: string
          invited_by: string | null
          is_used: boolean
          preset_display_name: string | null
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
          preset_display_name?: string | null
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
          preset_display_name?: string | null
          preset_sales_rank?: string | null
          preset_yearly_goal?: number | null
          used_at?: string | null
        }
        Relationships: []
      }
      leaderboard_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_metrics: {
        Row: {
          closed_deals: number | null
          created_at: string
          display_name: string | null
          earnings_ytd: number | null
          id: string
          leads: number | null
          metric_date: string
          points: number | null
          sales: number | null
          sales_rank: string | null
          updated_at: string
          user_id: string
          yearly_goal: number | null
        }
        Insert: {
          closed_deals?: number | null
          created_at?: string
          display_name?: string | null
          earnings_ytd?: number | null
          id?: string
          leads?: number | null
          metric_date?: string
          points?: number | null
          sales?: number | null
          sales_rank?: string | null
          updated_at?: string
          user_id: string
          yearly_goal?: number | null
        }
        Update: {
          closed_deals?: number | null
          created_at?: string
          display_name?: string | null
          earnings_ytd?: number | null
          id?: string
          leads?: number | null
          metric_date?: string
          points?: number | null
          sales?: number | null
          sales_rank?: string | null
          updated_at?: string
          user_id?: string
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
          created_at: string
          id: string
          income: number | null
          leads_closed: number | null
          leads_set: number | null
          leads_with_damage: number | null
          points_earned: number | null
          shifts_worked: number | null
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          income?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
          points_earned?: number | null
          shifts_worked?: number | null
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          income?: number | null
          leads_closed?: number | null
          leads_set?: number | null
          leads_with_damage?: number | null
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
          closed_deals: number | null
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
          closed_deals?: number | null
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
          closed_deals?: number | null
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
