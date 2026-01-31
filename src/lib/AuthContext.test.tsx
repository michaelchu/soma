import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

function TestConsumer({ onSignInError }: { onSignInError?: (e: Error) => void }) {
  const { user, loading, signIn, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn('test@example.com', 'password');
    } catch (e) {
      onSignInError?.(e as Error);
    }
  };

  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{user ? user.email : 'no-user'}</span>
      <button onClick={handleSignIn}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockSession = { user: mockUser, access_token: 'token' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('loads session on mount and sets user', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: mockSession },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    it('handles no existing session', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: null },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('handles session fetch error gracefully', async () => {
      (supabase.auth.getSession as Mock).mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session: null } });
      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
        });
      });
    });

    it('throws error on sign in failure', async () => {
      const onError = vi.fn();
      (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session: null } });
      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        error: new Error('Invalid credentials'),
      });

      render(
        <AuthProvider>
          <TestConsumer onSignInError={onError} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: mockSession },
      });
      (supabase.auth.signOut as Mock).mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      fireEvent.click(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });
    });
  });

  describe('session timeout', () => {
    it('sets up inactivity timeout when user is logged in', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: mockSession },
      });
      (supabase.auth.signOut as Mock).mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      // Fast-forward 30 minutes
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });
    });

    it('does not set timeout when user is not logged in', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      (supabase.auth.getSession as Mock).mockResolvedValue({
        data: { session: null },
      });
      (supabase.auth.signOut as Mock).mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      // Fast-forward 30 minutes
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);

      // Should not call signOut since no user is logged in
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });
});
