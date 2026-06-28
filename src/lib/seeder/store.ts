// SeederLinux v3.0 — Helpers de geração de arquivos a partir da Organization
// O store em memória foi removido; toda a verdade vem da API (organization_variables).

import type { Organization, SeederScript } from "./types";

/**
 * Gera o conteúdo do arquivo `.conf` da OM (bash source-able).
 * Usa o `config` da Organization (mapa chave→valor) — fonte única de verdade.
 */
export function generateOrgConfBash(org: Organization): string {
  const lines: string[] = [
    "# ============================================================",
    `# /opt/seederlinux/etc/${org.sigla.toLowerCase()}.conf`,
    `# Configuracao da OM ${org.sigla} - gerado por SeederLinux v3.0`,
    `# Data: ${new Date().toISOString()}`,
    `# Serial: ${org.serial}`,
    "# ============================================================",
    "",
    `export ORG="${org.sigla.toLowerCase()}"`,
    `export ORG_SIGLA="${org.sigla}"`,
    `export ORG_NOME="${org.nome}"`,
    `export SERIAL="${org.serial}"`,
    "",
  ];

  const config = org.config ?? {};
  const keys = Object.keys(config).sort();
  for (const k of keys) {
    const v = config[k] ?? "";
    lines.push(`export ${k}="${v}"`);
  }

  return lines.join("\n");
}

/**
 * Renderiza placeholders `{{VAR}}` no conteúdo de um script com os valores
 * da OM (lendo do mapa `config`).
 */
export function renderScriptForOrg(script: SeederScript, org: Organization): string {
  const config = org.config ?? {};
  return script.conteudo.replace(/\{\{\s*([A-Z][A-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return config[key] ?? `{{${key}}}`;
  });
}

/**
 * Diagnóstico: variáveis exigidas pelos scripts vs. valores definidos na OM.
 * Retorna a lista de chaves que faltam ou estão vazias.
 */
export function diagnoseOrgCoverage(org: Organization, scripts: SeederScript[]) {
  const required = new Set<string>();
  for (const s of scripts) {
    for (const v of s.variaveisUsadas ?? []) required.add(v);
  }
  const config = org.config ?? {};
  const missing = [...required].filter((k) => !config[k] || config[k].trim() === "");
  return { required: [...required], missing };
}
