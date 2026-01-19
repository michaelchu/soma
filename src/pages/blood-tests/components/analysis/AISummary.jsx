import { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { REFERENCE_RANGES } from '../../constants/referenceRanges';
import { getStatus } from '../../utils/statusHelpers';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

export function AISummary({ reports }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSummary = async () => {
    setLoading(true); setError(null);
    try {
      const sortedReports = [...reports].sort((a, b) => new Date(a.date) - new Date(b.date));

      // Build comprehensive data with reference ranges
      const reportAnalysis = sortedReports.map(r => {
        const findings = [];
        Object.entries(r.metrics).forEach(([key, data]) => {
          const ref = REFERENCE_RANGES[key];
          if (!ref) return;
          const status = getStatus(data.value, data.min, data.max);
          const inOptimal = (data.optimalMin !== null && data.optimalMax !== null) ?
            (data.value >= data.optimalMin && data.value <= data.optimalMax) : null;

          findings.push({
            metric: data.name,
            value: data.value,
            unit: data.unit,
            status,
            referenceRange: `${data.min ?? '—'}–${data.max ?? '—'}`,
            optimalRange: (data.optimalMin !== null && data.optimalMax !== null) ? `${data.optimalMin}–${data.optimalMax}` : null,
            inOptimalRange: inOptimal,
            clinicalContext: data.clinicalNotes
          });
        });

        return {
          date: r.date,
          abnormalFindings: findings.filter(f => f.status !== 'normal'),
          suboptimalFindings: findings.filter(f => f.status === 'normal' && f.inOptimalRange === false),
          normalCount: findings.filter(f => f.status === 'normal').length,
          totalCount: findings.length
        };
      });

      // Build trend data for key metrics
      const keyMetrics = ['hemoglobin', 'creatinine', 'egfr', 'ldl', 'hdl', 'glucose_fasting', 'alt', 'uric_acid', 'lymphocytes', 'cholesterol_total'];
      const trends = {};
      keyMetrics.forEach(key => {
        const reportsWithMetric = sortedReports.filter(r => r.metrics[key]);
        if (reportsWithMetric.length === 0) return;

        const latestMetric = reportsWithMetric[reportsWithMetric.length - 1].metrics[key];
        const values = reportsWithMetric.map(r => ({
          date: r.date,
          value: r.metrics[key].value,
          status: getStatus(r.metrics[key].value, r.metrics[key].min, r.metrics[key].max)
        }));

        if (values.length >= 2) {
          trends[latestMetric.name] = {
            values,
            referenceRange: `${latestMetric.min ?? '—'}–${latestMetric.max ?? '—'} ${latestMetric.unit}`,
            optimalRange: (latestMetric.optimalMin !== null && latestMetric.optimalMax !== null) ?
              `${latestMetric.optimalMin}–${latestMetric.optimalMax} ${latestMetric.unit}` : null,
            clinicalNotes: latestMetric.clinicalNotes
          };
        }
      });

      const prompt = `You are a knowledgeable health assistant analyzing blood test results. Provide helpful insights while always recommending consultation with a healthcare provider.

PATIENT DATA SUMMARY:
- Reports analyzed: ${reports.length} (spanning ${sortedReports[0]?.date} to ${sortedReports[sortedReports.length-1]?.date})
- Total unique metrics tracked: ${Object.keys(REFERENCE_RANGES).length}

REPORT-BY-REPORT ANALYSIS:
${JSON.stringify(reportAnalysis, null, 2)}

KEY METRIC TRENDS WITH REFERENCE RANGES:
${JSON.stringify(trends, null, 2)}

REFERENCE RANGE CONTEXT:
- Reference ranges represent values for 95% of healthy individuals
- Optimal ranges (when provided) represent ideal target values
- Values can vary based on age, diet, hydration, and other factors

Please provide a personalized health summary that:
1. Highlights the most clinically significant findings (especially the recent elevated uric acid at 573 vs optimal 250-420, and low lymphocytes at 0.9 vs reference 1.0-2.9)
2. Notes positive trends (like ALT normalizing from 52 to 25, and HDL improving from 0.97 to 1.05)
3. Compares current values to both reference AND optimal ranges where relevant
4. Suggests which metrics might warrant monitoring
5. Ends with an appropriate disclaimer about consulting healthcare providers

Format your response with:
- Use **bold** for metric names and important values
- Use bullet points for listing key findings
- Keep it organized but conversational
- Be supportive and educational, not alarmist`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
      });
      const data = await response.json();
      setSummary(data.content?.map(c => c.text || '').join('') || 'Unable to generate summary.');
    } catch (err) { setError('Failed to generate summary.'); console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center"><Activity size={16} className="text-white" /></div>
        <h3 className="font-semibold text-foreground">AI Health Analysis</h3>
      </div>
      {summary ? (
        <div>
          <MarkdownRenderer content={summary} />
          <button onClick={generateSummary} disabled={loading} className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">{loading ? 'Analyzing...' : '↻ Regenerate'}</button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-3">Get AI analysis of your {reports.length} reports with reference range context.</p>
          <button onClick={generateSummary} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />} {loading ? 'Analyzing...' : 'Generate Analysis'}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">For informational purposes only. Always consult your healthcare provider.</p>
    </div>
  );
}
