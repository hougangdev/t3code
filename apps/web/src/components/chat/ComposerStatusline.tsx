import { refreshUsageLimits } from "@t3tools/client-runtime/state/usage";
import type { EnvironmentId, ServerProviderUsageLimits } from "@t3tools/contracts";
import { Fragment, memo, useEffect } from "react";

import { useNowMinute } from "~/hooks/useNowMinute";
import { cn } from "~/lib/utils";
import type { ContextWindowSnapshot } from "~/lib/contextWindow";
import { useEnvironmentPresentation } from "~/state/presentation";
import { serverEnvironment } from "~/state/server";
import { useAtomCommand } from "~/state/use-atom-command";

import { type StatuslineTone, statuslineSegments } from "./ComposerStatusline.logic";

const TONE_CLASS_NAMES: Record<StatuslineTone, { text: string; fill: string }> = {
  normal: { text: "text-success", fill: "bg-success" },
  warning: { text: "text-warning", fill: "bg-warning" },
  critical: { text: "text-error", fill: "bg-error" },
};

export const ComposerStatusline = memo(function ComposerStatusline(props: {
  environmentId: EnvironmentId;
  contextWindow: ContextWindowSnapshot | null;
  usageLimits: ServerProviderUsageLimits | null;
}) {
  const { environmentId, contextWindow, usageLimits } = props;
  const nowMinute = useNowMinute();
  const { presentation } = useEnvironmentPresentation(environmentId);
  const environmentConnected =
    presentation?.connection.phase === "connected" && presentation.serverConfig !== null;
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    reportFailure: false,
  });

  useEffect(() => {
    if (!environmentConnected) return;
    void refreshUsageLimits(
      environmentId,
      () => refreshProviders({ environmentId, input: {} }),
      true,
    );
  }, [environmentConnected, environmentId, refreshProviders]);

  const segments = statuslineSegments({
    contextWindow,
    usageLimits,
    now: Date.parse(`${nowMinute}:00.000Z`),
  });
  if (segments.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap px-3 -mt-1.5 pb-3 text-2xs text-muted-foreground tabular-nums sm:-mt-2 sm:px-4">
      {segments.map((segment, index) => (
        <Fragment key={segment.key}>
          {index > 0 ? <span className="text-muted-foreground/40">·</span> : null}
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-foreground/70">{segment.label}</span>
            <span className="h-1 w-8 overflow-hidden rounded-full bg-muted-foreground/20">
              <span
                className={cn("block h-full rounded-full", TONE_CLASS_NAMES[segment.tone].fill)}
                style={{ width: `${segment.usedPercent}%` }}
              />
            </span>
            <span className={cn("font-medium", TONE_CLASS_NAMES[segment.tone].text)}>
              {segment.usedPercent}%
            </span>
            {segment.resetsIn !== null ? (
              <span className="text-muted-foreground/60">{segment.resetsIn}</span>
            ) : null}
          </span>
        </Fragment>
      ))}
    </div>
  );
});
