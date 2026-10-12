import { refreshUsageLimits } from "@t3tools/client-runtime/state/usage";
import type { EnvironmentId, ServerProviderUsageLimits } from "@t3tools/contracts";
import { Fragment, memo, useEffect } from "react";

import { useNowMinute } from "~/hooks/useNowMinute";
import type { ContextWindowSnapshot } from "~/lib/contextWindow";
import { useEnvironmentPresentation } from "~/state/presentation";
import { serverEnvironment } from "~/state/server";
import { useAtomCommand } from "~/state/use-atom-command";

import { type StatuslineTone, statuslineSegments } from "./ComposerStatusline.logic";

const TONE_CLASS_NAMES: Record<StatuslineTone, string | undefined> = {
  normal: undefined,
  warning: "text-warning",
  critical: "text-error",
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
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap px-3 pt-1.5 text-2xs text-muted-foreground tabular-nums sm:px-4">
      {segments.map((segment, index) => (
        <Fragment key={segment.key}>
          {index > 0 ? <span className="text-muted-foreground/50">·</span> : null}
          <span>
            {segment.label}{" "}
            <span className={TONE_CLASS_NAMES[segment.tone]}>{segment.usedPercent}%</span>
            {segment.resetsIn !== null ? (
              <span className="text-muted-foreground/60"> ({segment.resetsIn})</span>
            ) : null}
          </span>
        </Fragment>
      ))}
    </div>
  );
});
