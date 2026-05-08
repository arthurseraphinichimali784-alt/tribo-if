import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { getAdminMetrics } from "@/lib/admin.functions";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2, Users, BookOpen, Activity, Clock } from "lucide-react";
import { subjectLabel } from "@/lib/constants";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AdminPage,
});

function AdminPage() {
  const fetchMetrics = useServerFn(getAdminMetrics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => fetchMetrics({ data: undefined as any }),
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="min-h-screen"><Header /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  if (error) return <div className="min-h-screen"><Header /><div className="container mx-auto px-4 py-20 text-center">
    <h1 className="text-2xl font-bold mb-3">Acesso restrito</h1>
    <p className="text-muted-foreground">Você precisa ser administrador.</p>
  </div></div>;
  if (!data) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Painel de administração</h1>
          <p className="text-muted-foreground">Métricas em tempo real (atualiza a cada 30s)</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPI icon={Users} label="Usuários" value={data.totals.users} />
          <KPI icon={BookOpen} label="Materiais" value={data.totals.materials} />
          <KPI icon={Activity} label="Ativos 7d" value={data.totals.active7d} />
          <KPI icon={Activity} label="Eventos 30d" value={data.totals.events30d} />
          <KPI icon={Clock} label="Leitura média" value={`${data.totals.avg_read_seconds}s`} />
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Eventos por dia (30d)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Tipos de evento (30d)</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={data.byEventType}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">Matérias mais populares</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={data.subjectPopularity.map((s: any) => ({ ...s, label: subjectLabel(s.subject) }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <TopList title="Mais curtidos" items={data.topByLikes} field="likes" />
          <TopList title="Mais baixados" items={data.topByDownloads} field="downloads" />
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="text-2xl font-bold text-gradient">{value}</div>
    </div>
  );
}

function TopList({ title, items, field }: { title: string; items: any[]; field: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.slice(0, 8).map((m: any, i: number) => (
          <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate"><span className="text-muted-foreground mr-2">{i + 1}.</span>{m.title}</span>
            <span className="font-bold text-primary">{m[field]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
