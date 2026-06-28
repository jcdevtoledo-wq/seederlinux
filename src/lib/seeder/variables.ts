// SeederLinux v3.0 — Helpers de detecção de variáveis em scripts.
// O catálogo oficial agora vive no backend (variable_definitions, Doc 06).

/** Extrai variáveis usadas em um script bash (procura $VAR, ${VAR} e {{VAR}}). */
export function extractUsedVars(bash: string): string[] {
  const found = new Set<string>();
  const re = /(?:\$\{?([A-Z][A-Z0-9_]+)\}?|\{\{\s*([A-Z][A-Z0-9_]+)\s*\}\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bash)) !== null) {
    found.add(m[1] ?? m[2]);
  }
  const builtins = new Set(["USER", "HOME", "PATH", "SHELL", "PWD", "UID", "PS1", "IFS", "LANG"]);
  return [...found].filter((v) => !builtins.has(v));
}
