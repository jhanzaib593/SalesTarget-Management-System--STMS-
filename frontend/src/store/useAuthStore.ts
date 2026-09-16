import { create } from 'zustand';
import { User, RoleType } from '../lib/types';
import { ApiClient } from '../lib/api';

const defaultFallbackUser: User = {
  id: 'usr-so-default',
  name: 'Sarah Jenkins (Sales Ops Lead)',
  email: 'sales.ops@fmcg-stms.com',
  employeeId: 'emp-so-001',
  role: {
    id: 'role-so',
    name: 'SALES_OPERATIONS' as RoleType,
    description: 'Sales Operations Manager',
  },
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('stms_token');
};

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('stms_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, pass?: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  switchDemoRole: (email: string) => Promise<void>;
  setFallbackUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser() || defaultFallbackUser,
  token: getStoredToken(),
  isLoading: false,
  error: null,

  login: async (email: string, pass = 'Password@123') => {
    set({ isLoading: true, error: null });
    try {
      const res = await ApiClient.login(email, pass);
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    ApiClient.logout();
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    const token = getStoredToken();
    if (!token) return;

    set({ isLoading: true });
    try {
      const user = await ApiClient.getMe();
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  switchDemoRole: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await ApiClient.login(email, 'Password@123');
      set({ user: res.user, token: res.accessToken, isLoading: false });
    } catch (err: any) {
      // Create instant fallback persona based on email
      let roleName: RoleType = 'SALES_OPERATIONS';
      let name = 'Sales Operations Lead';
      let empId = 'EMP-SO-001';

      if (email.includes('rsm001')) {
        roleName = 'RSM' as RoleType;
        name = 'Robert Stark (RSM North)';
        empId = 'RSM-001';
      } else if (email.includes('zsm001')) {
        roleName = 'ZSM' as RoleType;
        name = 'Tariq Mehmood (ZSM Metro)';
        empId = 'ZSM-001';
      } else if (email.includes('asm001')) {
        roleName = 'ASM' as RoleType;
        name = 'Ali Raza (ASM North-A)';
        empId = 'ASM-001';
      } else if (email.includes('tsm001')) {
        roleName = 'TSM' as RoleType;
        name = 'Kashif Mehmood (TSM Downtown)';
        empId = 'TSM-001';
      } else if (email.includes('ob001')) {
        roleName = 'ORDER_BOOKER' as RoleType;
        name = 'Usman Ali (Order Booker 1)';
        empId = 'OB-001';
      }

      const personaUser: User = {
        id: `usr-${empId.toLowerCase()}`,
        name,
        email,
        employeeId: empId,
        role: {
          id: `role-${roleName.toLowerCase()}`,
          name: roleName,
          description: `${roleName} Role`,
        },
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      set({ user: personaUser, isLoading: false, error: null });
      if (typeof window !== 'undefined') {
        localStorage.setItem('stms_user', JSON.stringify(personaUser));
      }
    }
  },

  setFallbackUser: () => {
    set({ user: defaultFallbackUser });
  },
}));
