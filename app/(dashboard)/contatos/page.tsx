"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Plus, Search, Tag, Trash2, Eye, X, Upload, CheckSquare } from "lucide-react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  customFields: Record<string, unknown>;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
  createdAt: string;
}

interface TagType {
  id: string;
  name: string;
  color: string;
}

// ── Phone normalisation ──────────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return `+${digits}`;
}

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): { name: string; phone: string; email: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(/[,;|\t]/).map((h) =>
    h.trim().toLowerCase().replace(/['"]/g, "")
  );

  const nameIdx = header.findIndex((h) => ["nome", "name", "paciente", "cliente"].includes(h));
  const phoneIdx = header.findIndex((h) =>
    ["telefone", "phone", "celular", "whatsapp", "fone", "tel"].includes(h)
  );
  const emailIdx = header.findIndex((h) => ["email", "e-mail", "mail"].includes(h));

  if (nameIdx === -1 || phoneIdx === -1) return [];

  const sep = lines[0].includes(";") ? ";" : lines[0].includes("|") ? "|" : lines[0].includes("\t") ? "\t" : ",";

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      return {
        name: cols[nameIdx] || "",
        phone: normalizePhone(cols[phoneIdx] || ""),
        email: emailIdx >= 0 ? cols[emailIdx] || "" : "",
      };
    })
    .filter((r) => r.name && r.phone);
}

// ── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ name: string; phone: string; email: string }[]>([]);
  const [all, setAll] = useState<{ name: string; phone: string; email: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setAll(rows);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(file, "utf-8");
  }

  async function doImport() {
    if (all.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: all }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.created} contatos importados, ${data.skipped} ignorados`);
        onImported();
        onClose();
      } else {
        toast.error(data.error || "Erro ao importar");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white">Importar Contatos (CSV)</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drag & Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 hover:border-white/20"
            }`}
          >
            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              Arraste um arquivo <span className="text-white font-medium">.csv</span> ou clique para selecionar
            </p>
            <p className="text-xs text-slate-600 mt-1">Separado por vírgula, ponto-e-vírgula ou tab</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
          </div>

          {/* Format hint */}
          <div className="bg-white/3 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono">
            <span className="text-slate-500">Colunas esperadas: </span>
            <span className="text-indigo-400">nome</span>,{" "}
            <span className="text-indigo-400">telefone</span>
            <span className="text-slate-600"> (email — opcional)</span>
            <br />
            <span className="text-slate-500">Telefone aceito: </span>
            <span className="text-slate-300">11999998888 · (11) 9 9999-8888 · +5511999998888</span>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                <span className="text-white font-semibold">{all.length}</span> contatos detectados — pré-visualização:
              </p>
              <div className="rounded-xl overflow-hidden border border-white/5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">Nome</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">Telefone</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-white">{row.name}</td>
                        <td className="px-3 py-2 text-slate-400 font-mono">{row.phone}</td>
                        <td className="px-3 py-2 text-slate-500">{row.email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {all.length > 5 && (
                  <p className="px-3 py-2 text-xs text-slate-600 bg-white/2">
                    + {all.length - 5} contatos adicionais…
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-white/10 text-slate-400 text-sm rounded-xl hover:border-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={doImport}
              disabled={all.length === 0 || loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? "Importando…" : `Importar ${all.length > 0 ? all.length : ""} contatos`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Tag Modal ────────────────────────────────────────────────────────────
function BulkTagModal({
  count,
  tags,
  onApply,
  onClose,
}: {
  count: number;
  tags: TagType[];
  onApply: (tagId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Aplicar Tag em Massa</h3>
            <p className="text-xs text-slate-500 mt-0.5">{count} contato(s) selecionado(s)</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1 mb-4">
          <p className="text-xs text-slate-400 px-1 mb-2">
            Os workflows serão disparados respeitando o limite de mensagens por minuto configurado.
          </p>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onApply(tag.id)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 rounded-xl transition-colors"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-slate-500 py-4 text-center">Nenhuma tag criada</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTagModal, setShowTagModal] = useState<string | null>(null);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", customFields: "{}" });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/contacts?search=${encodeURIComponent(search)}&limit=200`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }, [search]);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data);
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchTags();
  }, [fetchContacts, fetchTags]);

  const createContact = async (e: React.FormEvent) => {
    e.preventDefault();
    let customFields = {};
    try { customFields = JSON.parse(form.customFields); } catch {}

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, customFields }),
    });

    if (res.ok) {
      toast.success("Contato criado");
      setShowForm(false);
      setForm({ name: "", phone: "", email: "", customFields: "{}" });
      fetchContacts();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erro ao criar contato");
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Excluir contato?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Contato excluído");
      fetchContacts();
    }
  };

  const applyTag = async (contactId: string, tagId: string) => {
    const res = await fetch(`/api/contacts/${contactId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Tag aplicada. ${data.workflowsTriggered} workflow(s) disparado(s)`);
      setShowTagModal(null);
      fetchContacts();
    } else {
      toast.error(data.error || "Erro ao aplicar tag");
    }
  };

  // Bulk tag with throttle-aware sequential dispatch
  const applyTagToSelected = async (tagId: string) => {
    setShowBulkTag(false);
    const ids = Array.from(selectedContacts);
    setBulkProgress({ done: 0, total: ids.length });

    let success = 0;
    let skipped = 0;

    for (let i = 0; i < ids.length; i++) {
      const res = await fetch(`/api/contacts/${ids[i]}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      const data = await res.json();
      if (res.ok) {
        success++;
      } else if (data.error === "Tag already applied") {
        skipped++;
      }
      setBulkProgress({ done: i + 1, total: ids.length });
    }

    setBulkProgress(null);
    setSelectedContacts(new Set());
    toast.success(`Tag aplicada a ${success} contato(s)${skipped > 0 ? `, ${skipped} já tinham a tag` : ""}`);
    fetchContacts();
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selectedContacts);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedContacts(s);
  };

  const allSelected = contacts.length > 0 && selectedContacts.size === contacts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contatos</h1>
          <p className="text-slate-400 mt-0.5">{contacts.length} contatos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 text-slate-300 text-sm font-medium rounded-xl hover:border-white/20 hover:text-white transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Bulk progress bar */}
      {bulkProgress && (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {bulkProgress.done}/{bulkProgress.total} aplicados
          </span>
        </div>
      )}

      {/* Search & Bulk */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {selectedContacts.size > 0 && (
          <button
            onClick={() => setShowBulkTag(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-sm font-medium rounded-xl hover:bg-indigo-600/30 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            {selectedContacts.size} selecionados — Aplicar Tag
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando…</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-slate-500">Nenhum contato. Crie o primeiro ou importe um CSV.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedContacts(new Set(contacts.map((c) => c.id)));
                      else setSelectedContacts(new Set());
                    }}
                    className="rounded accent-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400 hidden lg:table-cell">Tags</th>
                <th className="px-4 py-3 text-right font-medium text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className={`hover:bg-white/2 transition-colors group ${selectedContacts.has(contact.id) ? "bg-indigo-500/5" : ""}`}
                >
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                      className="rounded accent-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white">{contact.name}</td>
                  <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{contact.phone}</td>
                  <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{contact.email || "—"}</td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: tag.color + "20", color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowTagModal(contact.id)}
                        className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Aplicar tag"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/contatos/${contact.id}`}
                        className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tag Apply Modal (single) */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Aplicar Tag</h3>
              <button onClick={() => setShowTagModal(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => applyTag(showTagModal, tag.id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-slate-500 py-4 text-center">Nenhuma tag criada</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {showBulkTag && (
        <BulkTagModal
          count={selectedContacts.size}
          tags={tags}
          onApply={applyTagToSelected}
          onClose={() => setShowBulkTag(false)}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={fetchContacts}
        />
      )}

      {/* New Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Novo Contato</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone * (com código do país)</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="+5511999998888"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Campos Customizados (JSON)
                </label>
                <textarea
                  value={form.customFields}
                  onChange={(e) => setForm({ ...form, customFields: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  placeholder='{"data_consulta": "2025-06-15"}'
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-white/10 text-slate-400 text-sm rounded-xl hover:border-white/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
