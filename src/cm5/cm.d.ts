import type CodeMirror from "codemirror";

declare global {
  interface Window {
    CodeMirror?: typeof CodeMirror;
  }
}

export {};
