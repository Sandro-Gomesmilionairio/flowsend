"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X, Shield, Users, GitBranch, Activity } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  chatwootAccountId?: string;
  maxMessagesPerMinute: number;
  sendWindowStart: string;
  sendWindowEnd: string;
  _count: { contacts: number; workflows: number; executions: number };
}

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    chatwootAccountId: "",
    chatwootApiToken: "",
    chatwootInboxId: "",
    maxMessagesPerMinute: 2,
    sendWindowStart: "09:00",
    sendWindowEnd: "18:00",
  });

  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, router]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin");
    if (res.ok) {
      const data = await res.json();
      setClients(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Cliente criado com sucesso");
      setShowForm(false);
      setForm({
        name: "",
        email: "",
        password: "",
        chatwootAccountId: "",
        chatwootApiToken: "",
        chatwootInboxId: "",
        maxMessagesPerMinute: 2,
        sendWindowStart: "09:00",
        sendWindowEnd: "18:00",
      });
      fetchClients();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erro ao criar cliente");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      toast.success(isActive ? "Cliente desativado" : "Cliente ativado");
      fetchClients();
    }
  };

  const deleteClient = async (id: string, name: string) => {
    if (!confirm(`Excluir o cliente "${name}" e todos os seus dados? Esta ação é irreversível.`)) return;
    const res = await fetch(`/api/admin/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Cliente excluído");
      fetchClients();
    } else {
      const err = await res.json();
      toast.error(err.error);
    }
  };

  if (session?.user.role !== "ADMIN") {
    return <div className="text-center text-slate-500 py-20">Acesso restrito</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Gerenciar Clientes
          </h1>
          <p className="text-slate-400 mt-0.5">{clients.length} clientes cadastrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-purple-500/25"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-12">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-white text-lg">{client.name}</p>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${client.role === "ADMIN" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {client.role}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-xs ${client.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {client.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{client.email}</p>
                  <div className="flex gap-6 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      {client._count.contacts} contatos
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <GitBranch className="w-3.5 h-3.5" />
                      {client._count.workflows} workflows
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Activity className="w-3.5 h-3.5" />
                      {client._count.executions} execuções
                    </span>
                  </div>
                  {client.chatwootAccountId && (
                    <p className="text-xs text-slate-600 mt-2">Chatwoot Account: {client.chatwootAccountId} · {client.maxMessagesPerMinute} msg/min · {client.sendWindowStart}–{client.sendWindowEnd}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(client.id, client.isActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${client.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}
                  >
                    {client.isActive ? "Desativar" : "Ativar"}
                  </button>
                  {client.role !== "ADMIN" && (
                    <button
                      onClick={() => deleteClient(client.id, client.name)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Novo Cliente</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Dr. Sebastião" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="dr@clinica.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha inicial</label>
                  <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="min. 6 caracteres" />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Chatwoot (opcional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Account ID</label>
                    <input value={form.chatwootAccountId} onChange={(e) => setForm({ ...form, chatwootAccountId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="123" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Inbox ID</label>
                    <input value={form.chatwootInboxId} onChange={(e) => setForm({ ...form, chatwootInboxId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="5" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">API Token</label>
                    <input type="password" value={form.chatwootApiToken} onChange={(e) => setForm({ ...form, chatwootApiToken: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Throttling</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Msg/min</label>
                    <input type="number" min={1} max={10} value={form.maxMessagesPerMinute}
                      onChange={(e) => setForm({ ...form, maxMessagesPerMinute: parseInt(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Início</label>
                    <input type="time" value={form.sendWindowStart} onChange={(e) => setForm({ ...form, sendWindowStart: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Fim</label>
                    <input type="time" value={form.sendWindowEnd} onChange={(e) => setForm({ ...form, sendWindowEnd: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-white/10 text-slate-400 text-sm rounded-xl hover:border-white/20">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-xl hover:opacity-90">
                  Criar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
