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
    <main className="min-h-screen bg-[#fcfbf8] text-black flex flex-col font-mono">
      {/* Grid header */}
      <header className="grid grid-cols-12 border-b-[3px] border-black">
        <div className="col-span-7 md:col-span-8 border-r-[3px] border-black px-4 py-3">
          <h1 className="text-3xl md:text-5xl font-black uppercase leading-none tracking-tighter">
            Rhyme<span className="inline-block bg-black text-[#fcfbf8] px-2 ml-1">Drift</span>
          </h1>
        </div>
        <div className="col-span-3 md:col-span-2 border-r-[3px] border-black px-3 py-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-widest">round</span>
          <span className="text-3xl md:text-4xl font-black tabular-nums leading-none">
            {phase === "done" ? "03" : `0${round}`}
          </span>
        </div>
        <div className="col-span-2 px-3 py-3 flex flex-col justify-between bg-black text-[#fcfbf8]">
          <span className="text-[10px] uppercase tracking-widest">of</span>
          <span className="text-3xl md:text-4xl font-black tabular-nums leading-none">03</span>
        </div>
      </header>

      {/* Body grid */}
      <section className="flex-1 grid grid-cols-12 min-h-0">
        {/* Side rail */}
        <aside className="hidden md:flex col-span-1 border-r-[3px] border-black flex-col items-center justify-between py-4">
          <span className="text-[10px] uppercase tracking-[0.3em] [writing-mode:vertical-rl] rotate-180">
            echo / system
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] [writing-mode:vertical-rl] rotate-180">
            input / you
          </span>
        </aside>

        {/* Feed */}
        <div className="col-span-12 md:col-span-11 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            {feed.length === 0 && phase !== "done" && (
              <div className="p-6 md:p-10">
                <p className="text-[10px] uppercase tracking-[0.3em] mb-3">empty // waiting</p>
                <p className="text-4xl md:text-6xl font-black uppercase leading-[0.95] tracking-tighter">
                  type<br/>something.
                </p>
              </div>
            )}
            <ul>
              {feed.map((item, i) => (
                <li
                  key={i}
                  className={
                    "grid grid-cols-12 border-b-[3px] border-black animate-[fadeUp_400ms_ease-out]"
                  }
                >
                  <div
                    className={
                      "col-span-2 md:col-span-2 border-r-[3px] border-black px-2 py-3 flex items-start justify-center " +
                      (item.kind === "user" ? "bg-[#fcfbf8]" : "bg-black text-[#fcfbf8]")
                    }
                  >
                    <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">
                      {item.kind === "user" ? "you" : "echo"}
                    </span>
                  </div>
                  <div className="col-span-10 px-4 py-4 md:py-5">
                    {item.kind === "user" ? (
                      <p className="text-xl md:text-2xl font-mono uppercase break-words">
                        {item.text}
                      </p>
                    ) : (
                      <p className="text-2xl md:text-4xl font-serif italic leading-tight break-words">
                        “{item.text}”
                      </p>
                    )}
                  </div>
                </li>
              ))}
              {phase === "thinking" && (
                <li className="grid grid-cols-12 border-b-[3px] border-black">
                  <div className="col-span-2 border-r-[3px] border-black px-2 py-3 flex items-start justify-center bg-black text-[#fcfbf8]">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse">
                      echo
                    </span>
                  </div>
                  <div className="col-span-10 px-4 py-5">
                    <p className="text-xl md:text-2xl font-mono uppercase tracking-tight">
                      ▮ ▮ ▮ <span className="opacity-50">composing echo</span>
                    </p>
                  </div>
                </li>
              )}
            </ul>
            <div ref={feedEndRef} />
          </div>

          {phase !== "done" && (
            <form
              onSubmit={submit}
              className="grid grid-cols-12 border-t-[3px] border-black"
            >
              <label
                htmlFor="words"
                className="col-span-12 px-4 pt-3 text-[10px] uppercase tracking-[0.3em] font-bold border-b border-dashed border-black/40"
              >
                {error ? <span className="text-red-600">{error}</span> : `// ${prompt}`}
              </label>
              <input
                id="words"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={phase === "thinking"}
                autoComplete="off"
                spellCheck={false}
                className="col-span-9 md:col-span-10 bg-[#fcfbf8] border-r-[3px] border-black outline-none px-4 py-5 text-2xl md:text-3xl font-black uppercase tracking-tight placeholder:text-black/20 disabled:opacity-40"
                placeholder="TYPE HERE"
              />
              <button
                type="submit"
                disabled={phase === "thinking"}
                className="col-span-3 md:col-span-2 bg-black text-[#fcfbf8] text-sm md:text-base uppercase tracking-widest font-black hover:bg-[#fcfbf8] hover:text-black transition-colors disabled:opacity-30 px-2 py-5"
              >
                {phase === "thinking" ? "…" : "GO →"}
              </button>
            </form>
          )}

          {phase === "done" && (
            <div className="grid grid-cols-12 border-t-[3px] border-black">
              <div className="col-span-12 px-4 py-4 bg-black text-[#fcfbf8]">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold">
                  // drift complete
                </p>
              </div>
              <button
                onClick={tryAgain}
                className="col-span-6 border-r-[3px] border-black bg-[#fcfbf8] text-black uppercase tracking-widest font-black text-lg md:text-2xl py-6 hover:bg-black hover:text-[#fcfbf8] transition-colors"
              >
                Try again ↺
              </button>
              <button
                onClick={newDrift}
                className="col-span-6 bg-black text-[#fcfbf8] uppercase tracking-widest font-black text-lg md:text-2xl py-6 hover:bg-[#fcfbf8] hover:text-black transition-colors"
              >
                New drift ✦
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="grid grid-cols-12 border-t-[3px] border-black text-[10px] uppercase tracking-[0.25em] font-bold">
        <div className="col-span-4 px-4 py-2 border-r-[3px] border-black">echo system v.02</div>
        <div className="col-span-4 px-4 py-2 border-r-[3px] border-black text-center">
          meaning &gt; rhyme
        </div>
        <div className="col-span-4 px-4 py-2 text-right">press enter ⏎</div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
