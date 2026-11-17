"use client";

import { python } from "@codemirror/lang-python";
import { indentUnit } from "@codemirror/language";
import { Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentMore, indentLess } from "@codemirror/commands";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { tags as tg } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { useMemo, useRef } from "react";
import { type StrKey, useT } from "@/lib/i18n";

const highlight = HighlightStyle.define([
  { tag: [tg.keyword, tg.controlKeyword, tg.definitionKeyword, tg.operatorKeyword], color: "#93f1f7" },
  { tag: [tg.string, tg.special(tg.string)], color: "#9ae187" },
  { tag: [tg.number, tg.bool, tg.null], color: "#f5c26b" },
  { tag: [tg.comment, tg.lineComment, tg.docString], color: "#7d7d7d", fontStyle: "italic" },
  { tag: [tg.function(tg.definition(tg.variableName)), tg.function(tg.variableName)], color: "#ffffff", fontWeight: "500" },
  { tag: [tg.variableName, tg.propertyName], color: "#e6e6e6" },
  { tag: [tg.operator, tg.punctuation, tg.bracket], color: "#b3b3b3" },
]);

const baseTheme = EditorView.theme(
  {
    "&": { color: "#e6e6e6", backgroundColor: "transparent" },
    ".cm-content": { caretColor: "#93f1f7", padding: "12px 0" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "rgba(147,241,247,0.22) !important" },
    ".cm-matchingBracket": { backgroundColor: "rgba(147,241,247,0.18)", outline: "none" },
    ".cm-tooltip": { backgroundColor: "#161616", border: "1px solid rgba(255,255,255,0.1)" },
  },
  { dark: true },
);

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  onRun,
  editorRef,
  label,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  onRun?: () => void;
  editorRef?: React.MutableRefObject<EditorView | null>;
  label: string;
}) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const extensions = useMemo(
    () => [
      python(),
      indentUnit.of("    "),
      syntaxHighlighting(highlight),
      baseTheme,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": label, autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
      // basicSetup's defaultKeymap is added before these extensions and binds Mod-Enter to insertBlankLine,
      // so give ours the highest precedence or Cmd/Ctrl+Enter would add a line instead of running the tests.
      Prec.highest(
        keymap.of([
          { key: "Mod-Enter", run: () => (onRun?.(), true) },
          { key: "Tab", run: indentMore, shift: indentLess },
        ]),
      ),
    ],
    [onRun, label],
  );

  return (
    <CodeMirror
      ref={ref}
      className="cm-theme-shadowday h-full"
      value={value}
      height="100%"
      theme="none"
      readOnly={readOnly}
      editable={!readOnly}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, autocompletion: false, searchKeymap: false, tabSize: 4 }}
      extensions={extensions}
      onChange={(v) => onChange?.(v)}
      onCreateEditor={(view) => {
        if (editorRef) editorRef.current = view;
      }}
    />
  );
}

const KEYS: { label: string; insert: string; aria?: StrKey }[] = [
  { label: "⇥", insert: "    ", aria: "indent" },
  { label: "(", insert: "(" },
  { label: ")", insert: ")" },
  { label: "[", insert: "[" },
  { label: "]", insert: "]" },
  { label: "{", insert: "{" },
  { label: "}", insert: "}" },
  { label: ":", insert: ":" },
  { label: '"', insert: '"' },
  { label: "=", insert: "=" },
  { label: ".", insert: "." },
  { label: ",", insert: "," },
  { label: "_", insert: "_" },
  { label: "#", insert: "#" },
  { label: "<", insert: "<" },
  { label: ">", insert: ">" },
];

/** A row of symbols that are hard to reach on phone keyboards. */
export function KeyBar({ editorRef }: { editorRef: React.MutableRefObject<EditorView | null> }) {
  const { t } = useT();
  return (
    <div className="code-ltr scroll-thin flex gap-1.5 overflow-x-auto border-t border-line bg-surface px-2 py-2 lg:hidden" role="toolbar" aria-label={t("symbols")}>
      {KEYS.map((k) => (
        <button
          key={k.label}
          type="button"
          aria-label={k.aria ? t(k.aria) : k.label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const view = editorRef.current;
            if (!view) return;
            view.dispatch(view.state.replaceSelection(k.insert));
            view.focus();
          }}
          className="h-11 min-w-11 shrink-0 rounded-[10px] bg-raised-2 px-3 font-mono text-[16px] text-ink active:scale-95"
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}
