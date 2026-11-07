
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "emisiones": {
                  Row: {
                    "categoria": Database["public"]['Enums']["categoria_emision"],"co2_kg": number,"fuente": string,"id": string,"medido_en": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria": Database["public"]['Enums']["categoria_emision"],"co2_kg": number,"fuente": string,"id"?: string,"medido_en"?: string,"owner_id"?: string
                  }
                  Update: {
                    "categoria"?: Database["public"]['Enums']["categoria_emision"],"co2_kg"?: number,"fuente"?: string,"id"?: string,"medido_en"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"instaladores": {
                  Row: {
                    "codigo_invitacion": string,"coordinador_id": string,"created_at": string,"especialidad": Database["public"]['Enums']["especialidad_instalador"],"id": string,"nombre": string,"user_id": string | null,"vinculado_en": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo_invitacion"?: string,"coordinador_id"?: string,"created_at"?: string,"especialidad"?: Database["public"]['Enums']["especialidad_instalador"],"id"?: string,"nombre": string,"user_id"?: string | null,"vinculado_en"?: string | null
                  }
                  Update: {
                    "codigo_invitacion"?: string,"coordinador_id"?: string,"created_at"?: string,"especialidad"?: Database["public"]['Enums']["especialidad_instalador"],"id"?: string,"nombre"?: string,"user_id"?: string | null,"vinculado_en"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"materiales": {
                  Row: {
                    "coordinador_id": string,"costo_unitario": number,"created_at": string,"id": string,"nombre": string,"unidad": Database["public"]['Enums']["unidad_material"]
                  }
                  ComputedFields: never
                  Insert: {
                    "coordinador_id"?: string,"costo_unitario"?: number,"created_at"?: string,"id"?: string,"nombre": string,"unidad"?: Database["public"]['Enums']["unidad_material"]
                  }
                  Update: {
                    "coordinador_id"?: string,"costo_unitario"?: number,"created_at"?: string,"id"?: string,"nombre"?: string,"unidad"?: Database["public"]['Enums']["unidad_material"]
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "carbon_footprint_kg": number,"category": string,"created_at": string,"id": string,"name": string,"owner_id": string,"sku": string,"stock": number
                  }
                  ComputedFields: never
                  Insert: {
                    "carbon_footprint_kg"?: number,"category": string,"created_at"?: string,"id"?: string,"name": string,"owner_id"?: string,"sku": string,"stock"?: number
                  }
                  Update: {
                    "carbon_footprint_kg"?: number,"category"?: string,"created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"sku"?: string,"stock"?: number
                  }
                  Relationships: [
                    
                  ]
                },"proyecto_materiales": {
                  Row: {
                    "cantidad": number,"coordinador_id": string,"material_id": string,"proyecto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"coordinador_id"?: string,"material_id": string,"proyecto_id": string
                  }
                  Update: {
                    "cantidad"?: number,"coordinador_id"?: string,"material_id"?: string,"proyecto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proyecto_materiales_material_fkey"
      columns: ["material_id","coordinador_id"]
isOneToOne: false
      referencedRelation: "materiales"
      referencedColumns: ["id","coordinador_id"]
    },{
      foreignKeyName: "proyecto_materiales_proyecto_fkey"
      columns: ["proyecto_id","coordinador_id"]
isOneToOne: false
      referencedRelation: "proyectos"
      referencedColumns: ["id","coordinador_id"]
    }
                  ]
                },"proyectos": {
                  Row: {
                    "capacidad_kw": number,"cliente": string,"coordinador_id": string,"created_at": string,"estado": Database["public"]['Enums']["estado_proyecto"],"fecha_fin_estimada": string,"fecha_inicio": string,"id": string,"instalador_id": string | null,"nombre": string,"ubicacion": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capacidad_kw": number,"cliente": string,"coordinador_id"?: string,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_proyecto"],"fecha_fin_estimada": string,"fecha_inicio": string,"id"?: string,"instalador_id"?: string | null,"nombre": string,"ubicacion": string,"updated_at"?: string
                  }
                  Update: {
                    "capacidad_kw"?: number,"cliente"?: string,"coordinador_id"?: string,"created_at"?: string,"estado"?: Database["public"]['Enums']["estado_proyecto"],"fecha_fin_estimada"?: string,"fecha_inicio"?: string,"id"?: string,"instalador_id"?: string | null,"nombre"?: string,"ubicacion"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proyectos_instalador_fkey"
      columns: ["instalador_id","coordinador_id"]
isOneToOne: false
      referencedRelation: "instaladores"
      referencedColumns: ["id","coordinador_id"]
    }
                  ]
                }
          }
          Views: {
            "emisiones_resumen": {
                  Row: {
                    "categoria": Database["public"]['Enums']["categoria_emision"],"co2_kg": number | null,"mediciones": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"proyectos_resumen": {
                  Row: {
                    "capacidad_kw": number | null,"estado": Database["public"]['Enums']["estado_proyecto"],"proyectos": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "cambiar_estado_proyecto":
{ Args: { "p_estado": Database["public"]['Enums']["estado_proyecto"],"p_proyecto_id": string }; Returns: {
              "capacidad_kw": number,
"cliente": string,
"coordinador_id": string,
"created_at": string,
"estado": Database["public"]['Enums']["estado_proyecto"],
"fecha_fin_estimada": string,
"fecha_inicio": string,
"id": string,
"instalador_id": string | null,
"nombre": string,
"ubicacion": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "proyectos"
        isOneToOne: true
        isSetofReturn: false
      } },
"crear_proyecto":
{ Args: { "p_capacidad_kw": number,"p_cliente": string,"p_fecha_fin_estimada": string,"p_fecha_inicio": string,"p_instalador_id"?: string,"p_materiales"?: Json,"p_nombre": string,"p_ubicacion": string }; Returns: {
              "capacidad_kw": number,
"cliente": string,
"coordinador_id": string,
"created_at": string,
"estado": Database["public"]['Enums']["estado_proyecto"],
"fecha_fin_estimada": string,
"fecha_inicio": string,
"id": string,
"instalador_id": string | null,
"nombre": string,
"ubicacion": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "proyectos"
        isOneToOne: true
        isSetofReturn: false
      } },
"vincular_instalador":
{ Args: { "p_codigo": string }; Returns: {
              "codigo_invitacion": string,
"coordinador_id": string,
"created_at": string,
"especialidad": Database["public"]['Enums']["especialidad_instalador"],
"id": string,
"nombre": string,
"user_id": string | null,
"vinculado_en": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "instaladores"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "categoria_emision": "transporte"|"energia"|"residuos","especialidad_instalador": "general"|"electrica"|"estructural"|"mantenimiento","estado_proyecto": "pendiente"|"en_progreso"|"completado","unidad_material": "unidad"|"metro"|"kg"|"juego"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "categoria_emision": ["transporte", "energia", "residuos"],"especialidad_instalador": ["general", "electrica", "estructural", "mantenimiento"],"estado_proyecto": ["pendiente", "en_progreso", "completado"],"unidad_material": ["unidad", "metro", "kg", "juego"]
          }
        }
} as const
