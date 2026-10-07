import type { CommercialActivity } from "@/domains/core/entities";

export type CommercialDateParts = { week: number; month: number; year: number; period: string };

export function commercialDateParts(value?: string): CommercialDateParts | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = utc.getUTCFullYear();
  const month = date.getMonth() + 1;
  return { week, month, year, period: `${year}-${String(month).padStart(2, "0")}` };
}

export function activityDate(activity: CommercialActivity) { return activity.completedAt ?? activity.scheduledAt; }
export function groupCommercialActivities(activities: CommercialActivity[], granularity: "week" | "month") {
  return activities.reduce<Record<string, CommercialActivity[]>>((groups, activity) => {
    const parts = commercialDateParts(activityDate(activity));
    if (!parts) return groups;
    const key = granularity === "week" ? `${parts.year}-W${String(parts.week).padStart(2, "0")}` : parts.period;
    (groups[key] ??= []).push(activity);
    return groups;
  }, {});
}

export function aggregateCommercialActivities(activities: CommercialActivity[]) {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const activity of activities) { byType[activity.type] = (byType[activity.type] ?? 0) + 1; byStatus[activity.status] = (byStatus[activity.status] ?? 0) + 1; }
  return { total: activities.length, byType, byStatus, byWeek: groupCommercialActivities(activities, "week"), byMonth: groupCommercialActivities(activities, "month") };
}
