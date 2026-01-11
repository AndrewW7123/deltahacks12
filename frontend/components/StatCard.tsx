"use client";

import { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
};

export default function StatCard({ icon: Icon, label, value, unit }: StatCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
      </div>
    </div>
  );
}
