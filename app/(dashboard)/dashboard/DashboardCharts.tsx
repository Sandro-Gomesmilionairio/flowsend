"use client";

interface DailyPoint {
  day: string;   // "Seg", "Ter" …
  count: number;
}

interface StatusSegment {
  label: string;
  value: number;
  color: string;
  textColor: string;
}

interface TopWorkflow {
  name: string;
  total: number;
  completed: number;
}

interface Props {
  daily: DailyPoint[];
  segments: StatusSegment[];
  topWorkflows: TopWorkflow[];
  successRate: number;
}

/* ── Simple SVG donut ─────────────────────────────── */
function Donut({ segments }: { segments: StatusSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 38;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e1e30" strokeWidth="14" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={`${len} ${circ}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-white">{total.toLocaleString()}</p>
        <p className="text-[10px] text-slate-500">total</p>
      </div>
    </div>
  );
}

/* ── Bar chart ────────────────────────────────────── */
function BarChart({ daily }: { daily: DailyPoint[] }) {
  const max = Math.max(...daily.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {daily.map((d) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">{d.count > 0 ? d.count : ""}</span>
            <div className="w-full rounded-t-md relative overflow-hidden" style={{ height: 80 }}>
              <div
                className="absolute bottom-0 w-full rounded-t-md transition-all duration-700"
                style={{
                  height: `${Math.max(pct, d.count > 0 ? 4 : 0)}%`,
                  background: "linear-gradient(to top, #6366f1, #a855f7)",
                }}
              />
              <div className="absolute inset-0 bg-white/3 rounded-t-md" />
            </div>
            <span className="text-[10px] text-slate-500">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main export ──────────────────────────────────── */
export function DashboardCharts({ daily, segments, topWorkflows, successRate }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Bar chart — executions per day */}
      <div className="lg:col-span-2 glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Execuções por dia</h3>
            <p className="text-xs text-slate-500 mt-0.5">Últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs text-green-400 font-medium">{successRate}% sucesso</span>
          </div>
        </div>
        <BarChart daily={daily} />
      </div>

      {/* Donut — status distribution */}
      <div className="glass-card rounded-2xl p-5 flex flex-col">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Distribuição de status</h3>
          <p className="text-xs text-slate-500 mt-0.5">Todas as execuções</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Donut segments={segments} />
          <div className="w-full space-y-2">
            {segments.filter((s) => s.value > 0).map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-slate-400">{s.label}</span>
                </div>
                <span className="font-semibold" style={{ color: s.color }}>{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top workflows */}
      {topWorkflows.length > 0 && (
        <div className="lg:col-span-3 glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top workflows</h3>
          <div className="space-y-3">
            {topWorkflows.map((wf) => {
              const pct = wf.total > 0 ? Math.round((wf.completed / wf.total) * 100) : 0;
              return (
                <div key={wf.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300 truncate max-w-[60%]">{wf.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{wf.total} execuções</span>
                      <span className="text-xs font-semibold text-green-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to right, #6366f1, #22c55e)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
