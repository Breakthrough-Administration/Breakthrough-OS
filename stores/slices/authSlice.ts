import { StateCreator } from 'zustand';
import { User } from 'firebase/auth';
import { UserProfile, UserRole } from '@/types';
import { logOutGoogle } from '@/lib/firebase';
import { getUserProfile, saveUserProfile } from '@/lib/firestoreService';
import { INITIAL_USERS } from '@/lib/seedData';
import { AuthSlice, RootStore } from '../types';

const CACHED_USER_KEY = 'breakthrough_auth_cached_profile';

const getInitialCachedUser = (): { user: UserProfile; isAuthenticated: boolean } => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHED_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          return { user: parsed, isAuthenticated: true };
        }
      }
    } catch {
      // Ignore parse failure
    }
  }
  return { user: INITIAL_USERS[0], isAuthenticated: false };
};

const initialCached = getInitialCachedUser();

export const createAuthSlice: StateCreator<RootStore, [], [], AuthSlice> = (set, get) => ({
  currentUser: initialCached.user,
  users: INITIAL_USERS,
  isAuthenticated: initialCached.isAuthenticated,
  authLoading: false,

  setUserProfile: (profile: UserProfile | null) => {
    if (profile) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
        } catch {
          // ignore
        }
      }
      set({ currentUser: profile, isAuthenticated: true, authLoading: false });
      get().addAuditLog(
        'SET_PROFILE',
        'UserProfile',
        profile.id,
        `User session profile updated: ${profile.name} (${profile.role})`
      );
    } else {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(CACHED_USER_KEY);
        } catch {
          // ignore
        }
      }
      set({ currentUser: INITIAL_USERS[0], isAuthenticated: false, authLoading: false });
    }
  },

  signOutUser: async () => {
    try {
      await logOutGoogle();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CACHED_USER_KEY);
      } catch {
        // ignore
      }
    }
    const currentId = get().currentUser?.id || 'unknown';
    set({
      currentUser: INITIAL_USERS[0],
      isAuthenticated: false,
      authLoading: false
    });
    get().addAuditLog('LOGOUT', 'UserProfile', currentId, 'User signed out from Breakthrough OS');
  },

  handleAuthUser: async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(CACHED_USER_KEY);
        } catch {
          // ignore
        }
      }
      set({ isAuthenticated: false, authLoading: false });
      return null;
    }
    set({ authLoading: true });
    try {
      let profile = await getUserProfile(firebaseUser.uid);
      const emailLower = (firebaseUser.email || '').toLowerCase();
      const isSystemAdminEmail =
        emailLower === 'shivandharipersad@gmail.com' ||
        emailLower.includes('admin@breakthrough') ||
        emailLower.endsWith('@breakthroughconsult.com.au') ||
        emailLower.endsWith('@breakthrough.org.au') ||
        emailLower.startsWith('admin@');

      if (!profile) {
        const role: UserRole = isSystemAdminEmail ? 'ADMIN' : 'PENDING';

        profile = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || (isSystemAdminEmail ? 'System Administrator' : firebaseUser.email?.split('@')[0] || 'NDIS Specialist'),
          displayName: firebaseUser.displayName || undefined,
          email: firebaseUser.email || '',
          role: role,
          photoURL: firebaseUser.photoURL || undefined,
          avatarUrl: firebaseUser.photoURL || undefined,
          position: isSystemAdminEmail ? 'Clinical Director & Lead Administrator' : 'Pending Verification',
          practitionerId: `prac-${firebaseUser.uid.slice(-4)}`,
          workerScreeningStatus: isSystemAdminEmail ? 'Valid' : 'Pending',
          workerScreeningExpiry: '2028-12-31',
          policeCheckExpiry: '2027-12-31',
          ndisOrientationDone: true,
          activeCaseload: isSystemAdminEmail ? 12 : 0,
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await saveUserProfile(profile).catch((err) =>
          console.warn('Could not persist new user profile to Firestore:', err)
        );
      } else if (isSystemAdminEmail && profile.role !== 'ADMIN') {
        profile = { ...profile, role: 'ADMIN' };
        await saveUserProfile(profile).catch((err) =>
          console.warn('Could not update admin role:', err)
        );
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
        } catch {
          // ignore
        }
      }
      set({ currentUser: profile, isAuthenticated: true, authLoading: false });
      return profile;
    } catch (err) {
      console.error('handleAuthUser error:', err);
      const fallback: UserProfile = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'NDIS Specialist',
        email: firebaseUser.email || '',
        role: 'PENDING',
        position: 'Pending Verification',
        workerScreeningStatus: 'Pending',
        workerScreeningExpiry: '2028-12-31',
        policeCheckExpiry: '2027-12-31',
        ndisOrientationDone: false,
        activeCaseload: 0
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(fallback));
        } catch {
          // ignore
        }
      }
      set({ currentUser: fallback, isAuthenticated: true, authLoading: false });
      return fallback;
    }
  },

  canEdit: () => {
    const role = get().currentUser?.role;
    return role === 'ADMIN' || role === 'PRACTITIONER' || role === 'SUPPORT_COORDINATOR';
  },

  canDelete: () => {
    return get().currentUser?.role === 'ADMIN';
  },

  isAdmin: () => {
    return get().currentUser?.role === 'ADMIN';
  },

  isPractitioner: () => {
    const role = get().currentUser?.role;
    return role === 'PRACTITIONER' || role === 'ADMIN';
  },

  isViewer: () => {
    return get().currentUser?.role === 'VIEWER';
  },

  isSupportCoordinator: () => {
    const role = get().currentUser?.role;
    return role === 'SUPPORT_COORDINATOR' || role === 'ADMIN';
  },

  isParticipant: () => {
    return get().currentUser?.role === 'PARTICIPANT';
  },

  switchUser: (id: string) => {
    const user = get().users.find((u) => u.id === id);
    if (user) {
      set({ currentUser: user });
      get().addAuditLog('SWITCH_USER', 'UserProfile', user.id, `Active session switched to ${user.name} (${user.role})`);
    }
  },

  setUserRole: (role: UserRole) => {
    set((state) => ({
      currentUser: { ...state.currentUser, role }
    }));
    get().addAuditLog('UPDATE_ROLE', 'UserProfile', get().currentUser.id, `User role altered to ${role}`);
  }
});
