import { useEffect, useState } from 'react';
import { formatSubmissionDateTime } from '../../lib/format';

function formatRemainingCountdown(targetIso: string, nowMs: number): { remainingMs: number; label: string } {
  const targetMs = Date.parse(targetIso);
  if (!Number.isFinite(targetMs)) return { remainingMs: 0, label: '00:00:00' };
  const remainingMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    remainingMs,
    label: `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
  };
}

interface DeactivationCountdownProps {
  closesAt: string;
  prefix?: string;
  expiredLabel?: string;
  className?: string;
}

/** Live per-second countdown until an evaluator account automatically deactivates. */
export function DeactivationCountdown({
  closesAt,
  prefix = '',
  expiredLabel = 'Deactivated',
  className = '',
}: DeactivationCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { remainingMs, label } = formatRemainingCountdown(closesAt, nowMs);

  useEffect(() => {
    if (remainingMs <= 0) return;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [closesAt, remainingMs]);

  return (
    <span
      className={`tabular-nums ${className}`}
      title={`Scheduled deactivation: ${formatSubmissionDateTime(closesAt)}`}
    >
      {remainingMs <= 0 ? expiredLabel : `${prefix}${label}`}
    </span>
  );
}

export default DeactivationCountdown;
