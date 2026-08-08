import { createFileRoute, redirect } from "@tanstack/react-router";

import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { getAdminMetrics, listReports, updateReportStatus } from "@/lib/admin.functions";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2, Users, BookOpen, Activity, Clock, Flag, Check, X, BadgeCheck } from "lucide-react";
import { AdminVerificationsPanel } from "@/components/admin/AdminVerificationsPanel";

import { subjectLabel } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    // Exige role admin antes de qualquer render da rota
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (error || !isAdmin) throw redirect({ to: "/" });
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

        <Tabs defaultValue="metrics">
          <TabsList>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="reports">
              <Flag className="h-3.5 w-3.5 mr-1.5" /> Denúncias
            </TabsTrigger>
            <TabsTrigger value="verifications">
              <BadgeCheck className="h-3.5 w-3.5 mr-1.5" /> Verificações
            </TabsTrigger>
          </TabsList>


          <TabsContent value="metrics" className="space-y-6 mt-4">
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
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <ReportsPanel />
          </TabsContent>

          <TabsContent value="verifications" className="mt-4">
            <AdminVerificationsPanel />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

function ReportsPanel() {
  const qc = useQueryClient();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const fetchReports = useServerFn(listReports);
  const updateStatusFn = useServerFn(updateReportStatus);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchReports({ data: { filter } });
      setReports(data ?? []);
    } catch {
      toast.error("Erro ao carregar denúncias");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: "resolved" | "rejected") => {
    try {
      await updateStatusFn({ data: { id, status } });
      toast.success("Denúncia atualizada"); load(); qc.invalidateQueries();
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pendentes</Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todas</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : reports.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma denúncia {filter === "pending" ? "pendente" : "registrada"}.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline">{r.target_type}</Badge>
                    <Badge variant={r.status === "pending" ? "default" : r.status === "resolved" ? "secondary" : "outline"}>
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <div className="font-medium">{r.reason}</div>
                  {r.details && <div className="text-sm text-muted-foreground mt-1">{r.details}</div>}
                  <div className="text-xs text-muted-foreground mt-2">
                    Alvo: <code className="bg-secondary/50 px-1.5 py-0.5 rounded">{r.target_id}</code>
                    {r.target_type === "material" && (
                      <a href={`/material/${r.target_id}`} target="_blank" className="ml-2 text-primary hover:underline">
                        Ver material →
                      </a>
                    )}
                  </div>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                      <X className="h-3.5 w-3.5 mr-1" /> Rejeitar
                    </Button>
                    <Button size="sm" onClick={() => updateStatus(r.id, "resolved")} className="bg-success text-primary-foreground">
                      <Check className="h-3.5 w-3.5 mr-1" /> Resolver
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
