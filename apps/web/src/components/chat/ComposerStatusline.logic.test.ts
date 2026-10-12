import type { ServerProviderUsageLimits, ServerProviderUsageWindow } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { statuslineSegments } from "./ComposerStatusline.logic";

const NOW = Date.parse("2026-10-12T10:00:00.000Z");

function limits(windows: ServerProviderUsageWindow[]): ServerProviderUsageLimits {
  return { checkedAt: "2026-10-12T09:59:00.000Z", windows };
}

describe("statuslineSegments", () => {
  it("shows context, session and the account-wide weekly window for Claude", () => {
    expect(
      statuslineSegments({
        contextWindow: { usedPercentage: 41.6 },
        usageLimits: limits([
          {
            id: "seven_day_opus",
            kind: "weekly",
            label: "Weekly · Opus",
            usedPercent: 92,
            windowDurationMins: 10080,
            resetsAt: "2026-10-14T10:00:00.000Z",
          },
          {
            id: "five_hour",
            kind: "session",
            label: "Session",
            usedPercent: 31,
            windowDurationMins: 300,
            resetsAt: "2026-10-12T12:14:00.000Z",
          },
          {
            id: "seven_day",
            kind: "weekly",
            label: "Weekly",
            usedPercent: 58,
            windowDurationMins: 10080,
            resetsAt: "2026-10-15T14:30:00.000Z",
          },
        ]),
        now: NOW,
      }),
    ).toEqual([
      { key: "ctx", label: "ctx", usedPercent: 42, tone: "normal", resetsIn: null },
      { key: "five_hour", label: "5h", usedPercent: 31, tone: "normal", resetsIn: "2h 14m" },
      { key: "seven_day", label: "7d", usedPercent: 58, tone: "normal", resetsIn: "3d 4h" },
    ]);
  });

  it("shows context and the weekly window when Codex reports only a weekly window", () => {
    expect(
      statuslineSegments({
        contextWindow: { usedPercentage: 12 },
        usageLimits: limits([
          {
            id: "secondary",
            kind: "weekly",
            label: "Weekly",
            usedPercent: 70.4,
            windowDurationMins: 10080,
            resetsAt: "2026-10-12T10:45:00.000Z",
          },
        ]),
        now: NOW,
      }),
    ).toEqual([
      { key: "ctx", label: "ctx", usedPercent: 12, tone: "normal", resetsIn: null },
      { key: "secondary", label: "7d", usedPercent: 70, tone: "warning", resetsIn: "45m" },
    ]);
  });

  it("has no segments without context or limits", () => {
    expect(statuslineSegments({ contextWindow: null, usageLimits: null, now: NOW })).toEqual([]);
  });

  it("omits context when its percentage is unknown", () => {
    expect(
      statuslineSegments({
        contextWindow: { usedPercentage: null },
        usageLimits: limits([
          {
            id: "five_hour",
            kind: "session",
            label: "Session",
            usedPercent: 5,
            windowDurationMins: 300,
          },
        ]),
        now: NOW,
      }),
    ).toEqual([{ key: "five_hour", label: "5h", usedPercent: 5, tone: "normal", resetsIn: null }]);
  });

  it("switches tone at 60 and 85 percent used", () => {
    expect(
      [59, 60, 84, 85].map(
        (usedPercentage) =>
          statuslineSegments({ contextWindow: { usedPercentage }, usageLimits: null, now: NOW })[0]
            ?.tone,
      ),
    ).toEqual(["normal", "warning", "warning", "critical"]);
  });

  it("drops the countdown once the reset time has passed", () => {
    expect(
      statuslineSegments({
        contextWindow: null,
        usageLimits: limits([
          {
            id: "five_hour",
            kind: "session",
            label: "Session",
            usedPercent: 90,
            windowDurationMins: 300,
            resetsAt: "2026-10-12T09:00:00.000Z",
          },
        ]),
        now: NOW,
      }),
    ).toEqual([
      { key: "five_hour", label: "5h", usedPercent: 90, tone: "critical", resetsIn: null },
    ]);
  });
});
