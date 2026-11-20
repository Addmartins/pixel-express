"use client";

import { Activity, Bell, CalendarDays, ChartNoAxesColumn, ClipboardList, Coins, History, LogOut, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { CheckInResult, Mood, Reason, SessionSnapshot, Snapshot } from "@/types/operator";
import { ArcadeFrame } from "./ArcadeFrame";

const moods = [
  { value: "radiant", face: "🤩", label: "Radiante" },
  { value: "motivated", face: "🙂", label: "Motivado" },
  { value: "normal", face: "😐", label: "Normal" },
  { value: "exhausted", face: "😫", label: "Esgotado" },
] as const;

const reasons = [
  { value: "goals", label: "Metas" },
  { value: "team", label: "Clima na equipe" },
  { value: "fatigue", label: "Cansaço físico" },
  { value: "workload", label: "Volume de trabalho" },
  { value: "other", label: "Outro" },
] as const;

const modules = [
  { key: "check-in", label: "Check-in", icon: Activity },
  { key: "ledger", label: "Extrato", icon: History },
  { key: "profile", label: "Perfil", icon: UserRound },
  { key: "calendar", label: "Agenda", icon: CalendarDays },
  { key: "tasks", label: "Tarefas", icon: ClipboardList },
  { key: "notices", label: "Avisos", icon: Bell },
  { key: "team", label: "Equipe", icon: Users },
  { key: "reports", label: "Relatórios", icon: ChartNoAxesColumn },
  { key: "settings", label: "Configurações", icon: Settings },
] as const;

type View = "menu" | (typeof modules)[number]["key"];
type Login = { mode: "demo" } | { mode: "password"; email: string; password: string };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Recife",
});

function recifeDate() {
  const dateParts = dateFormatter.formatToParts(new Date());
  return ["year", "month", "day"].map((unit) => dateParts.find(({ type }) => type === unit)?.value).join("-");
}

class ResponseError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function api<T>(path: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? undefined : await response.json().catch(() => null);
  if (!response.ok) throw new ResponseError(response.status, data?.error ?? "O console não conseguiu concluir a solicitação.");
  if (response.status !== 204 && !data) throw new Error("Resposta inesperada do console.");
  return data as T;
}

