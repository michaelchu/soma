import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { runMigration } from '@/lib/db/migrate';

export default function Migrate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, running, success, error
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs((prev) => [...prev, message]);
  };

  const handleMigration = async () => {
    setStatus('running');
    setLogs([]);
    setResults(null);

    // Override console.log to capture output
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (msg) => {
      originalLog(msg);
      addLog(msg);
    };
    console.error = (msg) => {
      originalError(msg);
      addLog(`ERROR: ${msg}`);
    };

    try {
      const result = await runMigration();
      setResults(result);
      setStatus(result.success ? 'success' : 'error');
    } catch (err) {
      setResults({ success: false, error: err.message });
      setStatus('error');
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Migration
            </CardTitle>
            <CardDescription>
              Migrate your existing markdown data to Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>What this does:</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Reads blood pressure readings from markdown file</li>
                  <li>Reads blood test reports from markdown file</li>
                  <li>Inserts all data into your Supabase database</li>
                  <li>Safe to run multiple times (skips if data exists)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleMigration}
              disabled={status === 'running'}
              className="w-full"
            >
              {status === 'running' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Run Migration
                </>
              )}
            </Button>

            {logs.length > 0 && (
              <div className="bg-muted rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className={log.startsWith('ERROR') ? 'text-destructive' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            )}

            {status === 'success' && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Migration Successful</AlertTitle>
                <AlertDescription>
                  Your data has been migrated to Supabase. You can now use the app normally.
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Migration Failed</AlertTitle>
                <AlertDescription>
                  {results?.error || 'An error occurred during migration'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
