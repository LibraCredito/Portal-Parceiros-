export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      groups: {
        Row: {
          created_at: string
          form_url: string | null
          id: string
          name: string
          power_bi_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_url?: string | null
          id?: string
          name: string
          power_bi_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_url?: string | null
          id?: string
          name?: string
          power_bi_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          type: string
          updated_at: string
          url: string
          content?: string | null
          image_url?: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          type: string
          updated_at?: string
          url: string
          content?: string | null
          image_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string
          content?: string | null
          image_url?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          group_id: string | null
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          group_id?: string | null
          id: string
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          group_id?: string | null
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      register_proposal: {
        Row: {
          id: string
          nome: string
          cpf: string | null
          cnpj: string | null
          type_people: "fisica" | "juridica" | null
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          cpf?: string | null
          cnpj?: string | null
          type_people?: "fisica" | "juridica" | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cpf?: string | null
          cnpj?: string | null
          type_people?: "fisica" | "juridica" | null
          created_at?: string
        }
        Relationships: []
      }
      borrowers: {
        Row: {
          id: string
          proposal_id: string
          nome: string
          cpf: string | null
          cnpj: string | null
          type_people: string
          email: string | null
          telefone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          nome: string
          cpf?: string | null
          cnpj?: string | null
          type_people: string
          email?: string | null
          telefone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          nome?: string
          cpf?: string | null
          cnpj?: string | null
          type_people?: string
          email?: string | null
          telefone?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrowers_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "register_proposal"
            referencedColumns: ["id"]
          }
        ]
      }
      simulation_variables: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_value: number
          min_value: number
          name: string
          step_value: number
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_value: number
          min_value: number
          name: string
          step_value?: number
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_value?: number
          min_value?: number
          name?: string
          step_value?: number
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      uploaded_material_files: {
        Row: {
          id: string
          materials_id: string
          file_path: string
          original_name: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          materials_id: string
          file_path: string
          original_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          materials_id?: string
          file_path?: string
          original_name?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_material_files_materials_id_fkey"
            columns: ["materials_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      link_type: "form" | "powerbi"
      user_role: "user" | "admin"
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
      link_type: ["form", "powerbi"],
      user_role: ["user", "admin"],
    },
  },
} as const
