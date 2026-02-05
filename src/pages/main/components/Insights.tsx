import { useMainPage } from '../context/MainPageContext';

export function Insights() {
  const { healthScore, bpReadings, sleepEntries, activities } = useMainPage();

  if (!healthScore) return null;

  const insights: string[] = [];

  // BP insights
  if (healthScore.bpScore) {
    const { bpScore } = healthScore;
    if (bpScore.variabilityPenalty > 10) {
      insights.push('Your BP readings show high variability. Try measuring at consistent times.');
    }
    if (bpScore.trendModifier > 0) {
      insights.push(
        `BP is trending down by ${Math.abs(bpScore.trendModifier)} points - good progress!`
      );
    } else if (bpScore.trendModifier < 0) {
      insights.push(
        'BP has been trending up recently. Monitor and consider lifestyle adjustments.'
      );
    }
    if (bpScore.category === 'Optimal') {
      insights.push('Blood pressure is in the optimal range. Keep up the good work!');
    }
  }

  // Sleep insights
  if (healthScore.sleepScore) {
    const { sleepScore } = healthScore;
    if (sleepScore.durationScore < 60) {
      const avgHours = (sleepScore.avgDurationMinutes / 60).toFixed(1);
      insights.push(`Averaging ${avgHours}h of sleep. Aim for 7-9 hours for better recovery.`);
    }
    if (sleepScore.avgRestorative !== null && sleepScore.avgRestorative < 35) {
      insights.push(
        `Restorative sleep (${sleepScore.avgRestorative}%) is below optimal. Consider limiting caffeine and screens before bed.`
      );
    }
    if (sleepScore.consistencyBonus < 0) {
      insights.push(
        'Sleep duration varies significantly. A consistent schedule improves sleep quality.'
      );
    }
  }

  // Activity insights
  if (healthScore.activityScore) {
    const { activityScore } = healthScore;
    if (activityScore.trainingLoadScore < 40) {
      insights.push('Training load is low. Gradually increase activity to build fitness.');
    } else if (activityScore.trainingLoadScore >= 85) {
      insights.push('Training load is high. Ensure adequate recovery between sessions.');
    }
    if (activityScore.consistencyScore < 50) {
      insights.push('Activity consistency is low. Aim for 3-4 sessions per week for best results.');
    }
    if (activityScore.effortScore < 50) {
      insights.push(
        'Consider adjusting your training intensity to match your current fitness level.'
      );
    }
  }

  // Cross-metric insights
  if (healthScore.crossMetric.reasons.length > 0) {
    for (const reason of healthScore.crossMetric.reasons) {
      insights.push(reason + '.');
    }
  }

  // Legacy cross-metric insight (sleep-BP correlation)
  if (
    healthScore.crossMetric.reasons.length === 0 &&
    bpReadings.length > 0 &&
    sleepEntries.length > 0
  ) {
    const poorSleepDates = sleepEntries.filter((e) => e.durationMinutes < 360).map((e) => e.date);

    if (poorSleepDates.length > 0) {
      const nextDayHighBp = bpReadings.filter((r) => {
        return poorSleepDates.some((sleepDate) => {
          const nextDay = new Date(sleepDate);
          nextDay.setDate(nextDay.getDate() + 1);
          return nextDay.toISOString().slice(0, 10) === r.date;
        });
      });

      if (nextDayHighBp.length > 0) {
        const avgSys = nextDayHighBp.reduce((sum, r) => sum + r.systolic, 0) / nextDayHighBp.length;
        if (avgSys > 130) {
          insights.push('BP tends to be higher after nights with less than 6 hours of sleep.');
        }
      }
    }
  }

  // Confidence factor insight
  if (healthScore.confidenceFactor < 1.0) {
    const missingCount =
      3 -
      [healthScore.bpScore, healthScore.sleepScore, healthScore.activityScore].filter(Boolean)
        .length;
    if (missingCount > 0 && activities.length === 0 && bpReadings.length > 0) {
      insights.push('Add activity data to get a more complete health picture.');
    }
  }

  // Limit to top 3 most relevant insights
  const displayInsights = insights.slice(0, 3);

  if (displayInsights.length === 0) {
    displayInsights.push('Keep tracking to get personalized insights about your health patterns.');
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Insights
      </h2>
      <ul className="space-y-2">
        {displayInsights.map((insight, i) => (
          <li key={i} className="text-sm text-foreground flex gap-2">
            <span className="text-muted-foreground">•</span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
