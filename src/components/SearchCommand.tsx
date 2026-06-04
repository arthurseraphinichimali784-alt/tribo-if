import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, BookOpen, User as UserIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { subjectLabel } from "@/lib/constants";

interface Result {
  type: "material" | "user";
  id: string;
  title: string;
  subtitle: string;
  link: { to: string; params?: any };
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const q = query.trim();
      const [mats, users] = await Promise.all([
        supabase.from("materials")
          .select("id,title,subject,type")
          .eq("published", true)
          .ilike("title", `%${q}%`)
          .limit(6),
        supabase.from("profiles")
          .select("id,username,full_name,avatar_url")
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(5),
      ]);
      const r: Result[] = [];
      (mats.data ?? []).forEach((m: any) => r.push({
        type: "material", id: m.id, title: m.title, subtitle: subjectLabel(m.subject),
        link: { to: "/material/$id", params: { id: m.id } },
      }));
      (users.data ?? []).forEach((u: any) => r.push({
        type: "user", id: u.id, title: u.full_name ?? u.username, subtitle: `@${u.username}`,
        link: { to: "/u/$username", params: { username: u.username } },
      }));
      setResults(r);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = useCallback((r: Result) => {
    setOpen(false);
    setQuery("");
    nav(r.link as any);
  }, [nav]);

  const materials = results.filter((r) => r.type === "material");
  const users = results.filter((r) => r.type === "user");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition text-sm text-muted-foreground min-w-[200px]"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar materiais, usuários...</span>
        <kbd className="hidden lg:inline-flex text-[10px] px-1.5 py-0.5 rounded bg-background/50 border border-border/50">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden h-9 w-9 rounded-full hover:bg-secondary/60 transition flex items-center justify-center"
        aria-label="Buscar"
      >
        <Search className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-2xl gap-0 overflow-hidden">
          <Command shouldFilter={false} className="rounded-3xl">
            <CommandInput
              placeholder="Buscar materiais, matérias, pessoas..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[420px]">
              {loading && (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              {!loading && query && results.length === 0 && (
                <CommandEmpty>Nenhum resultado para "{query}"</CommandEmpty>
              )}
              {!loading && !query && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  Digite pra buscar materiais ou pessoas
                </div>
              )}
              {materials.length > 0 && (
                <CommandGroup heading="Materiais">
                  {materials.map((r) => (
                    <CommandItem key={r.id} onSelect={() => go(r)} className="gap-3">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {users.length > 0 && (
                <CommandGroup heading="Pessoas">
                  {users.map((r) => (
                    <CommandItem key={r.id} onSelect={() => go(r)} className="gap-3">
                      <UserIcon className="h-4 w-4 text-accent" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
