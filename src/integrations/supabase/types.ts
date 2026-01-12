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
      announcement_bar: {
        Row: {
          background_color: string | null
          created_at: string | null
          font_size: number | null
          id: string
          is_active: boolean | null
          link_url: string | null
          speed: number | null
          text: string
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          font_size?: number | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          speed?: number | null
          text: string
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          font_size?: number | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          speed?: number | null
          text?: string
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          media_type: string | null
          position: string | null
          sort_order: number | null
          starts_at: string | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          media_type?: string | null
          position?: string | null
          sort_order?: number | null
          starts_at?: string | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          media_type?: string | null
          position?: string | null
          sort_order?: number | null
          starts_at?: string | null
          title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_ar: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_ar: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_ar?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          parent_id: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          parent_id?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settings: {
        Row: {
          applies_to: string
          created_at: string | null
          fixed_amount: number | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          percentage: number
          updated_at: string | null
        }
        Insert: {
          applies_to: string
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          percentage?: number
          updated_at?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      courier_reviews: {
        Row: {
          comment: string | null
          courier_id: string
          created_at: string | null
          customer_id: string
          id: string
          order_id: string | null
          rating: number
          special_order_id: string | null
        }
        Insert: {
          comment?: string | null
          courier_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          order_id?: string | null
          rating: number
          special_order_id?: string | null
        }
        Update: {
          comment?: string | null
          courier_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: string | null
          rating?: number
          special_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_reviews_special_order_id_fkey"
            columns: ["special_order_id"]
            isOneToOne: false
            referencedRelation: "special_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          background_color: string | null
          background_image: string | null
          content_items: Json | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          section_key: string
          settings: Json | null
          sort_order: number | null
          subtitle_ar: string | null
          subtitle_en: string | null
          title_ar: string
          title_en: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          background_image?: string | null
          content_items?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          section_key: string
          settings?: Json | null
          sort_order?: number | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar: string
          title_en?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          background_image?: string | null
          content_items?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          section_key?: string
          settings?: Json | null
          sort_order?: number | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_date: string | null
          entry_number: string
          id: string
          reference_id: string | null
          reference_type: string | null
          total_credit: number
          total_debit: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number
          total_debit?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number
          total_debit?: number
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_details: {
        Row: {
          commission_ex_vat: number
          commission_rate: number
          commission_total: number
          commission_vat: number
          created_at: string | null
          id: string
          is_refunded: boolean | null
          line_subtotal_ex_vat: number
          line_total: number
          line_vat_amount: number
          merchant_payout: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          refunded_at: string | null
          unit_price_ex_vat: number
          vat_rate: number
        }
        Insert: {
          commission_ex_vat: number
          commission_rate?: number
          commission_total: number
          commission_vat: number
          created_at?: string | null
          id?: string
          is_refunded?: boolean | null
          line_subtotal_ex_vat: number
          line_total: number
          line_vat_amount: number
          merchant_payout: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          refunded_at?: string | null
          unit_price_ex_vat: number
          vat_rate?: number
        }
        Update: {
          commission_ex_vat?: number
          commission_rate?: number
          commission_total?: number
          commission_vat?: number
          created_at?: string | null
          id?: string
          is_refunded?: boolean | null
          line_subtotal_ex_vat?: number
          line_total?: number
          line_vat_amount?: number
          merchant_payout?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          refunded_at?: string | null
          unit_price_ex_vat?: number
          vat_rate?: number
        }
        Relationships: []
      }
      order_refunds: {
        Row: {
          created_at: string | null
          id: string
          journal_entry_id: string | null
          order_id: string
          order_item_detail_id: string | null
          original_commission_ex_vat: number
          original_commission_total: number
          original_commission_vat: number
          original_line_subtotal_ex_vat: number
          original_line_total: number
          original_line_vat_amount: number
          original_merchant_payout: number
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          refund_number: string
          refund_type: string
          settlement_adjustment_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          order_id: string
          order_item_detail_id?: string | null
          original_commission_ex_vat: number
          original_commission_total: number
          original_commission_vat: number
          original_line_subtotal_ex_vat: number
          original_line_total: number
          original_line_vat_amount: number
          original_merchant_payout: number
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_number: string
          refund_type: string
          settlement_adjustment_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          order_id?: string
          order_item_detail_id?: string | null
          original_commission_ex_vat?: number
          original_commission_total?: number
          original_commission_vat?: number
          original_line_subtotal_ex_vat?: number
          original_line_total?: number
          original_line_vat_amount?: number
          original_merchant_payout?: number
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_number?: string
          refund_type?: string
          settlement_adjustment_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_order_item_detail_id_fkey"
            columns: ["order_item_detail_id"]
            isOneToOne: false
            referencedRelation: "order_item_details"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_received: number | null
          card_transaction_number: string | null
          courier_id: string | null
          courier_location_lat: number | null
          courier_location_lng: number | null
          courier_location_updated_at: string | null
          created_at: string | null
          customer_id: string
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_fee_ex_vat: number | null
          delivery_notes: string | null
          id: string
          items: Json
          journal_entry_id: string | null
          order_number: string
          paid: boolean | null
          payment_confirmed: boolean | null
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_method: string | null
          platform_commission: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          subtotal: number
          subtotal_ex_vat: number | null
          tax_amount: number | null
          total: number
          total_commission_ex_vat: number | null
          total_commission_vat: number | null
          total_merchant_payout: number | null
          updated_at: string | null
          vat_on_delivery: number | null
          vat_on_products: number | null
        }
        Insert: {
          amount_received?: number | null
          card_transaction_number?: string | null
          courier_id?: string | null
          courier_location_lat?: number | null
          courier_location_lng?: number | null
          courier_location_updated_at?: string | null
          created_at?: string | null
          customer_id: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_fee_ex_vat?: number | null
          delivery_notes?: string | null
          id?: string
          items: Json
          journal_entry_id?: string | null
          order_number: string
          paid?: boolean | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          platform_commission?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          subtotal: number
          subtotal_ex_vat?: number | null
          tax_amount?: number | null
          total: number
          total_commission_ex_vat?: number | null
          total_commission_vat?: number | null
          total_merchant_payout?: number | null
          updated_at?: string | null
          vat_on_delivery?: number | null
          vat_on_products?: number | null
        }
        Update: {
          amount_received?: number | null
          card_transaction_number?: string | null
          courier_id?: string | null
          courier_location_lat?: number | null
          courier_location_lng?: number | null
          courier_location_updated_at?: string | null
          created_at?: string | null
          customer_id?: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_fee_ex_vat?: number | null
          delivery_notes?: string | null
          id?: string
          items?: Json
          journal_entry_id?: string | null
          order_number?: string
          paid?: boolean | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          platform_commission?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string
          subtotal?: number
          subtotal_ex_vat?: number | null
          tax_amount?: number | null
          total?: number
          total_commission_ex_vat?: number | null
          total_commission_vat?: number | null
          total_merchant_payout?: number | null
          updated_at?: string | null
          vat_on_delivery?: number | null
          vat_on_products?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_verified: boolean | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_url: string | null
          otp_code: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_verified?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_url?: string | null
          otp_code: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_url?: string | null
          otp_code?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount_received: number
          courier_id: string
          created_at: string | null
          customer_phone: string | null
          id: string
          order_id: string | null
          payment_type: string
          receipt_kept: boolean | null
          special_order_id: string | null
          store_id: string | null
          transaction_number: string | null
        }
        Insert: {
          amount_received: number
          courier_id: string
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          payment_type: string
          receipt_kept?: boolean | null
          special_order_id?: string | null
          store_id?: string | null
          transaction_number?: string | null
        }
        Update: {
          amount_received?: number
          courier_id?: string
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          payment_type?: string
          receipt_kept?: boolean | null
          special_order_id?: string | null
          store_id?: string | null
          transaction_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_special_order_id_fkey"
            columns: ["special_order_id"]
            isOneToOne: false
            referencedRelation: "special_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string | null
          gateway_name: string
          id: string
          is_active: boolean | null
          live_public_key: string | null
          live_secret_key: string | null
          mode: string | null
          settings: Json | null
          test_public_key: string | null
          test_secret_key: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          gateway_name: string
          id?: string
          is_active?: boolean | null
          live_public_key?: string | null
          live_secret_key?: string | null
          mode?: string | null
          settings?: Json | null
          test_public_key?: string | null
          test_secret_key?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          gateway_name?: string
          id?: string
          is_active?: boolean | null
          live_public_key?: string | null
          live_secret_key?: string | null
          mode?: string | null
          settings?: Json | null
          test_public_key?: string | null
          test_secret_key?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_price: number | null
          created_at: string | null
          description: string | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_service: boolean | null
          name: string
          price: number
          stock: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          compare_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_service?: boolean | null
          name: string
          price: number
          stock?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          compare_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_service?: boolean | null
          name?: string
          price?: number
          stock?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          force_password_change: boolean | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          force_password_change?: boolean | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string | null
          id: string
          points_spent: number
          reward_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_spent: number
          reward_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          points_required: number
          reward_type: string
          reward_value: number | null
          stock: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          points_required: number
          reward_type: string
          reward_value?: number | null
          stock?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          points_required?: number
          reward_type?: string
          reward_value?: number | null
          stock?: number | null
        }
        Relationships: []
      }
      settlement_items: {
        Row: {
          created_at: string | null
          id: string
          net_amount: number
          order_id: string | null
          order_item_detail_id: string | null
          order_total: number
          payment_gateway_fee: number | null
          platform_commission: number | null
          settlement_id: string
          special_order_id: string | null
          tax_amount: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          net_amount: number
          order_id?: string | null
          order_item_detail_id?: string | null
          order_total: number
          payment_gateway_fee?: number | null
          platform_commission?: number | null
          settlement_id: string
          special_order_id?: string | null
          tax_amount?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          net_amount?: number
          order_id?: string | null
          order_item_detail_id?: string | null
          order_total?: number
          payment_gateway_fee?: number | null
          platform_commission?: number | null
          settlement_id?: string
          special_order_id?: string | null
          tax_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_order_item_detail_id_fkey"
            columns: ["order_item_detail_id"]
            isOneToOne: false
            referencedRelation: "order_item_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_special_order_id_fkey"
            columns: ["special_order_id"]
            isOneToOne: false
            referencedRelation: "special_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          recipient_id: string
          recipient_type: string
          settled_at: string | null
          settled_by: string | null
          settlement_number: string
          status: string | null
          total_amount: number
          total_commission_collected: number | null
          total_vat_on_commission: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          recipient_id: string
          recipient_type: string
          settled_at?: string | null
          settled_by?: string | null
          settlement_number: string
          status?: string | null
          total_amount: number
          total_commission_collected?: number | null
          total_vat_on_commission?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          recipient_id?: string
          recipient_type?: string
          settled_at?: string | null
          settled_by?: string | null
          settlement_number?: string
          status?: string | null
          total_amount?: number
          total_commission_collected?: number | null
          total_vat_on_commission?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      special_orders: {
        Row: {
          amount_received: number | null
          card_transaction_number: string | null
          courier_id: string | null
          created_at: string | null
          customer_id: string
          delivery_fee: number
          distance_km: number | null
          id: string
          is_verified: boolean | null
          notes: string | null
          order_number: string
          package_description: string | null
          package_size: string
          package_type: string
          package_weight: number | null
          paid: boolean | null
          payment_confirmed: boolean | null
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_method: string | null
          recipient_address: string | null
          recipient_location_lat: number | null
          recipient_location_lng: number | null
          recipient_location_url: string | null
          recipient_name: string
          recipient_phone: string
          sender_address: string | null
          sender_location_lat: number | null
          sender_location_lng: number | null
          sender_location_url: string | null
          sender_name: string
          sender_phone: string
          service_id: string
          status: string | null
          tax_amount: number | null
          total: number
          updated_at: string | null
          verification_code: string | null
          verified_at: string | null
        }
        Insert: {
          amount_received?: number | null
          card_transaction_number?: string | null
          courier_id?: string | null
          created_at?: string | null
          customer_id: string
          delivery_fee: number
          distance_km?: number | null
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          order_number: string
          package_description?: string | null
          package_size: string
          package_type: string
          package_weight?: number | null
          paid?: boolean | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          recipient_address?: string | null
          recipient_location_lat?: number | null
          recipient_location_lng?: number | null
          recipient_location_url?: string | null
          recipient_name: string
          recipient_phone: string
          sender_address?: string | null
          sender_location_lat?: number | null
          sender_location_lng?: number | null
          sender_location_url?: string | null
          sender_name: string
          sender_phone: string
          service_id: string
          status?: string | null
          tax_amount?: number | null
          total: number
          updated_at?: string | null
          verification_code?: string | null
          verified_at?: string | null
        }
        Update: {
          amount_received?: number | null
          card_transaction_number?: string | null
          courier_id?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_fee?: number
          distance_km?: number | null
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          order_number?: string
          package_description?: string | null
          package_size?: string
          package_type?: string
          package_weight?: number | null
          paid?: boolean | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          recipient_address?: string | null
          recipient_location_lat?: number | null
          recipient_location_lng?: number | null
          recipient_location_url?: string | null
          recipient_name?: string
          recipient_phone?: string
          sender_address?: string | null
          sender_location_lat?: number | null
          sender_location_lng?: number | null
          sender_location_url?: string | null
          sender_name?: string
          sender_phone?: string
          service_id?: string
          status?: string | null
          tax_amount?: number | null
          total?: number
          updated_at?: string | null
          verification_code?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "special_services"
            referencedColumns: ["id"]
          },
        ]
      }
      special_services: {
        Row: {
          base_price: number | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_distance_km: number | null
          min_price: number | null
          name: string
          name_ar: string
          price_per_100m: number | null
          price_per_km: number | null
          requires_verification: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_distance_km?: number | null
          min_price?: number | null
          name: string
          name_ar: string
          price_per_100m?: number | null
          price_per_km?: number | null
          requires_verification?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_distance_km?: number | null
          min_price?: number | null
          name?: string
          name_ar?: string
          price_per_100m?: number | null
          price_per_km?: number | null
          requires_verification?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      static_pages: {
        Row: {
          content_ar: string
          content_en: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          meta_description_ar: string | null
          meta_description_en: string | null
          page_key: string
          title_ar: string
          title_en: string | null
          updated_at: string | null
        }
        Insert: {
          content_ar: string
          content_en?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          page_key: string
          title_ar: string
          title_en?: string | null
          updated_at?: string | null
        }
        Update: {
          content_ar?: string
          content_en?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          page_key?: string
          title_ar?: string
          title_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          store_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          store_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string | null
          rating: number
          store_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          rating: number
          store_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          rating?: number
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          downloads_count: number | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          name_ar: string
          preview_image: string | null
          template_data: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          downloads_count?: number | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          name_ar: string
          preview_image?: string | null
          template_data?: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          downloads_count?: number | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          name_ar?: string
          preview_image?: string | null
          template_data?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          base_delivery_fee: number | null
          category_id: string | null
          city: string | null
          cover_url: string | null
          created_at: string | null
          delivery_fee: number | null
          delivery_zones: Json | null
          description: string | null
          free_delivery_radius_km: number | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_url: string | null
          logo_url: string | null
          merchant_id: string
          min_order_amount: number | null
          name: string
          phone: string | null
          price_per_km: number | null
          rating: number | null
          total_reviews: number | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          base_delivery_fee?: number | null
          category_id?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_zones?: Json | null
          description?: string | null
          free_delivery_radius_km?: number | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_url?: string | null
          logo_url?: string | null
          merchant_id: string
          min_order_amount?: number | null
          name: string
          phone?: string | null
          price_per_km?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          base_delivery_fee?: number | null
          category_id?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_zones?: Json | null
          description?: string | null
          free_delivery_radius_km?: number | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_url?: string | null
          logo_url?: string | null
          merchant_id?: string
          min_order_amount?: number | null
          name?: string
          phone?: string | null
          price_per_km?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_replies: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          priority: string | null
          status: string | null
          store_id: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          priority?: string | null
          status?: string | null
          store_id?: string | null
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          priority?: string | null
          status?: string | null
          store_id?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_reports: {
        Row: {
          created_at: string | null
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          report_number: string
          status: string | null
          submitted_at: string | null
          total_orders: number | null
          total_sales: number | null
          total_tax_collected: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          report_number: string
          status?: string | null
          submitted_at?: string | null
          total_orders?: number | null
          total_sales?: number | null
          total_tax_collected?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          report_number?: string
          status?: string | null
          submitted_at?: string | null
          total_orders?: number | null
          total_sales?: number | null
          total_tax_collected?: number | null
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          applies_to_delivery: boolean | null
          applies_to_products: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          percentage: number
          updated_at: string | null
        }
        Insert: {
          applies_to_delivery?: boolean | null
          applies_to_products?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          percentage?: number
          updated_at?: string | null
        }
        Update: {
          applies_to_delivery?: boolean | null
          applies_to_products?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_settings: {
        Row: {
          created_at: string | null
          events: string[] | null
          id: string
          is_active: boolean | null
          name: string
          secret_token: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          secret_token?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          secret_token?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          template: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template?: string
          variables?: string[] | null
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
      app_role: "admin" | "merchant" | "customer" | "courier"
      order_status:
        | "new"
        | "accepted_by_merchant"
        | "preparing"
        | "ready"
        | "assigned_to_courier"
        | "picked_up"
        | "on_the_way"
        | "delivered"
        | "cancelled"
        | "failed"
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
      app_role: ["admin", "merchant", "customer", "courier"],
      order_status: [
        "new",
        "accepted_by_merchant",
        "preparing",
        "ready",
        "assigned_to_courier",
        "picked_up",
        "on_the_way",
        "delivered",
        "cancelled",
        "failed",
      ],
    },
  },
} as const
