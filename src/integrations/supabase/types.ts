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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      groups: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_password_protected: boolean | null
          name: string
          password_hash: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_password_protected?: boolean | null
          name: string
          password_hash?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_password_protected?: boolean | null
          name?: string
          password_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: string
          created_at: string | null
        }
        Insert: {
          group_id: string
          user_id: string
          role?: string
          created_at?: string | null
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          sender_id: string
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          sender_id: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          sender_id?: string
          content?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_notes: {
        Row: { id: string; group_id: string; author_id: string; content: string; created_at: string | null }
        Insert: { id?: string; group_id: string; author_id: string; content: string; created_at?: string | null }
        Update: { id?: string; group_id?: string; author_id?: string; content?: string; created_at?: string | null }
        Relationships: [
          { foreignKeyName: "group_notes_group_id_fkey", columns: ["group_id"], isOneToOne: false, referencedRelation: "groups", referencedColumns: ["id"] },
          { foreignKeyName: "group_notes_author_id_fkey", columns: ["author_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ]
      }
      group_polls: {
        Row: { id: string; group_id: string; question: string; options: string[]; created_by: string; created_at: string | null }
        Insert: { id?: string; group_id: string; question: string; options: string[]; created_by: string; created_at?: string | null }
        Update: { id?: string; group_id?: string; question?: string; options?: string[]; created_by?: string; created_at?: string | null }
        Relationships: [
          { foreignKeyName: "group_polls_group_id_fkey", columns: ["group_id"], isOneToOne: false, referencedRelation: "groups", referencedColumns: ["id"] },
          { foreignKeyName: "group_polls_created_by_fkey", columns: ["created_by"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ]
      }
      group_poll_votes: {
        Row: { poll_id: string; voter_id: string; option_index: number; created_at: string | null }
        Insert: { poll_id: string; voter_id: string; option_index: number; created_at?: string | null }
        Update: { poll_id?: string; voter_id?: string; option_index?: number; created_at?: string | null }
        Relationships: [
          { foreignKeyName: "group_poll_votes_poll_id_fkey", columns: ["poll_id"], isOneToOne: false, referencedRelation: "group_polls", referencedColumns: ["id"] },
          { foreignKeyName: "group_poll_votes_voter_id_fkey", columns: ["voter_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ]
      }
      group_recaps: {
        Row: { id: string; group_id: string; content: string; created_at: string | null }
        Insert: { id?: string; group_id: string; content: string; created_at?: string | null }
        Update: { id?: string; group_id?: string; content?: string; created_at?: string | null }
        Relationships: [
          { foreignKeyName: "group_recaps_group_id_fkey", columns: ["group_id"], isOneToOne: false, referencedRelation: "groups", referencedColumns: ["id"] },
        ]
      }
      timetable_lectures: {
        Row: { id: string; user_id: string; day: string; time: string; subject: string; instructor: string | null; location: string | null; created_at: string | null }
        Insert: { id?: string; user_id: string; day: string; time: string; subject: string; instructor?: string | null; location?: string | null; created_at?: string | null }
        Update: { id?: string; user_id?: string; day?: string; time?: string; subject?: string; instructor?: string | null; location?: string | null; created_at?: string | null }
        Relationships: [
          { foreignKeyName: "timetable_lectures_user_id_fkey", columns: ["user_id"], isOneToOne: false, referencedRelation: "profiles", referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
          username: string
          coffee_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          updated_at?: string | null
          username: string
          coffee_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
          username?: string
          coffee_url?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          expires_at: string | null
          id: string
          is_password_protected: boolean | null
          max_participants: number | null
          name: string
          password_hash: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_password_protected?: boolean | null
          max_participants?: number | null
          name: string
          password_hash?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_password_protected?: boolean | null
          max_participants?: number | null
          name?: string
          password_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string | null
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string | null
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      spotify_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotify_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
