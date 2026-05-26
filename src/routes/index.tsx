import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { driftLine, finalizeDrift } from "@/lib/drift.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

type Phase = "input" | "thinking" | "done";

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function Index() {
  const drift = useServerFn(driftLine);
  const finalize = useServerFn(finalizeDrift);
  const [round, setRound] = useState(1); // 1..3
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [finalLines, setFinalLines] = useState<string[] | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [phase, round]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (wordCount(input) !== 3) {
      setError("Enter exactly 3 words.");
      return;
    }
    const words = input.trim();
    setPhase("thinking");
    const delay = 200 + Math.random() * 300;
    try {
      const [{ line }] = await Promise.all([
        drift({ data: { words, previousLines: lines, round } }),
        new Promise((r) => setTimeout(r, delay)),
      ]);
      const nextLines = [...lines, line];
      setLines(nextLines);
      setInput("");
      if (round >= 3) {
        setPhase("done");
      } else {
        setRound(round + 1);
        setPhase("input");
      }
    } catch (err) {
      console.error(err);
      setError("Something drifted too far. Try again.");
      setPhase("input");
    }
  }

  // Finalize: ask AI to lightly edit/reorder into a coherent 3-line poem
  useEffect(() => {
    if (phase !== "done" || lines.length !== 3 || finalLines || finalizing) return;
    let cancelled = false;
    setFinalizing(true);
    finalize({ data: { lines: lines as [string, string, string] & string[] } })
      .then((res) => {
        if (cancelled) return;
        const out = res.lines && res.lines.length === 3 ? res.lines : lines;
        setFinalLines(out);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setFinalLines(lines);
      })
      .finally(() => {
        if (!cancelled) setFinalizing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, lines, finalLines, finalizing, finalize]);

  // Reveal lines one by one on done
  useEffect(() => {
    if (phase !== "done" || !finalLines) {
      setRevealed(0);
      return;
    }
    setRevealed(0);
    const timers = finalLines.map((_, i) =>
      setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 250 + i * 600),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, finalLines]);

  function tryAgain() {
    // Re-drift from the same starting words: clear lines, restart at round 1 with previous first input prefilled
    setLines([]);
    setFinalLines(null);
    setRound(1);
    setError(null);
    setInput("");
    setPhase("input");
  }

  function newDrift() {
    setLines([]);
    setFinalLines(null);
    setRound(1);
    setError(null);
    setInput("");
    setPhase("input");
  }

  const prompt = round === 1 ? "Enter 3 words" : "Continue in 3 words";
  const lastLine = lines[lines.length - 1];

  return (
    <main className="min-h-screen bg-[#fcfbf8] text-neutral-900 flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <h1 className="text-sm tracking-[0.3em] uppercase text-neutral-500">
          Rhyme Drift
        </h1>
        <span className="text-xs tracking-widest text-neutral-400 tabular-nums">
          {phase === "done" ? "03 / 03" : `0${round} / 03`}
        </span>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xl">
          {phase !== "done" && (
            <div className="space-y-10">
              {/* Echo of latest system line */}
              <div className="min-h-[3.5rem] flex items-end">
                {lastLine && (
                  <p
                    key={lastLine}
                    className="text-2xl md:text-3xl font-serif italic text-neutral-700 leading-snug animate-[fadeUp_600ms_ease-out]"
                  >
                    {lastLine}
                  </p>
                )}
              </div>

              <form onSubmit={submit} className="space-y-4">
                <label
                  htmlFor="words"
                  className="block text-xs uppercase tracking-[0.25em] text-neutral-500"
                >
                  {prompt}
                </label>
                <input
                  id="words"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={phase === "thinking"}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent border-0 border-b border-neutral-300 focus:border-neutral-900 outline-none py-3 text-2xl md:text-3xl font-light tracking-tight placeholder:text-neutral-300 transition-colors disabled:opacity-40"
                  placeholder="three   small   words"
                />
                <div className="flex items-center justify-between pt-2">
                  <span
                    className={`text-xs tracking-wider ${
                      error ? "text-red-500" : "text-neutral-400"
                    }`}
                  >
                    {error ?? (phase === "thinking" ? "drifting…" : "press enter")}
                  </span>
                  <button
                    type="submit"
                    disabled={phase === "thinking"}
                    className="text-xs uppercase tracking-[0.25em] text-neutral-700 hover:text-neutral-900 disabled:opacity-30 transition"
                  >
                    {phase === "thinking" ? "…" : "→"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-12">
              {!finalLines && (
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                  composing…
                </p>
              )}
              <ol className="space-y-4 font-serif">
                {(finalLines ?? []).map((l, i) => (
                  <li
                    key={i}
                    className={`text-2xl md:text-4xl italic leading-tight transition-all duration-700 ${
                      i < revealed
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2"
                    }`}
                  >
                    {l}
                  </li>
                ))}
              </ol>

              <div
                className={`flex gap-6 transition-opacity duration-700 ${
                  finalLines && revealed >= finalLines.length ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  onClick={tryAgain}
                  className="text-xs uppercase tracking-[0.25em] text-neutral-700 hover:text-neutral-900 underline-offset-4 hover:underline"
                >
                  Try again
                </button>
                <button
                  onClick={newDrift}
                  className="text-xs uppercase tracking-[0.25em] text-neutral-700 hover:text-neutral-900 underline-offset-4 hover:underline"
                >
                  New drift
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="px-6 py-5 text-[10px] tracking-[0.3em] uppercase text-neutral-400">
        a constrained co-writing loop
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
