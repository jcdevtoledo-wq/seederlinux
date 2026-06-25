import { extractUsedVars } from "./variables";
import type { VariableDef } from "./types";

export type LintSeverity = "error" | "warn" | "info";
export interface LintIssue {
  severity: LintSeverity;
  code: string;
  message: string;
  line?: number;
}

const HARDCODED_PWD =
  /(password|passwd|senha)\s*[:=]\s*["']?(?!\$|\{\{)[^"'\s]{4,}/i;
const SUDO_NOPASSWD = /NOPASSWD\s*:\s*ALL/i;
const CURL_PIPE_SH = /curl[^|]*\|\s*(sudo\s+)?(bash|sh)/i;
const RM_RF_ROOT = /\brm\s+-rf\s+\/(\s|$)/;
const MISSING_SHEBANG = /^#!/;
const MISSING_SET_E = /\bset\s+-[a-z]*e/;

export function lintScript(content: string, catalog: VariableDef[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split(/\r?\n/);

  if (!MISSING_SHEBANG.test(lines[0] ?? "")) {
    issues.push({ severity: "warn", code: "no-shebang", message: "Script sem shebang (#!/usr/bin/env bash) na primeira linha." });
  }
  if (!MISSING_SET_E.test(content)) {
    issues.push({ severity: "info", code: "no-set-e", message: "Considere usar `set -euo pipefail` para falhar cedo." });
  }

  lines.forEach((ln, i) => {
    const n = i + 1;
    if (HARDCODED_PWD.test(ln)) {
      issues.push({ severity: "error", code: "hardcoded-password", message: "Possível senha em texto puro — use uma variável da OM.", line: n });
    }
    if (SUDO_NOPASSWD.test(ln)) {
      issues.push({ severity: "error", code: "sudo-nopasswd", message: "Concessão de NOPASSWD:ALL é proibida pela política institucional.", line: n });
    }
    if (CURL_PIPE_SH.test(ln)) {
      issues.push({ severity: "warn", code: "curl-pipe-sh", message: "Evite `curl … | bash`; baixe, valide o checksum e execute.", line: n });
    }
    if (RM_RF_ROOT.test(ln)) {
      issues.push({ severity: "error", code: "rm-rf-root", message: "`rm -rf /` detectado — bloqueado.", line: n });
    }
  });

  const used = extractUsedVars(content);
  const known = new Set(catalog.map((v) => v.key));
  used
    .filter((k) => !known.has(k))
    .forEach((k) =>
      issues.push({
        severity: "warn",
        code: "var-not-cataloged",
        message: `Variável \`${k}\` não está no catálogo — cadastre em Variáveis.`,
      }),
    );

  return issues;
}

export function lintSummary(issues: LintIssue[]) {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warns: issues.filter((i) => i.severity === "warn").length,
    infos: issues.filter((i) => i.severity === "info").length,
  };
}
