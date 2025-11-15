export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          loyalty_points: number;
          total_points: number;
          current_tier: string;
          total_visits: number;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          loyalty_points?: number;
          total_points?: number;
          current_tier?: string;
          total_visits?: number;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          loyalty_points?: number;
          total_points?: number;
          current_tier?: string;
          total_visits?: number;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price: number;
          points_reward: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          duration_minutes: number;
          price: number;
          points_reward?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          price?: number;
          points_reward?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          client_id: string;
          service_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          notes: string | null;
          points_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          service_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          notes?: string | null;
          points_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          service_id?: string;
          appointment_date?: string;
          start_time?: string;
          end_time?: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          notes?: string | null;
          points_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          client_id: string;
          appointment_id: string | null;
          type: 'confirmation' | 'reminder' | 'loyalty_milestone' | 'promotion';
          message: string;
          sent_at: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          appointment_id?: string | null;
          type: 'confirmation' | 'reminder' | 'loyalty_milestone' | 'promotion';
          message: string;
          sent_at?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          appointment_id?: string | null;
          type?: 'confirmation' | 'reminder' | 'loyalty_milestone' | 'promotion';
          message?: string;
          sent_at?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      loyalty_rewards: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          points_required: number;
          discount_percentage: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          points_required: number;
          discount_percentage: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          points_required?: number;
          discount_percentage?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
  };
};
