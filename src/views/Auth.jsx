import { useState, useEffect } from 'react';
import { isFirstTimeSetup, setupPasscode, verifyPasscode, createSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Auth({ onAuthenticated }) {
  const [isSetup, setIsSetup] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSetup(isFirstTimeSetup());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSetup) {
        if (passcode.length < 4) {
          setError('Passcode must be at least 4 characters');
          setLoading(false);
          return;
        }
        if (passcode !== confirmPasscode) {
          setError('Passcodes do not match');
          setLoading(false);
          return;
        }
        await setupPasscode(passcode);
        createSession(remember);
        onAuthenticated();
      } else {
        const valid = await verifyPasscode(passcode);
        if (valid) {
          createSession(remember);
          onAuthenticated();
        } else {
          setError('Incorrect passcode');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <span className="text-3xl font-semibold">S</span>
          </div>
          <h1 className="text-2xl font-semibold">Soma</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isSetup ? 'Create your passcode' : 'Welcome back'}
          </p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {isSetup ? 'Set up passcode' : 'Sign in'}
            </CardTitle>
            <CardDescription>
              {isSetup 
                ? 'Choose a passcode to protect your portal' 
                : 'Enter your passcode to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passcode">
                  {isSetup ? 'New Passcode' : 'Passcode'}
                </Label>
                <Input
                  id="passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••"
                  autoFocus
                  autoComplete={isSetup ? 'new-password' : 'current-password'}
                />
              </div>

              {isSetup && (
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Passcode</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={remember}
                  onCheckedChange={setRemember}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : (isSetup ? 'Create Passcode' : 'Sign In')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-xs mt-6">
          Your personal app portal
        </p>
      </div>
    </div>
  );
}
