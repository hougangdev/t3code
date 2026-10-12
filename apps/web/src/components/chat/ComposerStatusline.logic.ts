import type { ServerProviderUsageLimits, ServerProviderUsageWindow } from "@t3tools/contracts";
import { formatDuration } from "@t3tools/shared/usageLimits";

import type { ContextWindowSnapshot } from "~/lib/contextWindow";

export type StatuslineTone = "normal" | "warning" | "critical";

export type StatuslineSegment = {
  readonly key: string;
  readonly label: string;
  readonly usedPercent: number;
  readonly tone: StatuslineTone;
  readonly resetsIn: string | null;
};

const LIMIT_WINDOW_KINDS = ["session", "weekly", "monthly"] as const;

function toneFor(usedPercent: number): StatuslineTone {
  if (usedPercent >= 85) return "critical";
  if (usedPercent >= 60) return "warning";
  return "normal";
}

function windowLabel(window: ServerProviderUsageWindow): string {
  const minutes = window.windowDurationMins;
  if (minutes === undefined || minutes <= 0) return window.label;
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return window.label;
}

function windowResetsIn(window: ServerProviderUsageWindow, now: number): string | null {
  if (window.resetsAt === undefined) return null;
  const resetsAt = Date.parse(window.resetsAt);
  if (!Number.isFinite(resetsAt) || resetsAt <= now) return null;
  return formatDuration(resetsAt - now);
}

function accountWideWindow(
  windows: readonly ServerProviderUsageWindow[],
): ServerProviderUsageWindow | undefined {
  const unscoped = windows.find((window) =>
    windows.every((other) => other.id === window.id || other.id.startsWith(`${window.id}_`)),
  );
  if (unscoped) return unscoped;
  return windows.toSorted((a, b) => b.usedPercent - a.usedPercent)[0];
}

function segment(key: string, label: string, percent: number, resetsIn: string | null) {
  const usedPercent = Math.round(Math.max(0, Math.min(100, percent)));
  return { key, label, usedPercent, tone: toneFor(usedPercent), resetsIn };
}

export function statuslineSegments(input: {
  readonly contextWindow: Pick<ContextWindowSnapshot, "usedPercentage"> | null;
  readonly usageLimits: ServerProviderUsageLimits | null;
  readonly now: number;
}): readonly StatuslineSegment[] {
  const segments: StatuslineSegment[] = [];
  const contextPercent = input.contextWindow?.usedPercentage;
  if (typeof contextPercent === "number" && Number.isFinite(contextPercent)) {
    segments.push(segment("ctx", "ctx", contextPercent, null));
  }
  const limits = input.usageLimits;
  if (limits === null || limits.unavailable?.reason === "unsupported") return segments;
  for (const kind of LIMIT_WINDOW_KINDS) {
    const window = accountWideWindow(limits.windows.filter((candidate) => candidate.kind === kind));
    if (window === undefined) continue;
    segments.push(
      segment(
        window.id,
        windowLabel(window),
        window.usedPercent,
        windowResetsIn(window, input.now),
      ),
    );
  }
  return segments;
}
