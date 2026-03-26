"use client";

export interface ContactOnNode {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  status: string;
  scheduledAt?: string | null;
}

interface ContactAvatarsProps {
  contacts: ContactOnNode[];
  color: string;
  max?: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatScheduled(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffH = Math.round(diffMs / 3600000);
  const diffD = Math.round(diffMs / 86400000);

  if (diffMs < 0) return "agora";
  if (diffMin < 60) return `em ${diffMin}min`;
  if (diffH < 24) return `em ${diffH}h`;
  return `em ${diffD}d`;
}

export function ContactAvatars({ contacts, color, max = 4 }: ContactAvatarsProps) {
  if (contacts.length === 0) return null;

  const shown = contacts.slice(0, max);
  const extra = contacts.length - max;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {shown.map((c, i) => (
        <div
          key={c.id}
          className="group relative flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all"
          style={{
            background: color + "20",
            border: `1px solid ${color}40`,
            color: color,
          }}
          title={`${c.name}${c.scheduledAt ? ` • ${formatScheduled(c.scheduledAt)}` : ""}`}
        >
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
            style={{ background: color + "30" }}
          >
            {getInitials(c.name)}
          </span>
          <span className="max-w-[60px] truncate text-[11px]">
            {c.name.split(" ")[0]}
          </span>
          {c.scheduledAt && (
            <span className="text-[9px] opacity-70 hidden group-hover:inline">
              {formatScheduled(c.scheduledAt)}
            </span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="px-1.5 py-0.5 rounded-full text-[11px] font-medium"
          style={{ background: color + "15", color: color + "CC" }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

interface NodeContactSectionProps {
  waiting?: ContactOnNode[];
  running?: ContactOnNode[];
  sent?: ContactOnNode[];
  nodeType: "trigger" | "wait" | "message";
}

export function NodeContactSection({ waiting = [], running = [], sent = [], nodeType }: NodeContactSectionProps) {
  const hasAny = waiting.length > 0 || running.length > 0 || sent.length > 0;
  if (!hasAny) return null;

  return (
    <div className="border-t border-white/5 mt-2 pt-2 space-y-1.5">
      {running.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-400 mb-1">
            ⟳ Processando ({running.length})
          </p>
          <ContactAvatars contacts={running} color="#60A5FA" />
        </div>
      )}
      {waiting.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-yellow-400 mb-1">
            ⏱ Aguardando ({waiting.length})
          </p>
          <ContactAvatars contacts={waiting} color="#FBBF24" />
        </div>
      )}
      {sent.length > 0 && nodeType === "message" && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-green-400 mb-1">
            ✓ Enviado ({sent.length})
          </p>
          <ContactAvatars contacts={sent} color="#34D399" />
        </div>
      )}
    </div>
  );
}
