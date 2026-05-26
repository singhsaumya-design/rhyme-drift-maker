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
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "input") inputRef.current?.focus();
  }, [phase, round]);

  useEffect(() => {
    const el = feedContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
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
    <main
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        fontFamily: '"Inter", system-ui, sans-serif',
        color: "#2a2342",
        background:
          "linear-gradient(180deg, #cfe6f3 0%, #d8e5f0 40%, #f5cfc5 70%, #e8b3c4 90%, #c9a8d4 100%)",
      }}
    >
      {/* Sun */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[8%] w-[120vw] max-w-[1100px] aspect-square rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, #ffb27a 0%, #f48a5e 45%, #ec7a6e 70%, rgba(236,122,110,0) 78%)",
          filter: "blur(1px)",
        }}
      />
      {/* Soft mist at bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(245,207,197,0.5) 40%, rgba(201,168,212,0.7) 100%)",
          filter: "blur(20px)",
        }}
      />
      {/* Floating birds */}
      <Bird className="top-[12%] left-[4%] w-14 opacity-80" delay="0s" duration="5.5s" color="#c5547a" />
      <Bird className="top-[20%] right-[6%] w-16 opacity-75" delay="1.5s" duration="7s" color="#f48a5e" />
      <Bird className="top-[52%] left-[8%] w-12 opacity-80" delay="0.8s" duration="5s" color="#7a5fa0" />
      <Bird className="top-[44%] right-[10%] w-20 opacity-70" delay="2.2s" duration="7.5s" color="#d66d8a" />
      <Bird className="top-[68%] left-[36%] w-14 opacity-60" delay="1s" duration="6s" color="#ec7a6e" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 text-xs tracking-wide lowercase text-[#3b2f55]">
        <span>rhyme drift</span>
        <span className="tabular-nums">
          {phase === "done" ? "03 / 03" : `0${round} / 03`}
        </span>
      </header>

      {/* Main content */}
      <section className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-6 pb-6 min-h-0 pt-[42vh]">
        <div className="w-full max-w-xl flex-1 flex flex-col min-h-0 items-center">
          {/* Feed */}
          <div className="w-full flex-1 overflow-y-auto py-6 scroll-smooth">
            {feed.length === 0 && phase !== "done" && (
              <p
                className="text-center text-[#3b2f55]/70 italic text-lg md:text-xl"
                style={{ fontFamily: '"Instrument Serif", serif' }}
              >
                a soft beginning &mdash; type something
              </p>
            )}
            <ul className="space-y-6 text-center">
              {feed.map((item, i) => (
                <li
                  key={i}
                  className="animate-[fadeUp_600ms_ease-out]"
                >
                  {item.kind === "user" ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] lowercase tracking-[0.3em] text-[#6b5b8a] mb-1">
                        you whispered
                      </span>
                      <p className="text-xl md:text-2xl text-[#2a2342] lowercase italic" style={{ fontFamily: '"Instrument Serif", serif' }}>
                        {item.text}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[10px] lowercase tracking-[0.3em] text-[#c5648a] mb-1">
                        the sky replied
                      </span>
                      <p
                        className="text-2xl md:text-4xl leading-[1.15] text-[#4a2b5c]"
                        style={{ fontFamily: '"Instrument Serif", serif', fontStyle: "italic" }}
                      >
                        {item.text}
                      </p>
                    </div>
                  )}
                </li>
              ))}
              {phase === "thinking" && (
                <li className="flex flex-col items-center text-center animate-pulse">
                  <span className="text-[10px] lowercase tracking-[0.3em] text-[#c5648a] mb-1">
                    the sky is humming
                  </span>
                  <p className="text-xl md:text-2xl italic text-[#6b5b8a]" style={{ fontFamily: '"Instrument Serif", serif' }}>
                    &#8230;
                  </p>
                </li>
              )}
            </ul>
            <div ref={feedEndRef} />
          </div>

          {phase !== "done" && (
            <form onSubmit={submit} className="pt-4 w-full">
              <label
                htmlFor="words"
                className="block text-center text-[11px] lowercase tracking-[0.3em] text-[#6b5b8a] mb-3"
              >
                {error ? <span className="text-[#b94a6c]">{error}</span> : prompt}
              </label>
              <div
                className="flex items-center gap-3 rounded-full bg-white/45 backdrop-blur-md px-5 py-3 shadow-[0_10px_40px_-15px_rgba(74,43,92,0.35)] border border-white/60"
              >
                <input
                  id="words"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={phase === "thinking"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="type here"
                  className="flex-1 bg-transparent outline-none border-0 text-lg md:text-xl text-[#2a2342] placeholder:text-[#6b5b8a]/50 lowercase italic disabled:opacity-40"
                  style={{ fontFamily: '"Instrument Serif", serif' }}
                />
                <button
                  type="submit"
                  disabled={phase === "thinking"}
                  className="text-xs lowercase tracking-[0.25em] px-4 py-2 rounded-full bg-[#4a2b5c] text-[#fde6d8] hover:bg-[#6b3d80] transition-colors disabled:opacity-40"
                >
                  {phase === "thinking" ? "drifting" : "continue ↦"}
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] lowercase tracking-[0.25em] text-[#6b5b8a]/70">
                press enter to drift
              </p>
            </form>
          )}

          {phase === "done" && (
            <div className="pt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={tryAgain}
                className="text-sm lowercase tracking-[0.2em] px-6 py-3 rounded-full bg-white/55 backdrop-blur-md border border-white/70 text-[#4a2b5c] hover:bg-white/75 transition-colors"
                style={{ fontFamily: '"Instrument Serif", serif', fontStyle: "italic" }}
              >
                try again
              </button>
              <button
                onClick={newDrift}
                className="text-sm lowercase tracking-[0.2em] px-6 py-3 rounded-full bg-[#4a2b5c] text-[#fde6d8] hover:bg-[#6b3d80] transition-colors"
                style={{ fontFamily: '"Instrument Serif", serif', fontStyle: "italic" }}
              >
                a new drift
              </button>
            </div>
          )}
        </div>
      </section>

      <footer
        className="relative z-10 text-center pb-5 text-[10px] lowercase tracking-[0.3em] text-[#4a2b5c]/60"
      >
        a small place to feel something
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes birdDrift {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(10px, -12px) rotate(2deg); }
          50% { transform: translate(-6px, -6px) rotate(-1deg); }
          75% { transform: translate(8px, -14px) rotate(1.5deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }
        @keyframes wingFlap {
          0%, 100% { transform: scaleY(1); }
          40% { transform: scaleY(0.85); }
          60% { transform: scaleY(1.08); }
        }
      `}</style>
    </main>
  );
}

function Bird({ className = "", delay = "0s", duration = "7s", color = "#4a2b5c" }: { className?: string; delay?: string; duration?: string; color?: string }) {
  const wingFill = color;
  const bodyFill = color;
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 60"
      className={`pointer-events-none absolute ${className}`}
      style={{ animation: `birdDrift ${duration} ease-in-out infinite`, animationDelay: delay }}
    >
      <g style={{ animation: `wingFlap ${duration} ease-in-out infinite`, animationDelay: delay }}>
        {/* far wing */}
        <path
          d="M24 32 C32 14 52 10 58 22 C52 20 36 24 24 32Z"
          fill={wingFill}
          opacity="0.35"
        />
        {/* body */}
        <ellipse cx="58" cy="28" rx="14" ry="7" fill={bodyFill} opacity="0.45" />
        {/* near wing */}
        <path
          d="M30 34 C38 12 62 8 70 22 C62 20 44 24 30 34Z"
          fill={wingFill}
          opacity="0.55"
        />
        {/* tail */}
        <path
          d="M44 28 L24 22 L28 30 Z"
          fill={bodyFill}
          opacity="0.4"
        />
        {/* head */}
        <circle cx="70" cy="24" r="4.5" fill={bodyFill} opacity="0.6" />
        {/* beak */}
        <path
          d="M73 24 L78 22 L73 26 Z"
          fill={bodyFill}
          opacity="0.7"
        />
        {/* eye */}
        <circle cx="71" cy="23" r="1" fill="#ffffff" opacity="0.85" />
      </g>
    </svg>
  );
}