export default function OperatorConsole({ demoAvailable }: { demoAvailable: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [view, setView] = useState<View>("menu");
  const [selected, setSelected] = useState(0);
  const [mood, setMood] = useState<Mood | "">("");
  const [reason, setReason] = useState<Reason | "">("");
  const [busy, setBusy] = useState("Carregando console…");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sessionError, setSessionError] = useState(false);
  const loginForm = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const inFlight = useRef(false);

  const resetSession = useCallback((message = "") => {
    loginForm.current?.reset();
    setSnapshot(null);
    setExpiresAt(null);
    setView("menu");
    setSelected(0);
    setMood("");
    setReason("");
    setFeedback("");
    setError(message);
    requestAnimationFrame(() => heading.current?.focus());
  }, []);

  const expireSession = useCallback(() => {
    setBusy("");
    resetSession("Sua sessão terminou. Entre novamente para continuar.");
  }, [resetSession]);

  useEffect(() => {
    if (expiresAt === null) return;
    const remaining = expiresAt * 1_000 - Date.now();
    const checkExpiry = () => {
      if (Date.now() >= expiresAt * 1_000) expireSession();
    };
    const timer = window.setTimeout(expireSession, Math.max(0, remaining));
    window.addEventListener("focus", checkExpiry);
    document.addEventListener("visibilitychange", checkExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [expiresAt, expireSession]);

  async function restore() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("Verificando sessão…");
    setError("");
    setSessionError(false);
    try {
      const session = await api<SessionSnapshot>("/api/operator");
      setSnapshot(session);
      setExpiresAt(session.expiresAt);
    } catch (failure) {
      if (failure instanceof ResponseError && failure.status === 401) {
        setSnapshot(null);
      } else {
        setSessionError(true);
        setError("Não foi possível verificar a sessão.");
      }
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  }

  useEffect(() => {
    void restore();
  }, []);

  const snapshotDate = snapshot?.today;
  useEffect(() => {
    if (!snapshotDate) return;

    async function refreshAtDayChange() {
      if (inFlight.current || recifeDate() === snapshotDate) return;
      inFlight.current = true;
      try {
        const latest = await api<SessionSnapshot>("/api/operator");
        if (expiresAt === null || Date.now() >= expiresAt * 1_000) return;
        setSnapshot(latest);
        setExpiresAt(latest.expiresAt);
        setMood("");
        setReason("");
        setFeedback("");
      } catch (failure) {
        if (failure instanceof ResponseError && failure.status === 401) {
          expireSession();
        }
      } finally {
        inFlight.current = false;
      }
    }

    const timer = window.setInterval(refreshAtDayChange, 30_000);
    window.addEventListener("focus", refreshAtDayChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshAtDayChange);
    };
  }, [snapshotDate, expiresAt, expireSession]);

  function navigate(next: View) {
    setView(next);
    setError("");
    setFeedback("");
    requestAnimationFrame(() => heading.current?.focus());
  }

  function move(offset: number) {
    const next = (selected + offset + modules.length) % modules.length;
    setSelected(next);
    tiles.current[next]?.focus();
  }

  async function action(label: string, operation: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setError("");
    setFeedback("");
    try {
      await operation();
    } catch (failure) {
      if (snapshot && ((expiresAt !== null && Date.now() >= expiresAt * 1_000) ||
          (failure instanceof ResponseError && failure.status === 401))) {
        expireSession();
      } else {
        setError(failure instanceof Error ? failure.message : "Não foi possível concluir a ação.");
      }
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  }

  function login(input: Login) {
    void action("Conectando operador…", async () => {
      const next = await api<SessionSnapshot>("/api/operator", "POST", input);
      setSnapshot(next);
      setExpiresAt(next.expiresAt);
      loginForm.current?.reset();
      setSelected(0);
      navigate(next.checkedIn ? "menu" : "check-in");
    });
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    login({
      mode: "password",
      email: String(values.get("email") ?? ""),
      password: String(values.get("password") ?? ""),
    });
  }

  function signOut() {
    void action("Encerrando sessão…", async () => {
      await api<void>("/api/operator", "DELETE");
      resetSession();
    });
  }

  function submitCheckIn() {
    if (!mood || !reason || snapshot?.checkedIn) return;
    void action("Registrando check-in…", async () => {
      const result = await api<CheckInResult>("/api/operator/check-in", "POST", { mood, reason });
      if (expiresAt === null || Date.now() >= expiresAt * 1_000) return;
      setSnapshot(result.snapshot);
      setMood("");
      setReason("");
      navigate("menu");
      setFeedback(result.awarded ? `Check-in registrado. +${result.awarded} pontos!` : "Seu check-in de hoje já está registrado.");
    });
  }

  const activeModule = modules.find((module) => module.key === view);
  const onA = busy || sessionError ? undefined
    : !snapshot ? () => loginForm.current?.requestSubmit()
    : view === "menu" ? () => navigate(modules[selected].key)
    : view === "check-in" && !snapshot.checkedIn && mood && reason ? submitCheckIn
    : undefined;
  const onB = !busy && snapshot && view !== "menu" ? () => navigate("menu") : undefined;

  return (
    <ArcadeFrame onA={onA} onB={onB} onMove={!busy && snapshot && view === "menu" ? move : undefined}>
      <p role="status" className="screen-message">{busy || feedback}</p>
      {error && <p role="alert" className="screen-message error">{error}</p>}
      {!snapshot && sessionError && <button className="screen-button" type="button" onClick={() => void restore()}>Tentar novamente</button>}
      {!snapshot && !sessionError && (!busy || busy === "Conectando operador…") && (
        <section className="login-screen">
          <div className="login-symbol"><ShieldCheck aria-hidden="true" size={32} /></div>
          <p className="eyebrow">TERMINAL DE ACESSO</p>
          <h1 ref={heading} tabIndex={-1}>Identifique-se,<br />operador.</h1>
          <form ref={loginForm} onSubmit={submitLogin}>
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            <button className="screen-button" disabled={Boolean(busy)} type="submit">Entrar</button>
          </form>
          {demoAvailable && <button className="demo-button" disabled={Boolean(busy)} type="button" onClick={() => login({ mode: "demo" })}>⚡ Entrar como Operador #408 (Demonstração)</button>}
        </section>
      )}
      {snapshot && (
        <>
          <header className="operator-bar">
            <div><p className="eyebrow">NÍVEL {snapshot.operator.level}</p><p className="operator-name">{snapshot.operator.name}</p></div>
            <div className="balance"><Coins size={17} aria-hidden="true" /><span>{snapshot.operator.points.toLocaleString("pt-BR")} PTS</span></div>
          </header>
          {view === "menu" ? (
            <section className="menu-screen">
              <h1 ref={heading} tabIndex={-1}>Menu Iniciar</h1>
              <div className="module-grid" aria-label="Módulos">
                {modules.map(({ key, label, icon: Icon }, index) => (
                  <button className={selected === index ? "selected" : undefined} type="button" key={key}
                    ref={(element) => { tiles.current[index] = element; }}
                    onFocus={() => setSelected(index)} onClick={() => navigate(key)}>
                    <Icon size={22} aria-hidden="true" /><span>{label}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="module-screen">
              <button className="back-button" type="button" onClick={() => navigate("menu")}>← Menu</button>
              <h1 ref={heading} tabIndex={-1}>{activeModule?.label}</h1>
              {view === "check-in" && (
                snapshot.checkedIn ? <p className="success">✓ Check-in de hoje registrado.</p> : (
                  <form onSubmit={(event) => { event.preventDefault(); submitCheckIn(); }}>
                    <fieldset>
                      <legend>Como você está hoje?</legend>
                      <div className="mood-options">
                        {moods.map(({ value, face, label }) => (
                          <label key={value}>
                            <input type="radio" name="mood" value={value} checked={mood === value} onChange={() => setMood(value)} required />
                            <span><i aria-hidden="true">{face}</i>{label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {mood && <>
                      <label htmlFor="reason">Qual é o principal motivo?</label>
                      <select id="reason" name="reason" value={reason} onChange={(event) => setReason(event.target.value as Reason | "")} required>
                        <option value="">Selecione o motivo</option>
                        {reasons.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button className="screen-button" type="submit" disabled={Boolean(busy) || !reason}>Registrar check-in</button>
                    </>}
                  </form>
                )
              )}
              {view === "ledger" && (
                snapshot.transactions.length ? (
                  <ul className="ledger">
                    {snapshot.transactions.map((transaction) => (
                      <li key={transaction.id}>
                        <span>{transaction.description}{transaction.createdAt && <small>{dateFormatter.format(new Date(transaction.createdAt))}</small>}</span>
                        <strong>{transaction.points > 0 ? "+" : ""}{transaction.points} pts</strong>
                      </li>
                    ))}
                  </ul>
                ) : <p>Nenhum lançamento até agora.</p>
              )}
              {view === "profile" && (
                <dl className="operator-details">
                  <dt>Nome</dt><dd>{snapshot.operator.name}</dd>
                  <dt>Identificação</dt><dd>{snapshot.operator.code}</dd>
                  <dt>Nível</dt><dd>{snapshot.operator.level}</dd>
                </dl>
              )}
              {view === "settings" && <button className="demo-button sign-out" type="button" disabled={Boolean(busy)} onClick={signOut}><LogOut size={16} aria-hidden="true" /> Sair</button>}
              {["calendar", "tasks", "notices", "team", "reports"].includes(view) && <p>Em breve.</p>}
            </section>
          )}
        </>
      )}
    </ArcadeFrame>
  );
}
