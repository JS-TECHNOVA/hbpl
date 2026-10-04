import { createElement, ReactNode } from "react";

export type ExamDescriptionBlock = { id?: string; type: string; data: Record<string, unknown> };
export type ExamDescriptionData = { time?: number; blocks: ExamDescriptionBlock[]; version?: string };

export function parseExamDescription(value: string): ExamDescriptionData {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const blocks = Array.isArray(parsed) ? parsed : parsed?.blocks;
      if (Array.isArray(blocks)) return { ...parsed, blocks } as ExamDescriptionData;
    } catch { /* Fall back to legacy plain text. */ }
  }
  return { blocks: trimmed ? trimmed.split(/\n{2,}/).map((text) => ({ type: "paragraph", data: { text } })) : [] };
}

type InlineNode = string | { tag: string; children: InlineNode[] };
const inlineTags = new Set(["b", "strong", "i", "em", "u", "mark", "code", "sub", "sup"]);

function decodeEntity(entity: string) {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
  const named = /^&([a-z]+);$/i.exec(entity);
  if (named) return entities[named[1].toLowerCase()] ?? entity;
  const numeric = /^&#(x[\da-f]+|\d+);$/i.exec(entity);
  if (!numeric) return entity;
  const code = numeric[1][0].toLowerCase() === "x" ? parseInt(numeric[1].slice(1), 16) : parseInt(numeric[1], 10);
  try { return String.fromCodePoint(code); } catch { return entity; }
}

function inlineContent(value: string): ReactNode[] {
  const root: InlineNode[] = [];
  const stack: { tag: string | null; children: InlineNode[] }[] = [{ tag: null, children: root }];
  const tokens = value.split(/(<\/?[a-z][^>]*>|&(?:#x[\da-f]+|#\d+|[a-z]+);)/gi);
  for (const token of tokens) {
    if (!token) continue;
    const tag = /^<(\/)?([a-z][a-z0-9]*)[^>]*>$/i.exec(token);
    if (tag) {
      const name = tag[2].toLowerCase();
      if (!inlineTags.has(name)) continue;
      if (tag[1]) {
        const index = stack.map((item) => item.tag).lastIndexOf(name);
        if (index > 0) stack.length = index;
      } else {
        const node: InlineNode = { tag: name, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
      }
    } else if (token[0] === "&") {
      stack[stack.length - 1].children.push(decodeEntity(token));
    } else {
      stack[stack.length - 1].children.push(token);
    }
  }

  const toReact = (nodes: InlineNode[], path = ""): ReactNode[] => nodes.map((node, index) => {
    if (typeof node === "string") return node;
    return createElement(node.tag, { key: `${path}${index}` }, ...toReact(node.children, `${path}${index}.`));
  });
  return toReact(root);
}

function inline(value: unknown) {
  return typeof value === "string" ? inlineContent(value) : null;
}

function text(value: unknown) { return typeof value === "string" ? value : ""; }

function renderList(items: unknown[], ordered: boolean, key: string): ReactNode {
  const Tag = ordered ? "ol" : "ul";
  return createElement(Tag, { key, className: ordered ? "list-decimal space-y-1 pl-6" : "list-disc space-y-1 pl-6" }, ...items.map((item, index) => {
    const entry = typeof item === "string" ? { content: item } : (item && typeof item === "object" ? item as Record<string, unknown> : {});
    const content = text(entry.content ?? entry.text);
    const nested = Array.isArray(entry.items) ? entry.items : [];
    return <li key={`${key}-${index}`}>{inline(content)}{nested.length ? renderList(nested, false, `${key}-${index}`) : null}</li>;
  }));
}

function renderBlock(block: ExamDescriptionBlock, index: number): ReactNode {
  const data = block.data ?? {};
  const key = block.id ?? `${block.type}-${index}`;
  switch (block.type) {
    case "header": {
      const level = Math.min(6, Math.max(2, Number(data.level) || 2));
      return createElement(`h${level}`, { key, className: "font-heading font-bold text-[#263850]" }, ...inlineContent(text(data.text)));
    }
    case "paragraph":
      return <p key={key} className="whitespace-pre-wrap">{inline(text(data.text))}</p>;
    case "list": {
      const items = Array.isArray(data.items) ? data.items : [];
      const ordered = data.style === "ordered" || data.style === "numeric";
      return renderList(items, ordered, key);
    }
    case "checklist": {
      const items = Array.isArray(data.items) ? data.items : [];
      return <ul key={key} className="space-y-2">{items.map((item, itemIndex) => {
        const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return <li key={`${key}-${itemIndex}`} className="flex gap-2"><span aria-hidden="true" className="text-[#a36d17]">{entry.checked ? "☑" : "□"}</span><span>{inline(text(entry.text ?? entry.content))}</span></li>;
      })}</ul>;
    }
    case "quote":
      return <blockquote key={key} className="border-l-2 border-[#dfb75f] pl-4 italic text-[#596779]"><div>{inline(text(data.text))}</div>{text(data.caption) && <cite className="mt-2 block text-[10px] not-italic text-[#818b97]">{text(data.caption)}</cite>}</blockquote>;
    case "warning":
      return <aside key={key} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><strong className="block text-[#805b17]">{text(data.title)}</strong><div className="mt-1">{inline(text(data.message))}</div></aside>;
    case "delimiter":
      return <hr key={key} className="border-[#e8e6de]" />;
    case "table": {
      const rows = Array.isArray(data.content) ? data.content as unknown[][] : [];
      const hasHeadings = Boolean(data.withHeadings);
      return <div key={key} className="overflow-x-auto"><table className="w-full border-collapse text-left text-[11px]"><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-[#e8e6de]">{(Array.isArray(row) ? row : []).map((cell, cellIndex) => {
        const content = inline(text(cell));
        return hasHeadings && rowIndex === 0
          ? <th key={cellIndex} className="bg-[#f7f6f2] px-3 py-2 font-bold">{content}</th>
          : <td key={cellIndex} className="px-3 py-2">{content}</td>;
      })}</tr>)}</tbody></table></div>;
    }
    default:
      return null;
  }
}

export default function ExamDescriptionRenderer({ data }: { data: ExamDescriptionData }) {
  return <div className="space-y-5 text-[12px] leading-7 text-[#536174]">{data.blocks.map(renderBlock)}</div>;
}
