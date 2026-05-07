import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Brain, Users, Sparkles, TrendingUp, Star } from "lucide-react";
import { SUBJECTS } from "@/lib/constants";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="container mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Construído por estudantes, para estudantes dos IFs</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Sua aprovação no <br />
            <span className="text-gradient">Instituto Federal</span> começa aqui
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Resumos, flashcards, simulados e aulas particulares — tudo num só lugar.
            Estude com material feito por quem já passou.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/marketplace">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow text-base h-12 px-6">
                Explorar materiais <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                Criar conta grátis
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-16">
            {[
              { v: "+1.2k", l: "Materiais" },
              { v: "+350", l: "Tutores" },
              { v: "8", l: "Institutos" },
            ].map((s) => (
              <div key={s.l} className="glass rounded-2xl p-5">
                <div className="text-3xl font-bold text-gradient">{s.v}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Estude por matéria</h2>
            <p className="text-muted-foreground">Encontre conteúdo específico para cada disciplina</p>
          </div>
          <Link to="/marketplace"><Button variant="ghost">Ver tudo <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {SUBJECTS.map((s) => (
            <Link
              key={s.value}
              to="/marketplace"
              search={{ subject: s.value } as any}
              className="glass rounded-2xl p-6 text-center hover:border-primary/50 hover:scale-[1.03] transition-all group"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{s.emoji}</div>
              <div className="font-semibold text-sm">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Tudo que você precisa</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Uma plataforma completa para acelerar sua preparação
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: BookOpen, title: "Marketplace de materiais", desc: "Compre e venda resumos, flashcards, simulados e mapas mentais." },
            { icon: Users, title: "Tutores verificados", desc: "Aulas particulares com estudantes aprovados e professores." },
            { icon: Brain, title: "Comunidade ativa", desc: "Conecte-se, troque dúvidas e estude em grupo." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 hover:border-primary/40 transition">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs preview */}
      <section className="container mx-auto px-4 py-20">
        <div className="glass-strong rounded-3xl p-8 md:p-12 text-center">
          <div className="inline-flex gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">Ativo</span>
            <span className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">Em breve</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <TrendingUp className="inline h-8 w-8 text-primary mr-2" />
            Em expansão
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Começamos com Institutos Federais, mas em breve teremos seções dedicadas para ENEM e Olimpíadas Científicas.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { t: "Institutos Federais", a: true },
              { t: "ENEM", a: false },
              { t: "Olimpíadas Científicas", a: false },
            ].map((x) => (
              <div key={x.t} className={`rounded-xl p-5 ${x.a ? "bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30" : "bg-secondary/30 border border-border"}`}>
                <Star className={`h-5 w-5 mx-auto mb-2 ${x.a ? "text-primary" : "text-muted-foreground"}`} />
                <div className="font-semibold">{x.t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        © 2026 StudyHub IF · Feito com 💚 para estudantes brasileiros
      </footer>
    </div>
  );
}
