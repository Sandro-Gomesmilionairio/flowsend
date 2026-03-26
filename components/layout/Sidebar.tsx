"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Tag,
  GitBranch,
  Activity,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/contatos", icon: Users, label: "Contatos" },
  { href: "/tags", icon: Tag, label: "Tags" },
  { href: "/workflows", icon: GitBranch, label: "Workflows" },
  { href: "/execucoes", icon: Activity, label: "Execuções" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#0a0a0f] border-r border-white/5 transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-white/5", collapsed && "justify-center px-0")}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-lg">FlowSend</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
                collapsed && "justify-center px-0 w-10 h-10 mx-auto"
              )}
            >
              <item.icon className={cn("flex-shrink-0", isActive ? "text-indigo-400" : "", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mt-4",
              pathname === "/admin"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5",
              collapsed && "justify-center px-0 w-10 h-10 mx-auto"
            )}
          >
            <Shield className={cn("flex-shrink-0 text-purple-400", collapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!collapsed && "Admin"}
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-2">
        {!collapsed && session?.user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-white truncate">{session.user.name}</p>
            <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 w-full transition-all",
            collapsed && "justify-center px-0 w-10 h-10 mx-auto"
          )}
        >
          <LogOut className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && "Sair"}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-slate-600 hover:text-slate-400 transition-colors mt-1"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
