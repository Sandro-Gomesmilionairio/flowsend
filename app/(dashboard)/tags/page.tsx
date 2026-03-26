"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X, Tag } from "lucide-react";

interface TagData {
  id: string;
  name: string;
  color: string;
  _count: { contacts: number; workflows: number };
}

const PRESET_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#EAB308", "#22C55E", "#06B6D4",
  "#3B82F6", "#64748B",
];

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#6366F1" });

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const createTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Tag criada");
      setShowForm(false);
      setForm({ name: "", color: "#6366F1" });
      fetchTags();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erro ao criar tag");
    }
  };

  const deleteTag = async (id: string) => {
    if (!confirm("Excluir esta tag? Isso removerá a tag de todos os contatos.")) return;
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tag excluída");
      fetchTags();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tags</h1>
          <p className="text-slate-400 mt-0.5">{tags.length} tags criadas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Nova Tag
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-12">Carregando...</div>
      ) : tags.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          Nenhuma tag criada. As tags disparam workflows quando aplicadas a contatos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <div key={tag.id} className="glass-card rounded-2xl p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: tag.color + "20", border: `1px solid ${tag.color}40` }}
                  >
                    <Tag className="w-5 h-5" style={{ color: tag.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{tag.name}</p>
                    <div
                      className="text-xs px-1.5 py-0.5 rounded-md font-mono mt-0.5 inline-block"
                      style={{ background: tag.color + "20", color: tag.color }}
                    >
                      {tag.color}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-4 text-sm text-slate-500">
                <span>{tag._count.contacts} contato{tag._count.contacts !== 1 ? "s" : ""}</span>
                <span>{tag._count.workflows} workflow{tag._count.workflows !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Nova Tag</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="retorno-7-dias"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Cor</label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                      style={{
                        background: color,
                        outline: form.color === color ? `2px solid ${color}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/3 rounded-xl">
                <div className="w-6 h-6 rounded-md" style={{ background: form.color }} />
                <span className="text-sm" style={{ color: form.color }}>{form.name || "preview"}</span>
              </div>
              <div className="flex gap-3 pt-1">
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
