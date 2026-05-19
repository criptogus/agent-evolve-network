import { useEffect, useState } from "react";

interface TypewriterProps {
  words: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pause?: number;
}

export function Typewriter({
  words,
  className,
  typeSpeed = 130,
  deleteSpeed = 70,
  pause = 2200,
}: TypewriterProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(words[0] ?? "");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[index % words.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text === current) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => {
        const nextIndex = (i + 1) % words.length;
        setText(words[nextIndex] ?? "");
        return nextIndex;
      });
    } else {
      timeout = setTimeout(
        () => {
          setText((t) =>
            deleting ? current.slice(0, t.length - 1) : current.slice(0, t.length + 1),
          );
        },
        deleting ? deleteSpeed : typeSpeed,
      );
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, index, words, typeSpeed, deleteSpeed, pause]);

  return (
    <span className={className}>
      {text}
      <span className="caret" aria-hidden />
    </span>
  );
}

interface TypingLinesProps {
  lines: string[];
  speed?: number;
  startDelay?: number;
  className?: string;
  lineClassName?: (line: string, i: number) => string | undefined;
}

/** Types one line at a time, then keeps it and moves to the next. */
export function TypingLines({
  lines,
  speed = 42,
  startDelay = 400,
  className,
  lineClassName,
}: TypingLinesProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started || lineIdx >= lines.length) return;
    const current = lines[lineIdx];
    if (charIdx < current.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLineIdx((i) => i + 1);
      setCharIdx(0);
    }, 280);
    return () => clearTimeout(t);
  }, [charIdx, lineIdx, lines, speed, started]);

  return (
    <div className={className}>
      {lines.slice(0, lineIdx).map((l, i) => (
        <div key={i} className={lineClassName?.(l, i)}>
          {l || "\u00A0"}
        </div>
      ))}
      {lineIdx < lines.length && (
        <div className={lineClassName?.(lines[lineIdx], lineIdx)}>
          {lines[lineIdx].slice(0, charIdx)}
          <span className="caret" aria-hidden />
        </div>
      )}
    </div>
  );
}
