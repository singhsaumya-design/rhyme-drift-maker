import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { driftLine } from "@/lib/drift.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

type Phase = "input" | "thinking" | "done";

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

type FeedItem =
  | { kind: "user"; text: string; round: number }
  | { kind: "system"; text: string; round: number };

function Index() {
  const drift = useServerFn(driftLine);
  const [round, setRound] = useState(1); // 1..3
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [phase, round]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [feed, phase]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (wordCount(input) < 1) {
      setError("Type something.");
      return;
    }
    const words = input.trim();
    const currentRound = round;
    setFeed((f) => [...f, { kind: "user", text: words, round: currentRound }]);
    setPhase("thinking");
    const delay = 200 + Math.random() * 300;
    try {
      const [{ line }] = await Promise.all([
        drift({ data: { words, previousLines: lines, round: currentRound } }),
        new Promise((r) => setTimeout(r, delay)),
      ]);
      const nextLines = [...lines, line];
      setLines(nextLines);
      setFeed((f) => [...f, { kind: "system", text: line, round: currentRound }]);
      setInput("");
      if (currentRound >= 3) {
        setPhase("done");
      } else {
        setRound(currentRound + 1);
        setPhase("input");
      }
    } catch (err) {
      console.error(err);
      setError("Something drifted too far. Try again.");
      setPhase("input");
    }
  }


  function tryAgain() {
    setLines([]);
    setFeed([]);
    setRound(1);
    setError(null);
    setInput("");
    setPhase("input");
  }

  function newDrift() {
    setLines([]);
    setFeed([]);
    setRound(1);
    setError(null);
    setInput("");
    setPhase("input");
  }

  const prompt = round === 1 ? "Type something to start writing a poem" : "keep going";

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

      <section className="flex-1 flex flex-col items-center px-6 overflow-hidden">
        <div className="w-full max-w-xl flex-1 flex flex-col min-h-0">
          {/* Persistent scrollable feed */}
          <div className="flex-1 overflow-y-auto py-8 pr-2">
            {feed.length === 0 && phase !== "done" && (
              <p className="text-neutral-300 text-sm tracking-wider uppercase">
                a blank page —
              </p>
            )}
            <ul className="space-y-5">
              {feed.map((item, i) => (
                <li
                  key={i}
                  className={
                    item.kind === "user"
                      ? "text-lg md:text-xl font-light text-neutral-900 animate-[fadeUp_500ms_ease-out]"
                      : "pl-8 md:pl-12 text-xl md:text-2xl italic font-serif text-neutral-600 leading-snug animate-[fadeUp_600ms_ease-out]"
                  }
                >
                  {item.kind === "user" ? (
                    <>
                      <span className="mr-3 text-[10px] tracking-[0.25em] uppercase text-neutral-400 align-middle">
                        you
                      </span>
                      {item.text}
                    </>
                  ) : (
                    <>
                      <span className="mr-3 text-[10px] tracking-[0.25em] uppercase text-neutral-400 not-italic align-middle">
                        drift
                      </span>
                      {item.text}
                    </>
                  )}
                </li>
              ))}
              {phase === "thinking" && (
                <li className="pl-8 md:pl-12 text-sm italic text-neutral-400">
                  drifting…
                </li>
              )}
            </ul>
            <div ref={feedEndRef} />
          </div>

          {phase !== "done" && (
            <div className="border-t border-neutral-200 py-5">
              <form onSubmit={submit} className="space-y-3">
                <label
                  htmlFor="words"
                  className="block text-xs uppercase tracking-[0.25em] text-neutral-500"
                >
                  {prompt}
                </label>
                <div className="flex items-end gap-4">
                  <input
                    id="words"
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={phase === "thinking"}
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 bg-transparent border-0 border-b border-neutral-300 focus:border-neutral-900 outline-none py-2 text-xl md:text-2xl font-light tracking-tight placeholder:text-neutral-300 transition-colors disabled:opacity-40"
                    placeholder="Type here"
                  />
                  <button
                    type="submit"
                    disabled={phase === "thinking"}
                    className="text-xs uppercase tracking-[0.25em] text-neutral-700 hover:text-neutral-900 disabled:opacity-30 transition pb-2"
                  >
                    {phase === "thinking" ? "…" : "Continue"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs tracking-wider ${
                      error ? "text-red-500" : "text-neutral-400"
                    }`}
                  >
                    {error ?? (phase === "thinking" ? "drifting…" : "press enter")}
                  </span>
                </div>
              </form>
            </div>
          )}

          {phase === "done" && (
            <div className="border-t border-neutral-200 py-6 flex gap-6">
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
