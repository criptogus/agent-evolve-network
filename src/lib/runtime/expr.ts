// Tiny interpolation + condition evaluator for Playbook expressions.
// Supports:
//   ${inputs.foo}, ${steps.<id>.output}, ${steps.<id>.status}
//   "<expr> contains '<literal>'" / "==" / "!=" / "&&" / "||" / unary "!"
//
// Intentionally restricted — no JavaScript eval, no function calls.

import type { RunContext } from "./types";

export function interpolate(template: unknown, ctx: RunContext): unknown {
  if (typeof template === "string") return interpolateString(template, ctx);
  if (Array.isArray(template)) return template.map((v) => interpolate(v, ctx));
  if (template && typeof template === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(template)) out[k] = interpolate(v, ctx);
    return out;
  }
  return template;
}

function interpolateString(s: string, ctx: RunContext): string {
  return s.replace(/\$\{([^}]+)\}/g, (_, path) => {
    const v = resolvePath(path.trim(), ctx);
    return v === undefined || v === null ? "" : String(v);
  });
}

export function resolvePath(path: string, ctx: RunContext): unknown {
  const parts = path.split(".");
  const head = parts.shift();
  let cur: unknown;
  if (head === "inputs") cur = ctx.inputs;
  else if (head === "steps") cur = ctx.steps;
  else if (head === "metadata") cur = ctx.metadata;
  else return undefined;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

// Evaluates conditions like:
//   "${steps.extract.output} contains 'stack trace'"
//   "${inputs.severity} == 'critical' && ${steps.x.status} == 'ok'"
export function evaluateCondition(expr: string, ctx: RunContext): boolean {
  if (!expr || !expr.trim()) return true;
  const tokens = tokenize(expr);
  const { value } = parseOr(tokens, 0, ctx);
  return Boolean(value);
}

type Tok =
  | { t: "lparen" } | { t: "rparen" }
  | { t: "and" } | { t: "or" } | { t: "not" }
  | { t: "eq" } | { t: "neq" } | { t: "contains" }
  | { t: "lit"; v: string | number | boolean | null }
  | { t: "ref"; v: string };

function tokenize(expr: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "(") { out.push({ t: "lparen" }); i++; continue; }
    if (c === ")") { out.push({ t: "rparen" }); i++; continue; }
    if (expr.startsWith("&&", i)) { out.push({ t: "and" }); i += 2; continue; }
    if (expr.startsWith("||", i)) { out.push({ t: "or" }); i += 2; continue; }
    if (expr.startsWith("==", i)) { out.push({ t: "eq" }); i += 2; continue; }
    if (expr.startsWith("!=", i)) { out.push({ t: "neq" }); i += 2; continue; }
    if (c === "!") { out.push({ t: "not" }); i++; continue; }
    if (expr.startsWith("contains", i)) { out.push({ t: "contains" }); i += 8; continue; }
    if (c === "'" || c === '"') {
      const q = c; let j = i + 1; let s = "";
      while (j < expr.length && expr[j] !== q) { s += expr[j++]; }
      out.push({ t: "lit", v: s }); i = j + 1; continue;
    }
    if (c === "$" && expr[i + 1] === "{") {
      const end = expr.indexOf("}", i + 2);
      if (end < 0) throw new Error("unclosed ${");
      out.push({ t: "ref", v: expr.slice(i + 2, end).trim() });
      i = end + 1; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i, s = "";
      while (j < expr.length && /[0-9.]/.test(expr[j])) s += expr[j++];
      out.push({ t: "lit", v: Number(s) }); i = j; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i, s = "";
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) s += expr[j++];
      if (s === "true") out.push({ t: "lit", v: true });
      else if (s === "false") out.push({ t: "lit", v: false });
      else if (s === "null") out.push({ t: "lit", v: null });
      else throw new Error(`unexpected identifier: ${s}`);
      i = j; continue;
    }
    throw new Error(`unexpected char in expression: ${c}`);
  }
  return out;
}

function parseOr(toks: Tok[], pos: number, ctx: RunContext): { value: unknown; pos: number } {
  let { value, pos: p } = parseAnd(toks, pos, ctx);
  while (toks[p]?.t === "or") {
    const right = parseAnd(toks, p + 1, ctx);
    value = Boolean(value) || Boolean(right.value);
    p = right.pos;
  }
  return { value, pos: p };
}
function parseAnd(toks: Tok[], pos: number, ctx: RunContext): { value: unknown; pos: number } {
  let { value, pos: p } = parseCmp(toks, pos, ctx);
  while (toks[p]?.t === "and") {
    const right = parseCmp(toks, p + 1, ctx);
    value = Boolean(value) && Boolean(right.value);
    p = right.pos;
  }
  return { value, pos: p };
}
function parseCmp(toks: Tok[], pos: number, ctx: RunContext): { value: unknown; pos: number } {
  let { value, pos: p } = parseUnary(toks, pos, ctx);
  while (toks[p]?.t === "eq" || toks[p]?.t === "neq" || toks[p]?.t === "contains") {
    const op = toks[p].t;
    const right = parseUnary(toks, p + 1, ctx);
    if (op === "eq") value = String(value) === String(right.value);
    else if (op === "neq") value = String(value) !== String(right.value);
    else value = String(value ?? "").includes(String(right.value ?? ""));
    p = right.pos;
  }
  return { value, pos: p };
}
function parseUnary(toks: Tok[], pos: number, ctx: RunContext): { value: unknown; pos: number } {
  if (toks[pos]?.t === "not") {
    const inner = parseUnary(toks, pos + 1, ctx);
    return { value: !inner.value, pos: inner.pos };
  }
  return parsePrimary(toks, pos, ctx);
}
function parsePrimary(toks: Tok[], pos: number, ctx: RunContext): { value: unknown; pos: number } {
  const tok = toks[pos];
  if (!tok) throw new Error("unexpected end of expression");
  if (tok.t === "lparen") {
    const inner = parseOr(toks, pos + 1, ctx);
    if (toks[inner.pos]?.t !== "rparen") throw new Error("missing )");
    return { value: inner.value, pos: inner.pos + 1 };
  }
  if (tok.t === "lit") return { value: tok.v, pos: pos + 1 };
  if (tok.t === "ref") return { value: resolvePath(tok.v, ctx), pos: pos + 1 };
  throw new Error(`unexpected token: ${tok.t}`);
}
