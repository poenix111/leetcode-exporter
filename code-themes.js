/* ============================================================
   LeetCode to PDF — Code Syntax Themes
   ============================================================ */

const CODE_THEMES = {
  "github-light": {
    name: "GitHub Light",
    category: "light",
    bg: "#ffffff",
    fg: "#24292e",
    border: "#d0d7de",
    headerBg: "#f6f8fa",
    gutterBg: "#f6f8fa",
    gutterFg: "#8c959f",
    css: `
      .theme-github-light .code-window { background: #ffffff; border-color: #d0d7de; color: #24292e; }
      .theme-github-light .code-window-header { background: #f6f8fa; border-bottom-color: #d0d7de; color: #57606a; }
      .theme-github-light .code-line-number { color: #8c959f; border-right-color: #d0d7de; }
      .theme-github-light .hljs-keyword, .theme-github-light .hljs-selector-tag { color: #cf222e; font-weight: 600; }
      .theme-github-light .hljs-string, .theme-github-light .hljs-doctag { color: #0a3069; }
      .theme-github-light .hljs-title, .theme-github-light .hljs-title.class_, .theme-github-light .hljs-title.function_ { color: #8250df; font-weight: 600; }
      .theme-github-light .hljs-comment { color: #6e7781; font-style: italic; }
      .theme-github-light .hljs-number, .theme-github-light .hljs-literal { color: #0550ae; }
      .theme-github-light .hljs-type, .theme-github-light .hljs-built_in { color: #953800; }
      .theme-github-light .hljs-attr, .theme-github-light .hljs-property { color: #116329; }
      .theme-github-light .hljs-punctuation, .theme-github-light .hljs-operator { color: #24292e; }
    `
  },
  "solarized-light": {
    name: "Solarized Light",
    category: "light",
    bg: "#fdf6e3",
    fg: "#657b83",
    border: "#eee8d5",
    headerBg: "#eee8d5",
    gutterBg: "#f5efdc",
    gutterFg: "#93a1a1",
    css: `
      .theme-solarized-light .code-window { background: #fdf6e3; border-color: #eee8d5; color: #657b83; }
      .theme-solarized-light .code-window-header { background: #eee8d5; border-bottom-color: #e0dac8; color: #586e75; }
      .theme-solarized-light .code-line-number { color: #93a1a1; border-right-color: #eee8d5; }
      .theme-solarized-light .hljs-keyword, .theme-solarized-light .hljs-selector-tag { color: #859900; font-weight: 600; }
      .theme-solarized-light .hljs-string, .theme-solarized-light .hljs-doctag { color: #2aa198; }
      .theme-solarized-light .hljs-title, .theme-solarized-light .hljs-title.class_, .theme-solarized-light .hljs-title.function_ { color: #268bd2; font-weight: 600; }
      .theme-solarized-light .hljs-comment { color: #93a1a1; font-style: italic; }
      .theme-solarized-light .hljs-number, .theme-solarized-light .hljs-literal { color: #d33682; }
      .theme-solarized-light .hljs-type, .theme-solarized-light .hljs-built_in { color: #b58900; }
      .theme-solarized-light .hljs-attr, .theme-solarized-light .hljs-property { color: #268bd2; }
      .theme-solarized-light .hljs-punctuation, .theme-solarized-light .hljs-operator { color: #657b83; }
    `
  },
  "one-light": {
    name: "Atom One Light",
    category: "light",
    bg: "#fafafa",
    fg: "#383a42",
    border: "#e5e5e6",
    headerBg: "#f0f0f1",
    gutterBg: "#f0f0f1",
    gutterFg: "#9d9d9f",
    css: `
      .theme-one-light .code-window { background: #fafafa; border-color: #e5e5e6; color: #383a42; }
      .theme-one-light .code-window-header { background: #f0f0f1; border-bottom-color: #e5e5e6; color: #696c77; }
      .theme-one-light .code-line-number { color: #9d9d9f; border-right-color: #e5e5e6; }
      .theme-one-light .hljs-keyword, .theme-one-light .hljs-selector-tag { color: #a626a4; font-weight: 600; }
      .theme-one-light .hljs-string, .theme-one-light .hljs-doctag { color: #50a14f; }
      .theme-one-light .hljs-title, .theme-one-light .hljs-title.class_, .theme-one-light .hljs-title.function_ { color: #4078f2; font-weight: 600; }
      .theme-one-light .hljs-comment { color: #a0a1a7; font-style: italic; }
      .theme-one-light .hljs-number, .theme-one-light .hljs-literal { color: #986801; }
      .theme-one-light .hljs-type, .theme-one-light .hljs-built_in { color: #c18401; }
      .theme-one-light .hljs-attr, .theme-one-light .hljs-property { color: #e45649; }
      .theme-one-light .hljs-punctuation, .theme-one-light .hljs-operator { color: #383a42; }
    `
  },
  "vscode-dark": {
    name: "VS Code Dark+",
    category: "dark",
    bg: "#1e1e1e",
    fg: "#d4d4d4",
    border: "#333333",
    headerBg: "#252526",
    gutterBg: "#1e1e1e",
    gutterFg: "#858585",
    css: `
      .theme-vscode-dark .code-window { background: #1e1e1e; border-color: #333333; color: #d4d4d4; }
      .theme-vscode-dark .code-window-header { background: #252526; border-bottom-color: #333333; color: #969696; }
      .theme-vscode-dark .code-line-number { color: #858585; border-right-color: #2e2e2e; }
      .theme-vscode-dark .hljs-keyword, .theme-vscode-dark .hljs-selector-tag { color: #569cd6; font-weight: 600; }
      .theme-vscode-dark .hljs-string, .theme-vscode-dark .hljs-doctag { color: #ce9178; }
      .theme-vscode-dark .hljs-title, .theme-vscode-dark .hljs-title.class_, .theme-vscode-dark .hljs-title.function_ { color: #dcdcaa; font-weight: 600; }
      .theme-vscode-dark .hljs-comment { color: #6a9955; font-style: italic; }
      .theme-vscode-dark .hljs-number, .theme-vscode-dark .hljs-literal { color: #b5cea8; }
      .theme-vscode-dark .hljs-type, .theme-vscode-dark .hljs-built_in { color: #4ec9b0; }
      .theme-vscode-dark .hljs-attr, .theme-vscode-dark .hljs-property { color: #9cdcfe; }
      .theme-vscode-dark .hljs-punctuation, .theme-vscode-dark .hljs-operator { color: #d4d4d4; }
    `
  },
  "dracula": {
    name: "Dracula",
    category: "dark",
    bg: "#282a36",
    fg: "#f8f8f2",
    border: "#44475a",
    headerBg: "#21222c",
    gutterBg: "#282a36",
    gutterFg: "#6272a4",
    css: `
      .theme-dracula .code-window { background: #282a36; border-color: #44475a; color: #f8f8f2; }
      .theme-dracula .code-window-header { background: #21222c; border-bottom-color: #44475a; color: #bd93f9; }
      .theme-dracula .code-line-number { color: #6272a4; border-right-color: #44475a; }
      .theme-dracula .hljs-keyword, .theme-dracula .hljs-selector-tag { color: #ff79c6; font-weight: 600; }
      .theme-dracula .hljs-string, .theme-dracula .hljs-doctag { color: #f1fa8c; }
      .theme-dracula .hljs-title, .theme-dracula .hljs-title.class_, .theme-dracula .hljs-title.function_ { color: #50fa7b; font-weight: 600; }
      .theme-dracula .hljs-comment { color: #6272a4; font-style: italic; }
      .theme-dracula .hljs-number, .theme-dracula .hljs-literal { color: #bd93f9; }
      .theme-dracula .hljs-type, .theme-dracula .hljs-built_in { color: #8be9fd; }
      .theme-dracula .hljs-attr, .theme-dracula .hljs-property { color: #50fa7b; }
      .theme-dracula .hljs-punctuation, .theme-dracula .hljs-operator { color: #ff79c6; }
    `
  },
  "one-dark": {
    name: "One Dark Pro",
    category: "dark",
    bg: "#282c34",
    fg: "#abb2bf",
    border: "#3e4451",
    headerBg: "#21252b",
    gutterBg: "#282c34",
    gutterFg: "#5c6370",
    css: `
      .theme-one-dark .code-window { background: #282c34; border-color: #3e4451; color: #abb2bf; }
      .theme-one-dark .code-window-header { background: #21252b; border-bottom-color: #3e4451; color: #828997; }
      .theme-one-dark .code-line-number { color: #5c6370; border-right-color: #3e4451; }
      .theme-one-dark .hljs-keyword, .theme-one-dark .hljs-selector-tag { color: #c678dd; font-weight: 600; }
      .theme-one-dark .hljs-string, .theme-one-dark .hljs-doctag { color: #98c379; }
      .theme-one-dark .hljs-title, .theme-one-dark .hljs-title.class_, .theme-one-dark .hljs-title.function_ { color: #61afef; font-weight: 600; }
      .theme-one-dark .hljs-comment { color: #5c6370; font-style: italic; }
      .theme-one-dark .hljs-number, .theme-one-dark .hljs-literal { color: #d19a66; }
      .theme-one-dark .hljs-type, .theme-one-dark .hljs-built_in { color: #e5c07b; }
      .theme-one-dark .hljs-attr, .theme-one-dark .hljs-property { color: #e06c75; }
      .theme-one-dark .hljs-punctuation, .theme-one-dark .hljs-operator { color: #abb2bf; }
    `
  },
  "monokai": {
    name: "Monokai",
    category: "dark",
    bg: "#272822",
    fg: "#f8f8f2",
    border: "#3e3d32",
    headerBg: "#1e1f1c",
    gutterBg: "#272822",
    gutterFg: "#75715e",
    css: `
      .theme-monokai .code-window { background: #272822; border-color: #3e3d32; color: #f8f8f2; }
      .theme-monokai .code-window-header { background: #1e1f1c; border-bottom-color: #3e3d32; color: #a6a599; }
      .theme-monokai .code-line-number { color: #75715e; border-right-color: #3e3d32; }
      .theme-monokai .hljs-keyword, .theme-monokai .hljs-selector-tag { color: #f92672; font-weight: 600; }
      .theme-monokai .hljs-string, .theme-monokai .hljs-doctag { color: #e6db74; }
      .theme-monokai .hljs-title, .theme-monokai .hljs-title.class_, .theme-monokai .hljs-title.function_ { color: #a6e22e; font-weight: 600; }
      .theme-monokai .hljs-comment { color: #75715e; font-style: italic; }
      .theme-monokai .hljs-number, .theme-monokai .hljs-literal { color: #ae81ff; }
      .theme-monokai .hljs-type, .theme-monokai .hljs-built_in { color: #66d9ef; }
      .theme-monokai .hljs-attr, .theme-monokai .hljs-property { color: #a6e22e; }
      .theme-monokai .hljs-punctuation, .theme-monokai .hljs-operator { color: #f8f8f2; }
    `
  },
  "nord": {
    name: "Nord",
    category: "dark",
    bg: "#2e3440",
    fg: "#d8dee9",
    border: "#3b4252",
    headerBg: "#242933",
    gutterBg: "#2e3440",
    gutterFg: "#616e88",
    css: `
      .theme-nord .code-window { background: #2e3440; border-color: #3b4252; color: #d8dee9; }
      .theme-nord .code-window-header { background: #242933; border-bottom-color: #3b4252; color: #88c0d0; }
      .theme-nord .code-line-number { color: #616e88; border-right-color: #3b4252; }
      .theme-nord .hljs-keyword, .theme-nord .hljs-selector-tag { color: #81a1c1; font-weight: 600; }
      .theme-nord .hljs-string, .theme-nord .hljs-doctag { color: #a3be8c; }
      .theme-nord .hljs-title, .theme-nord .hljs-title.class_, .theme-nord .hljs-title.function_ { color: #88c0d0; font-weight: 600; }
      .theme-nord .hljs-comment { color: #616e88; font-style: italic; }
      .theme-nord .hljs-number, .theme-nord .hljs-literal { color: #b48ead; }
      .theme-nord .hljs-type, .theme-nord .hljs-built_in { color: #8fbcbb; }
      .theme-nord .hljs-attr, .theme-nord .hljs-property { color: #d8dee9; }
      .theme-nord .hljs-punctuation, .theme-nord .hljs-operator { color: #81a1c1; }
    `
  }
};

function getAllThemesCSS() {
  return Object.values(CODE_THEMES).map(t => t.css).join("\n");
}

if (typeof window !== "undefined") {
  window.CODE_THEMES = CODE_THEMES;
  window.getAllThemesCSS = getAllThemesCSS;
}
