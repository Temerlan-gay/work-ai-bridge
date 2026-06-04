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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          chat_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          chat_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          chat_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          boosted_at: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          link: string | null
          technologies: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          boosted_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          technologies?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          boosted_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          technologies?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          availability: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          full_name: string | null
          hourly_rate: number | null
          id: string
          kind: Database["public"]["Enums"]["user_kind"]
          languages: string[] | null
          last_seen_at: string | null
          links: Json | null
          nickname: string | null
          onboarded: boolean
          skills: string[] | null
          specialization: string | null
          updated_at: string
          username: string | null
          years_experience: number | null
        }
        Insert: {
          age?: number | null
          availability?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          hourly_rate?: number | null
          id: string
          kind?: Database["public"]["Enums"]["user_kind"]
          languages?: string[] | null
          last_seen_at?: string | null
          links?: Json | null
          nickname?: string | null
          onboarded?: boolean
          skills?: string[] | null
          specialization?: string | null
          updated_at?: string
          username?: string | null
          years_experience?: number | null
        }
        Update: {
          age?: number | null
          availability?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["user_kind"]
          languages?: string[] | null
          last_seen_at?: string | null
          links?: Json | null
          nickname?: string | null
          onboarded?: boolean
          skills?: string[] | null
          specialization?: string | null
          updated_at?: string
          username?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          attachments: string[] | null
          boosted_at: string | null
          budget: number | null
          category: string
          client_id: string
          created_at: string
          deadline: string | null
          description: string
          freelancer_id: string | null
          id: string
          skills_required: string[] | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: string[] | null
          boosted_at?: string | null
          budget?: number | null
          category: string
          client_id: string
          created_at?: string
          deadline?: string | null
          description: string
          freelancer_id?: string | null
          id?: string
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: string[] | null
          boosted_at?: string | null
          budget?: number | null
          category?: string
          client_id?: string
          created_at?: string
          deadline?: string | null
          description?: string
          freelancer_id?: string | null
          id?: string
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          cover_letter: string
          created_at: string
          delivery_days: number
          freelancer_id: string
          id: string
          price: number
          project_id: string
          status: Database["public"]["Enums"]["proposal_status"]
        }
        Insert: {
          cover_letter: string
          created_at?: string
          delivery_days?: number
          freelancer_id: string
          id?: string
          price: number
          project_id: string
          status?: Database["public"]["Enums"]["proposal_status"]
        }
        Update: {
          cover_letter?: string
          created_at?: string
          delivery_days?: number
          freelancer_id?: string
          id?: string
          price?: number
          project_id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          from_user: string
          id: string
          project_id: string
          rating: number
          to_user: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          from_user: string
          id?: string
          project_id: string
          rating: number
          to_user: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          from_user?: string
          id?: string
          project_id?: string
          rating?: number
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_catalog: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_custom: boolean
          name: string
          name_lower: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          name: string
          name_lower?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          name_lower?: string | null
        }
        Relationships: []
      }
      streak_restorations: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          restored_date: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          restored_date: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          restored_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workcoin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          project_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          project_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          project_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      workcoin_wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      freelancer_directory: {
        Row: {
          availability: string | null
          avatar_url: string | null
          avg_rating: number | null
          bio: string | null
          city: string | null
          completed_projects: number | null
          country: string | null
          created_at: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string | null
          last_seen_at: string | null
          nickname: string | null
          reviews_count: number | null
          skills: string[] | null
          specialization: string | null
          username: string | null
          years_experience: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_workcoins: {
        Args: {
          p_amount: number
          p_project_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      boost_item: {
        Args: { p_id: string; p_kind: string }
        Returns: {
          balance: number
          message: string
          success: boolean
        }[]
      }
      get_my_chat_streaks: {
        Args: never
        Returns: {
          can_restore: boolean
          chat_id: string
          streak: number
        }[]
      }
      get_streak_restores_left: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      restore_streak: {
        Args: { p_chat_id: string }
        Returns: {
          message: string
          restores_left: number
          success: boolean
        }[]
      }
      update_presence: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "freelancer" | "client"
      project_status: "open" | "in_progress" | "completed" | "cancelled"
      proposal_status: "pending" | "accepted" | "rejected" | "withdrawn"
      user_kind: "freelancer" | "client"
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
      app_role: ["admin", "freelancer", "client"],
      project_status: ["open", "in_progress", "completed", "cancelled"],
      proposal_status: ["pending", "accepted", "rejected", "withdrawn"],
      user_kind: ["freelancer", "client"],
    },
  },
} as const
