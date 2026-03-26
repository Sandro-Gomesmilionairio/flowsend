"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Eye, EyeOff, Save } from "lucide-react";

interface Config {
  chatwootAccountId: string;
  chatwootApiToken: string;
  chatwootInboxId: string;
  maxMessagesPerMinute: number;
  sendWindowStart: string;
  sendWindowEnd: string;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>({
    chatwootAccountId: "",
    chatwootApiToken: "",
    chatwootInboxId: "",
    maxMessagesPerMinute: 2,
    sendWindowStart: "09:00",
    sendWindowEnd: "18:00",
  });
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setConfig({
            chatwootAccountId: data.chatwootAccountId || "",
            chatwootApiToken: data.chatwootApiToken || "",
            chatwootInboxId: data.chatwootInboxId || "",
            maxMessagesPerMinute: data.maxMessagesPerMinute || 2,
            sendWindowStart: data.sendWindowStart || "09:00",
            sendWindowEnd: data.sendWindowEnd || "18:00",
          });
        }
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Configurações salvas");
    } else {
      toast.error("Erro ao salvar configurações");
    }
  };

  const messagesPerHour = config.maxMessagesPerMinute * 60;
  const windowHours = (() => {
    const [sh, sm] = config.sendWindowStart.split(":").map(Number);
    const [eh, em] = config.sendWindowEnd.split(":").map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  })();
  const maxPerDay = messagesPerHour * windowHours;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-slate-400 mt-0.5">Credenciais Chatwoot e throttling</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Chatwoot */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" />
            Integração Chatwoot
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Account ID</label>
              <input
                value={config.chatwootAccountId}
                onChange={(e) => setConfig({ ...config, chatwootAccountId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="123"
              />
              <p className="text-xs text-slate-500 mt-1">Encontrado em: Chatwoot → Settings → General Settings → Account ID</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">API Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={config.chatwootApiToken}
                  onChange={(e) => setConfig({ ...config, chatwootApiToken: e.target.value })}
                  className="w-full px-3.5 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Chatwoot → Profile Settings → Access Token</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Inbox ID (WhatsApp)</label>
              <input
                value={config.chatwootInboxId}
                onChange={(e) => setConfig({ ...config, chatwootInboxId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="5"
              />
              <p className="text-xs text-slate-500 mt-1">ID da inbox WhatsApp no Chatwoot</p>
            </div>
          </div>
        </div>

        {/* Throttling */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <span className="text-base">⚡</span>
            Throttling (Proteção do WhatsApp)
          </h2>
          <p className="text-xs text-slate-500 mb-4">Limita o envio para evitar bloqueios. As mensagens são distribuídas automaticamente.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Máx. mensagens por minuto
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.maxMessagesPerMinute}
                onChange={(e) => setConfig({ ...config, maxMessagesPerMinute: parseInt(e.target.value) })}
                className="w-32 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <p className="text-xs text-slate-500 mt-1">
                {config.maxMessagesPerMinute} msg/min = {60 / config.maxMessagesPerMinute}s entre mensagens
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Início da janela</label>
                <input
                  type="time"
                  value={config.sendWindowStart}
                  onChange={(e) => setConfig({ ...config, sendWindowStart: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Fim da janela</label>
                <input
                  type="time"
                  value={config.sendWindowEnd}
                  onChange={(e) => setConfig({ ...config, sendWindowEnd: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
            <p className="text-xs text-slate-400">
              Com essa configuração:{" "}
              <span className="text-indigo-400 font-medium">
                máx. ~{Math.round(maxPerDay)} mensagens/dia
              </span>{" "}
              enviadas entre {config.sendWindowStart} e {config.sendWindowEnd}.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 shadow-lg shadow-indigo-500/25"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </form>
    </div>
  );
}
