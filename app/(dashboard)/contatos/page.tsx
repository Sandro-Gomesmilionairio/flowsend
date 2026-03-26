"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Search, Tag, Trash2, Eye, X } from "lucide-react";
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

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTagModal, setShowTagModal] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", phone: "", email: "", customFields: "{}" });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/contacts?search=${encodeURIComponent(search)}&limit=100`);
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

  const applyTagToSelected = async (tagId: string) => {
    let success = 0;
    for (const contactId of Array.from(selectedContacts)) {
      const res = await fetch(`/api/contacts/${contactId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (res.ok) success++;
    }
    toast.success(`Tag aplicada a ${success} contato(s)`);
    setSelectedContacts(new Set());
    fetchContacts();
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selectedContacts);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedContacts(s);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contatos</h1>
          <p className="text-slate-400 mt-0.5">{contacts.length} contatos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Novo Contato
        </button>
      </div>

      {/* Search & Bulk */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        {selectedContacts.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{selectedContacts.size} selecionados</span>
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-sm rounded-xl hover:bg-indigo-600/30 transition-colors">
                <Tag className="w-4 h-4" />
                Aplicar Tag
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-10 hidden group-hover:block">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => applyTagToSelected(tag.id)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhum contato encontrado. Crie o primeiro.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedContacts.size === contacts.length && contacts.length > 0}
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
                <tr key={contact.id} className="hover:bg-white/2 transition-colors group">
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

      {/* Tag Apply Modal */}
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
                  placeholder="Dr. João Silva"
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

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
