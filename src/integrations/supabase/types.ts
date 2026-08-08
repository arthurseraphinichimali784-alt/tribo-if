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
      analytics_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          color: string | null
          description: string | null
          icon: string | null
          label: string
        }
        Insert: {
          code: string
          color?: string | null
          description?: string | null
          icon?: string | null
          label: string
        }
        Update: {
          code?: string
          color?: string | null
          description?: string | null
          icon?: string | null
          label?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          is_pinned: boolean
          likes: number
          material_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          likes?: number
          material_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          likes?: number
          material_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          material_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          material_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          material_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
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
          },
        ]
      }
      material_access_log: {
        Row: {
          access_type: Database["public"]["Enums"]["material_access_kind"]
          created_at: string
          id: string
          license_code: string | null
          material_id: string
          purchase_id: string | null
          user_id: string
        }
        Insert: {
          access_type: Database["public"]["Enums"]["material_access_kind"]
          created_at?: string
          id?: string
          license_code?: string | null
          material_id: string
          purchase_id?: string | null
          user_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["material_access_kind"]
          created_at?: string
          id?: string
          license_code?: string | null
          material_id?: string
          purchase_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_access_log_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_access_log_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      material_likes: {
        Row: {
          created_at: string
          material_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          material_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          material_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_likes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_progress: {
        Row: {
          created_at: string
          last_accessed_at: string
          last_page: number
          material_id: string
          progress_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_accessed_at?: string
          last_page?: number
          material_id: string
          progress_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_accessed_at?: string
          last_page?: number
          material_id?: string
          progress_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_progress_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_views: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          material_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          material_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          material_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_views_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          author_id: string
          comments_count: number
          cover_url: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          downloads: number
          file_path: string | null
          id: string
          likes: number
          preview_pages: number
          preview_url: string | null
          price: number
          published: boolean
          rating: number
          saves_count: number
          subject: Database["public"]["Enums"]["subject"]
          title: string
          topics: string[]
          trust_score_recebido: number
          type: Database["public"]["Enums"]["material_type"]
          views_count: number
        }
        Insert: {
          author_id: string
          comments_count?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          downloads?: number
          file_path?: string | null
          id?: string
          likes?: number
          preview_pages?: number
          preview_url?: string | null
          price?: number
          published?: boolean
          rating?: number
          saves_count?: number
          subject: Database["public"]["Enums"]["subject"]
          title: string
          topics?: string[]
          trust_score_recebido?: number
          type: Database["public"]["Enums"]["material_type"]
          views_count?: number
        }
        Update: {
          author_id?: string
          comments_count?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          downloads?: number
          file_path?: string | null
          id?: string
          likes?: number
          preview_pages?: number
          preview_url?: string | null
          price?: number
          published?: boolean
          rating?: number
          saves_count?: number
          subject?: Database["public"]["Enums"]["subject"]
          title?: string
          topics?: string[]
          trust_score_recebido?: number
          type?: Database["public"]["Enums"]["material_type"]
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          comment_id: string | null
          created_at: string
          id: string
          link: string | null
          material_id: string | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          material_id?: string | null
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          material_id?: string | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: boolean
          platform_fee_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          platform_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          platform_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          hourly_rate: number | null
          id: string
          institute: string | null
          is_teacher: boolean
          level: number
          state: string | null
          teaching_area: string | null
          teaching_role: string | null
          trust_score: number
          updated_at: string
          user_type: Database["public"]["Enums"]["user_kind"]
          username: string
          verification_method:
            | Database["public"]["Enums"]["verification_method"]
            | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          hourly_rate?: number | null
          id: string
          institute?: string | null
          is_teacher?: boolean
          level?: number
          state?: string | null
          teaching_area?: string | null
          teaching_role?: string | null
          trust_score?: number
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_kind"]
          username: string
          verification_method?:
            | Database["public"]["Enums"]["verification_method"]
            | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          institute?: string | null
          is_teacher?: boolean
          level?: number
          state?: string | null
          teaching_area?: string | null
          teaching_role?: string | null
          trust_score?: number
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_kind"]
          username?: string
          verification_method?:
            | Database["public"]["Enums"]["verification_method"]
            | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          xp?: number
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          author_id: string
          buyer_id: string
          created_at: string
          external_payment_id: string | null
          id: string
          license_code: string
          material_id: string
          paid_at: string | null
          payment_provider: string | null
          platform_fee: number
          platform_fee_percent: number
          refunded_at: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          author_id: string
          buyer_id: string
          created_at?: string
          external_payment_id?: string | null
          id?: string
          license_code: string
          material_id: string
          paid_at?: string | null
          payment_provider?: string | null
          platform_fee?: number
          platform_fee_percent?: number
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          author_id?: string
          buyer_id?: string
          created_at?: string
          external_payment_id?: string | null
          id?: string
          license_code?: string
          material_id?: string
          paid_at?: string | null
          payment_provider?: string | null
          platform_fee?: number
          platform_fee_percent?: number
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_by: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_by?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_by?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Relationships: []
      }
      subject_scores: {
        Row: {
          score: number
          subject: Database["public"]["Enums"]["subject"]
          updated_at: string
          user_id: string
        }
        Insert: {
          score?: number
          subject: Database["public"]["Enums"]["subject"]
          updated_at?: string
          user_id: string
        }
        Update: {
          score?: number
          subject?: Database["public"]["Enums"]["subject"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_verifications: {
        Row: {
          created_at: string
          document_path: string | null
          email_code_expires_at: string | null
          email_code_hash: string | null
          id: string
          institution: string
          institutional_email: string | null
          institutional_email_verified: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          teaching_area: string
          teaching_role: string | null
          updated_at: string
          user_id: string
          verification_method: Database["public"]["Enums"]["verification_method"]
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          email_code_expires_at?: string | null
          email_code_hash?: string | null
          id?: string
          institution: string
          institutional_email?: string | null
          institutional_email_verified?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          teaching_area: string
          teaching_role?: string | null
          updated_at?: string
          user_id: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
        }
        Update: {
          created_at?: string
          document_path?: string | null
          email_code_expires_at?: string | null
          email_code_hash?: string | null
          id?: string
          institution?: string
          institutional_email?: string | null
          institutional_email_verified?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          teaching_area?: string
          teaching_role?: string | null
          updated_at?: string
          user_id?: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_code: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_code: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          device_type: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          os: string | null
          session_key: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          device_type?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          os?: string | null
          session_key: string
          user_id: string
        }
        Update: {
          browser?: string | null
          device_type?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          os?: string | null
          session_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string | null
          institute: string | null
          is_teacher: boolean | null
          level: number | null
          trust_score: number | null
          updated_at: string | null
          username: string | null
          xp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bump_streak: { Args: { _user: string }; Returns: undefined }
      gen_license_code: { Args: never; Returns: string }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          hourly_rate: number | null
          id: string
          institute: string | null
          is_teacher: boolean
          level: number
          state: string | null
          teaching_area: string | null
          teaching_role: string | null
          trust_score: number
          updated_at: string
          user_type: Database["public"]["Enums"]["user_kind"]
          username: string
          verification_method:
            | Database["public"]["Enums"]["verification_method"]
            | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          xp: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          full_name: string
          hourly_rate: number
          id: string
          institute: string
          is_teacher: boolean
          level: number
          trust_score: number
          updated_at: string
          username: string
          xp: number
        }[]
      }
      has_material_access: {
        Args: { _material_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      difficulty: "facil" | "medio" | "dificil"
      material_access_kind: "preview" | "view" | "download"
      material_type:
        | "resumo"
        | "flashcards"
        | "mapa_mental"
        | "lista_exercicios"
        | "simulado"
        | "outro"
      notification_type:
        | "comment"
        | "reply"
        | "like"
        | "follow"
        | "badge"
        | "report_resolved"
        | "material_featured"
        | "system"
      purchase_status:
        | "pendente"
        | "pago"
        | "cancelado"
        | "reembolsado"
        | "falhou"
      report_status: "pending" | "resolved" | "rejected" | "em_analise"
      report_target: "material" | "comment" | "user"
      subject:
        | "matematica"
        | "portugues"
        | "ciencias"
        | "geografia"
        | "historia"
        | "ingles"
        | "fisica"
        | "quimica"
        | "biologia"
      user_kind: "aluno" | "professor"
      verification_method: "email_institucional" | "documento" | "analise_admin"
      verification_status:
        | "nao_verificado"
        | "pendente"
        | "verificado"
        | "rejeitado"
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
      app_role: ["admin", "teacher", "student"],
      difficulty: ["facil", "medio", "dificil"],
      material_access_kind: ["preview", "view", "download"],
      material_type: [
        "resumo",
        "flashcards",
        "mapa_mental",
        "lista_exercicios",
        "simulado",
        "outro",
      ],
      notification_type: [
        "comment",
        "reply",
        "like",
        "follow",
        "badge",
        "report_resolved",
        "material_featured",
        "system",
      ],
      purchase_status: [
        "pendente",
        "pago",
        "cancelado",
        "reembolsado",
        "falhou",
      ],
      report_status: ["pending", "resolved", "rejected", "em_analise"],
      report_target: ["material", "comment", "user"],
      subject: [
        "matematica",
        "portugues",
        "ciencias",
        "geografia",
        "historia",
        "ingles",
        "fisica",
        "quimica",
        "biologia",
      ],
      user_kind: ["aluno", "professor"],
      verification_method: [
        "email_institucional",
        "documento",
        "analise_admin",
      ],
      verification_status: [
        "nao_verificado",
        "pendente",
        "verificado",
        "rejeitado",
      ],
    },
  },
} as const
