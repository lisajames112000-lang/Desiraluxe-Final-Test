import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  browserLocalPersistence,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User } from
'firebase/auth';
import { firebaseClient } from '../services/firebase/client';

export type AdminAuthState = 'configuration-error' | 'loading' | 'signed-out' | 'verifying-permission' | 'authorized' | 'permission-denied' | 'error';

interface AdminAuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  state: AdminAuthState;
  configurationError: string | null;
  authenticationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

class OwnerSetupError extends Error {}

interface OwnerSetupResult {ok: boolean;message?: string;}

// After a successful Firebase sign-in, ask the server to grant the admin claim
// only to the explicitly allowlisted owner account. The password is never sent
// to this endpoint and the endpoint cannot create/reset Authentication users.
async function requestOwnerSetup(user: User): Promise<OwnerSetupResult> {
  try {
    const idToken = await user.getIdToken();
    const response = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({})
    });
    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    if (!isJson) {
      return { ok: false, message: 'The admin setup API is unavailable. Sign in from the deployed Vercel website and verify that /api/admin/bootstrap is deployed.' };
    }
    const body = (await response.json().catch(() => ({}))) as { ready?: boolean; error?: string };
    if (response.ok && body.ready) return { ok: true };
    return { ok: false, message: body.error || 'The server could not authorize this owner account.' };
  } catch {
    return { ok: false, message: 'The admin setup service could not be reached. Check the deployed API and try again.' };
  }
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function authMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) return 'Sign-in could not be completed. Please try again.';
  if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(error.code)) return 'The email or password is incorrect.';
  if (error.code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment or reset the password.';
  if (error.code === 'auth/network-request-failed') return 'The authentication service is unreachable. Check your connection and retry.';
  if (error.code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (error.code === 'auth/operation-not-allowed') return 'Email/Password sign-in is turned off in Firebase. Open Firebase Console → Authentication → Sign-in method and enable "Email/Password".';
  if (error.code === 'auth/configuration-not-found') return 'Firebase Authentication is not activated for this project. Open Firebase Console → Authentication, click "Get started", then enable "Email/Password".';
  if (error.code === 'auth/user-disabled') return 'This admin account is disabled in Firebase Authentication.';
  if (error.code.startsWith('auth/api-key') || error.code === 'auth/invalid-api-key') return 'The Firebase Web API key is not valid for this website.';
  return `Sign-in could not be completed (${error.code}). Please try again.`;
}

export function AdminAuthProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(firebaseClient.configured);
  const [state, setState] = useState<AdminAuthState>(firebaseClient.configured ? 'loading' : 'configuration-error');
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);
  const deniedSignOut = useRef(false);
  const signInInProgress = useRef(false);

  useEffect(() => {
    const auth = firebaseClient.auth;
    if (!auth) {
      setLoading(false);
      setState('configuration-error');
      return;
    }
    void setPersistence(auth, browserLocalPersistence).catch(() => {
      setAuthenticationError('This browser could not enable durable Firebase sign-in persistence.');
    });
    return onAuthStateChanged(auth, async (nextUser) => {
      const preserveForSignIn = signInInProgress.current;
      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        if (deniedSignOut.current) {
          deniedSignOut.current = false;
        } else {
          setState('signed-out');
        }
        return;
      }
      // Keep guarded routes in their loading state until the claim is verified,
      // otherwise /admin/* briefly sees isAdmin=false and redirects to /admin.
      setLoading(true);
      setState('verifying-permission');
      try {
        const token = await nextUser.getIdTokenResult(true);
        // The explicit sign-in flow may be provisioning the allowlisted owner
        // claim right now. Let that flow finish instead of racing it with sign-out.
        if (preserveForSignIn) return;
        const authorized = token.claims.admin === true;
        setUser(authorized ? nextUser : null);
        setIsAdmin(authorized);
        setState(authorized ? 'authorized' : 'permission-denied');
        setAuthenticationError(authorized ? null : 'This signed-in account does not have the required admin custom claim.');
        if (!authorized) {
          deniedSignOut.current = true;
          await signOut(auth);
        }
      } catch {
        setUser(null);
        setIsAdmin(false);
        setState('error');
        setAuthenticationError('Firebase could not verify the admin claim. Check the network, Authentication setup, and authorized account.');
      } finally {
        setLoading(false);
      }
    }, () => {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      setState('error');
      setAuthenticationError('Firebase Authentication could not be reached. Check the public configuration and authorized domains.');
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = firebaseClient.auth;
    if (!auth) throw new Error(firebaseClient.configurationError || 'Firebase is not configured.');
    deniedSignOut.current = false;
    signInInProgress.current = true;
    setAuthenticationError(null);
    setState('loading');
    try {
      // Never reset or create an account as a side effect of a failed password
      // sign-in. Firebase must first verify the supplied credentials.
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setState('verifying-permission');

      let token = await credential.user.getIdTokenResult(true);
      if (token.claims.admin !== true) {
        const setup = await requestOwnerSetup(credential.user);
        if (!setup.ok) throw new OwnerSetupError(setup.message || 'This account is not authorized for DesiraLuxe administration.');
        token = await credential.user.getIdTokenResult(true);
      }

      if (token.claims.admin !== true) {
        deniedSignOut.current = true;
        setState('permission-denied');
        setAuthenticationError('This signed-in account does not have the required admin custom claim.');
        await signOut(auth);
        throw new Error('This account is not authorized for DesiraLuxe administration.');
      }

      setUser(credential.user);
      setIsAdmin(true);
      setLoading(false);
      setState('authorized');
      setAuthenticationError(null);
      signInInProgress.current = false;
    } catch (error) {
      signInInProgress.current = false;
      if (error instanceof OwnerSetupError) {
        setState('error');
        deniedSignOut.current = true;
        if (auth.currentUser) await signOut(auth).catch(() => undefined);
        setAuthenticationError(error.message);
        throw error;
      }
      if (error instanceof Error && error.message.includes('not authorized')) throw error;
      setState('error');
      const message = authMessage(error);
      setAuthenticationError(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (email: string) => {
    const auth = firebaseClient.auth;
    if (!auth) throw new Error(firebaseClient.configurationError || 'Firebase is not configured.');
    if (!email.trim()) throw new Error('Enter the owner email first.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/invalid-email') throw new Error('Enter a valid email address.');
      throw new Error('If the account exists, Firebase will send reset instructions.');
    }
  };

  const changePassword = async (currentPassword: string, nextPassword: string) => {
    const current = firebaseClient.auth?.currentUser;
    if (!current?.email) throw new Error('Sign in again before changing the password.');
    try {
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, currentPassword));
      await updatePassword(current, nextPassword);
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(error.code)) throw new Error('The current password is incorrect.');
        if (error.code === 'auth/weak-password') throw new Error('Choose a stronger new password (at least 8 characters).');
        if (error.code === 'auth/too-many-requests') throw new Error('Too many attempts. Wait a few minutes and try again.');
        if (error.code === 'auth/network-request-failed') throw new Error('Connection problem. Check your internet and try again.');
      }
      throw new Error('The password could not be changed. Please try again.');
    }
  };

  const logout = async () => {
    if (firebaseClient.auth) await signOut(firebaseClient.auth);
  };

  const value = useMemo(() => ({
    user,
    isAdmin,
    loading,
    state,
    configurationError: firebaseClient.configurationError,
    authenticationError,
    signIn,
    resetPassword,
    changePassword,
    logout
  }), [authenticationError, isAdmin, loading, state, user]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
