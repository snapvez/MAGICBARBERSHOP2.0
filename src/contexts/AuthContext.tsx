import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface GuestUser {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  loyalty_points: number;
  total_visits: number;
  isGuest: true;
}

interface AuthContextType {
  user: User | GuestUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isBarber: boolean;
  adminBarberId: string | null;
  profile: any | null;
  userPermissions: string[];
  hasPermission: (permission: string) => boolean;
  signUpGuest: (fullName: string, phone: string, email?: string, taxId?: string) => Promise<void>;
  signInGuest: (phone: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isBarber, setIsBarber] = useState(false);
  const [adminBarberId, setAdminBarberId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const loadUserData = async (userId: string) => {
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (adminData) {
      setIsAdmin(adminData.role === 'super_admin' || adminData.role === 'admin');
      setIsSuperAdmin(adminData.role === 'super_admin');
      setIsBarber(adminData.role === 'barber');
      setAdminBarberId(adminData.barber_id || null);
      setProfile(adminData);

      if (adminData.role === 'super_admin') {
        const { data: allPerms } = await supabase
          .from('admin_permissions')
          .select('permission_key');
        setUserPermissions(allPerms?.map(p => p.permission_key) || []);
      } else if (adminData.role === 'admin') {
        const { data: userPerms } = await supabase
          .from('admin_user_permissions')
          .select('permission_key')
          .eq('admin_user_id', adminData.id);
        setUserPermissions(userPerms?.map(p => p.permission_key) || []);
      } else {
        setUserPermissions([]);
      }
    } else {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsBarber(false);
      setAdminBarberId(null);
      setProfile(profileData);
      setUserPermissions([]);
    }
  };

  const loadGuestFromStorage = () => {
    const guestData = localStorage.getItem('guestUser');
    if (guestData) {
      try {
        const guest = JSON.parse(guestData);
        setUser(guest);
        setProfile(guest);
      } catch (e) {
        localStorage.removeItem('guestUser');
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadUserData(session.user.id);
        } else {
          loadGuestFromStorage();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        loadGuestFromStorage();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        try {
          if (session?.user) {
            setUser(session.user);
            await loadUserData(session.user.id);
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setIsBarber(false);
            setAdminBarberId(null);
            setProfile(null);
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpGuest = async (fullName: string, phone: string, email?: string, taxId?: string) => {
    const cleanPhone = phone.replace(/\s/g, '');

    const { data: existingGuest } = await supabase
      .from('guests')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingGuest) {
      throw new Error('Este número de telemóvel já está registado. Faz login com o teu número.');
    }

    const guestData: any = {
      full_name: fullName,
      phone: cleanPhone,
    };

    if (email && email.trim()) {
      guestData.email = email.trim();
    }

    if (taxId && taxId.trim()) {
      guestData.tax_id = taxId.trim();
    }

    const { data: newGuest, error } = await supabase
      .from('guests')
      .insert(guestData)
      .select()
      .single();

    if (error) throw error;

    const guestUser: GuestUser = {
      id: newGuest.id,
      full_name: newGuest.full_name,
      phone: newGuest.phone,
      email: newGuest.email || undefined,
      loyalty_points: newGuest.loyalty_points,
      total_visits: newGuest.total_visits,
      isGuest: true,
    };

    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setUser(guestUser);
    setProfile(guestUser);
  };

  const signInGuest = async (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');

    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (error) throw error;
    if (!guest) {
      throw new Error('Número de telemóvel não encontrado. Cria uma conta primeiro.');
    }

    const guestUser: GuestUser = {
      id: guest.id,
      full_name: guest.full_name,
      phone: guest.phone,
      email: guest.email || undefined,
      loyalty_points: guest.loyalty_points,
      total_visits: guest.total_visits,
      isGuest: true,
    };

    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setUser(guestUser);
    setProfile(guestUser);
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const profileData: Record<string, any> = {
        id: data.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData as any);

      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    localStorage.removeItem('guestUser');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    return userPermissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, isBarber, adminBarberId, profile, userPermissions, hasPermission, signUpGuest, signInGuest, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
