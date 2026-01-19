import { Droplets, Activity, FlaskConical, Heart, Beaker, Zap } from 'lucide-react';

export const CATEGORY_INFO = {
  cbc: { label: "Complete Blood Count", icon: Droplets, color: "#ef4444" },
  wbc: { label: "WBC Differential", icon: Activity, color: "#a855f7" },
  metabolic: { label: "Metabolic Panel", icon: FlaskConical, color: "#3b82f6" },
  lipid: { label: "Lipid Panel", icon: Heart, color: "#f97316" },
  liver: { label: "Liver Function", icon: Beaker, color: "#22c55e" },
  thyroid: { label: "Thyroid", icon: Zap, color: "#eab308" },
  inflammatory: { label: "Inflammatory Markers", icon: Activity, color: "#ec4899" },
  urine: { label: "Urinalysis", icon: Droplets, color: "#06b6d4" },
};
