import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, BookOpen, Users, Upload, Trophy, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao StudyHub IF!",
    body: "Sua plataforma pra compartilhar resumos, flashcards e conquistar XP estudando com a galera dos Institutos Federais.",
    cta: "Começar",
    skipTo: null,
  },
  {
    icon: BookOpen,
    title: "Explore o marketplace",
    body: "Milhares de materiais grátis e premium organizados por matéria. Filtre por disciplina, dificuldade ou tipo.",
    cta: "Ver marketplace",
    skipTo: "/marketplace",
  },
  {
    icon: Upload,
    title: "Publique seu material",
    body: "Compartilhe seus resumos com a comunidade. Cada material ganha XP, likes e te aproxima do próximo nível.",
    cta: "Publicar agora",
    skipTo: "/upload",
  },
  {
    icon: Trophy,
    title: "Suba de nível 🚀",
    body: "Mantenha sua streak diária, ganhe badges, suba no leaderboard e vire referência na sua matéria favorita.",
    cta: "Bora!",
    skipTo: null,
  },
];

export function OnboardingModal() {
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!ready || !user) return;
    const key = `studyhub:onboarded:${user.id}`;
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(key)) {
      setOpen(true);
    }
  }, [user, ready]);

  const close = () => {
    if (user) localStorage.setItem(`studyhub:onboarded:${user.id}`, "1");
    setOpen(false);
  };

  const next = () => {
    const current = STEPS[step];
    if (step === STEPS.length - 1) {
      close();
      return;
    }
    if (current.skipTo) {
      close();
      nav({ to: current.skipTo as any });
      return;
    }
    setStep((s) => s + 1);
  };

  const skip = () => close();

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="glass-strong sm:max-w-md border-0 rounded-3xl p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent pointer-events-none" />
          <div className="relative px-7 pt-10 pb-7 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center mb-5 btn-glow animate-pop">
              <Icon className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">{s.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>

            <div className="flex justify-center gap-1.5 mt-6 mb-6">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2 justify-center">
              {step < STEPS.length - 1 && (
                <Button variant="ghost" onClick={skip} className="text-muted-foreground">
                  Pular
                </Button>
              )}
              <Button onClick={next} className="bg-gradient-to-r from-primary to-accent text-primary-foreground btn-glow">
                {s.cta}
                {step === STEPS.length - 1 ? <Check className="h-4 w-4 ml-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
