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
      app_songs: {
        Row: {
          created_at: string
          original_gender: string | null
          original_key: string | null
          scale_mode: string | null
          song_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          original_gender?: string | null
          original_key?: string | null
          scale_mode?: string | null
          song_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          original_gender?: string | null
          original_key?: string | null
          scale_mode?: string | null
          song_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          bpm: number | null
          code: string
          created_at: string
          current_index: number
          current_key: string | null
          director_id: string
          follow_director: boolean
          gender_shift: string | null
          is_active: boolean
          list_id: string | null
          list_song_ids: Json
          semitones: number
          session_origin: Json | null
          shared_section_anchor: string | null
          song_id: string | null
          updated_at: string
          view_mode: string | null
        }
        Insert: {
          bpm?: number | null
          code: string
          created_at?: string
          current_index?: number
          current_key?: string | null
          director_id: string
          follow_director?: boolean
          gender_shift?: string | null
          is_active?: boolean
          list_id?: string | null
          list_song_ids?: Json
          semitones?: number
          session_origin?: Json | null
          shared_section_anchor?: string | null
          song_id?: string | null
          updated_at?: string
          view_mode?: string | null
        }
        Update: {
          bpm?: number | null
          code?: string
          created_at?: string
          current_index?: number
          current_key?: string | null
          director_id?: string
          follow_director?: boolean
          gender_shift?: string | null
          is_active?: boolean
          list_id?: string | null
          list_song_ids?: Json
          semitones?: number
          session_origin?: Json | null
          shared_section_anchor?: string | null
          song_id?: string | null
          updated_at?: string
          view_mode?: string | null
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          created_at: string
          id: string
          playlist_id: string
          position: number
          song_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          playlist_id: string
          position?: number
          song_id: string
        }
        Update: {
          created_at?: string
          id?: string
          playlist_id?: string
          position?: number
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_songs: {
        Row: {
          artist: string
          bpm: number | null
          chords: string
          created_at: string
          id: string
          is_cover: boolean
          original_key: string
          scale_mode: string
          song_id: string
          suggested_key: string | null
          title: string
          title_slug: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          artist: string
          bpm?: number | null
          chords?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          original_key?: string
          scale_mode?: string
          song_id: string
          suggested_key?: string | null
          title: string
          title_slug: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          artist?: string
          bpm?: number | null
          chords?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          original_key?: string
          scale_mode?: string
          song_id?: string
          suggested_key?: string | null
          title?: string
          title_slug?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: []
      }
      song_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          is_public: boolean
          mime_type: string
          size_bytes: number | null
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          is_public?: boolean
          mime_type?: string
          size_bytes?: number | null
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          is_public?: boolean
          mime_type?: string
          size_bytes?: number | null
          song_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          song_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          song_ids: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          song_ids?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          song_ids?: Json
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_song_settings: {
        Row: {
          created_at: string
          custom_semitones: number
          font_size: number
          gender_shift: number
          id: string
          is_favorite: boolean
          semitones: number
          song_id: string
          updated_at: string
          user_id: string
          vocal_register: string | null
          yt_delay_ms: number
        }
        Insert: {
          created_at?: string
          custom_semitones?: number
          font_size?: number
          gender_shift?: number
          id?: string
          is_favorite?: boolean
          semitones?: number
          song_id: string
          updated_at?: string
          user_id: string
          vocal_register?: string | null
          yt_delay_ms?: number
        }
        Update: {
          created_at?: string
          custom_semitones?: number
          font_size?: number
          gender_shift?: number
          id?: string
          is_favorite?: boolean
          semitones?: number
          song_id?: string
          updated_at?: string
          user_id?: string
          vocal_register?: string | null
          yt_delay_ms?: number
        }
        Relationships: []
      }
      user_songs: {
        Row: {
          artist: string | null
          bpm: number | null
          chords: string | null
          created_at: string
          id: string
          key: string | null
          song_id: string
          title: string
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          artist?: string | null
          bpm?: number | null
          chords?: string | null
          created_at?: string
          id?: string
          key?: string | null
          song_id: string
          title: string
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          artist?: string | null
          bpm?: number | null
          chords?: string | null
          created_at?: string
          id?: string
          key?: string | null
          song_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_live_session: {
        Args: { p_code: string }
        Returns: Database["public"]["Tables"]["live_sessions"]["Row"]
      }
      deactivate_director_live_sessions: {
        Args: { p_keep_code?: string | null }
        Returns: number
      }
      upsert_activate_director_live_session: {
        Args: { p_payload: Json }
        Returns: Database["public"]["Tables"]["live_sessions"]["Row"]
      }
      get_live_session_by_code: {
        Args: { p_code: string }
        Returns: Database["public"]["Tables"]["live_sessions"]["Row"][]
      }
      seo_song_catalog: {
        Args: { p_limit?: number }
        Returns: {
          song_id: string
          title: string
          artist: string
          chords: string
          created_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_title: { Args: { input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
