import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/tutores")({ component: Tutores });

interface Tutor {
  id: string; username: string; full_name: string | null; bio: string | null;
  avatar_url: string | null; institute: string | null; hourly_rate: number | null;
}

function Tutores() {
  const [list, setList] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("public_profiles" as any).select("id,username,full_name,bio,avatar_url,institute,hourly_rate,is_teacher")
      .eq("is_teacher", true).limit(60).then(({ data }) => {
        setList((data ?? []) as any); setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-2">Tutores & Mentores</h1>
        <p className="text-muted-foreground mb-8">Aulas particulares com quem entende dos IFs</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <h3 className="text-xl font-semibold">Nenhum tutor cadastrado ainda</h3>
            <p className="text-muted-foreground mt-2">Cadastre-se como tutor para aparecer aqui!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((t) => (
              <div key={t.id} className="glass rounded-2xl p-6 hover:border-primary/40 transition">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/40">
                    <AvatarImage src={t.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                      {(t.full_name ?? t.username).slice(0,2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{t.full_name ?? t.username}</div>
                    <div className="text-xs text-muted-foreground">@{t.username}{t.institute ? ` · ${t.institute}` : ""}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[3.75rem]">
                  {t.bio ?? "Tutor disponível para aulas particulares."}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="font-bold">
                    {t.hourly_rate ? <>R$ {Number(t.hourly_rate).toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/h</span></> : <span className="text-primary">A combinar</span>}
                  </div>
                  <Button size="sm" variant="outline"><MessageCircle className="h-4 w-4 mr-1" />Contato</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
