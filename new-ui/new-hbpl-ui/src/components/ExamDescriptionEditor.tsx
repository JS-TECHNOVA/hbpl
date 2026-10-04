"use client";

import { useEffect, useId, useRef, useState } from "react";
import ExamDescriptionRenderer, { parseExamDescription } from "./ExamDescriptionRenderer";
import styles from "./ExamDescriptionEditor.module.css";

type EditorData = ReturnType<typeof parseExamDescription>;

export default function ExamDescriptionEditor({
  value,
  onChange,
  title = "Exam description",
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}) {
  const id = useId().replaceAll(":", "-");
  const holderId = `exam-description-${id}`;
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  const initialData = useRef(parseExamDescription(value));

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let instance: { isReady: Promise<void>; destroy: () => void } | null = null;

    async function initialize() {
      try {
        const [editorModule, Header, List, Checklist, Quote, Warning, Delimiter, Table, InlineCode, Marker, Underline] = await Promise.all([
          import("@editorjs/editorjs"),
          import("@editorjs/header").then((module) => module.default),
          import("@editorjs/list").then((module) => module.default),
          import("@editorjs/checklist").then((module) => module.default),
          import("@editorjs/quote").then((module) => module.default),
          import("@editorjs/warning").then((module) => module.default),
          import("@editorjs/delimiter").then((module) => module.default),
          import("@editorjs/table").then((module) => module.default),
          import("@editorjs/inline-code").then((module) => module.default),
          import("@editorjs/marker").then((module) => module.default),
          import("@editorjs/underline").then((module) => module.default),
        ]);
        if (cancelled || !document.getElementById(holderId)) return;
        const EditorJS = editorModule.default;
        instance = new EditorJS({
          holder: holderId,
          data: initialData.current as never,
          placeholder: "Write the exam description. Use the + button for headings, lists, tables, notices, and quotes.",
          tools: {
            header: { class: Header, inlineToolbar: ["marker", "inlineCode", "underline"], config: { levels: [2, 3, 4], defaultLevel: 2 } },
            list: { class: List, inlineToolbar: true },
            checklist: { class: Checklist as never, inlineToolbar: true },
            quote: { class: Quote, inlineToolbar: true },
            warning: { class: Warning, inlineToolbar: true },
            delimiter: Delimiter,
            table: { class: Table as never, inlineToolbar: true, config: { rows: 2, cols: 3, withHeadings: true } },
            inlineCode: InlineCode,
            marker: Marker as never,
            underline: Underline,
          },
          onChange: async (api: { saver: { save: () => Promise<EditorData> } }) => {
            try {
              const saved = await api.saver.save();
              if (!cancelled) onChangeRef.current(JSON.stringify(saved));
            } catch (error) { console.error("Could not save exam description", error); }
          },
        });
        await instance.isReady;
        if (!cancelled) setReady(true);
      } catch (error) {
        if (!cancelled) console.error("Could not initialize exam description editor", error);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      if (instance) void instance.isReady.then(() => instance?.destroy()).catch(() => undefined);
    };
  }, [holderId]);

  const data = parseExamDescription(value);

  return <div className={`${styles.wrapper} overflow-hidden rounded-xl border border-slate-200 bg-white`}>
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <div><p className="text-[12px] font-semibold text-slate-800">{title}</p><p className="text-[10px] text-slate-500">Rich text blocks · {data.blocks.length} {data.blocks.length === 1 ? "block" : "blocks"}</p></div>
      <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">{ready ? "Ready" : "Loading editor…"}</span><button type="button" onClick={() => setPreview((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700">{preview ? "Edit" : "Preview"}</button></div>
    </div>
    <div className="exam-description-editor__canvas max-h-[480px] min-h-[220px] overflow-y-auto px-4 py-3">
      <div id={holderId} className={preview ? "hidden" : ""} />
      {preview && (data.blocks.length ? <ExamDescriptionRenderer data={data} /> : <p className="text-[12px] text-slate-400">No description yet.</p>)}
    </div>
  </div>;
}
