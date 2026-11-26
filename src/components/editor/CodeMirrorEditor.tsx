import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';

interface CodeMirrorEditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: string;
  readOnly?: boolean;
  onSave?: () => void;
  className?: string;
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language = 'python',
  readOnly = false,
  onSave,
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Helper to determine language extension
  const getLanguageExtension = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'js':
      case 'javascript':
      case 'ts':
      case 'typescript':
      case 'json':
        return javascript({ typescript: true });
      case 'py':
      case 'python':
        return python();
      case 'html':
        return html();
      case 'css':
        return css();
      default:
        return python();
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;

    // Custom save keybinding
    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          if (onSave) onSave();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        saveKeymap,
        getLanguageExtension(language),
        oneDark,
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-gutters': {
            backgroundColor: '#090d16',
            color: '#475569',
            borderRight: '1px solid #1e293b',
          },
          '&.cm-focused .cm-cursor': {
            borderLeftColor: '#6366f1',
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly]);

  // Sync external document changes
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (value !== currentValue) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value },
        });
      }
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`h-full w-full overflow-hidden bg-surface-950 font-mono rounded-lg border border-surface-800 ${className}`}
    />
  );
};
