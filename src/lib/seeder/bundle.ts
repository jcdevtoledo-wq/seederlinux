import JSZip from "jszip";
import type { Organization, SeederScript } from "./types";
import { generateOrgConfBash, renderScriptForOrg } from "./store";

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const README = (org: Organization, scripts: SeederScript[]) => `# Bundle SeederLinux — ${org.sigla}

Gerado em ${new Date().toISOString()}

## Organização
- Sigla: ${org.sigla}
- Domínio: ${org.dominio}
- DC: ${org.dcHostname} (${org.dcIp})
- Método AD: ${org.metodoAd}
- Serial: ${org.serial}

## Modelo de execução

Os scripts são **bases oficiais imutáveis**. Todos fazem \`source\` do arquivo
\`/opt/softwarelivre/etc/${org.sigla.toLowerCase()}.conf\` para carregar as variáveis
desta OM. Para alterar comportamento, edite as variáveis — não os scripts.

## Verificação de integridade

O arquivo \`manifest.json\` contém o SHA-256 de cada script incluído.
Para auditar:

\`\`\`bash
cd /opt/softwarelivre
sha256sum bin/*.sh user/*.sh lib/*.sh 2>/dev/null
\`\`\`

## Estrutura
\`\`\`
softwarelivre/
├── etc/${org.sigla.toLowerCase()}.conf   # variáveis da OM
├── etc/versao.conf            # serial global
├── bin/                       # scripts orquestradores (root)
├── lib/                       # bibliotecas auxiliares
├── user/                      # scripts de sessão
├── manifest.json              # inventário + checksums
└── README.md
\`\`\`

## Instalação
\`\`\`bash
sudo tar -xzf ${org.sigla.toLowerCase()}_seeder.tar.gz -C /opt/
sudo chmod -R 755 /opt/softwarelivre/bin /opt/softwarelivre/user
sudo /opt/softwarelivre/bin/ingressar_dominio.sh
\`\`\`

## Scripts incluídos (${scripts.length})
${scripts
  .map(
    (s) =>
      `- **${s.nome}** \`v${s.versao}\` · ${s.categoria} — ${s.descricao}\n  vars: ${
        s.variaveisUsadas.join(", ") || "—"
      }`,
  )
  .join("\n")}
`;

function folderForScript(s: SeederScript): string {
  switch (s.localExecucao) {
    case "usuario":
    case "login":
    case "logoff":
      return "user";
    default:
      return s.categoria === "ingresso" || s.categoria === "atualizacao" ? "bin" : "lib";
  }
}

export interface BundleManifest {
  bundleVersion: "1.0";
  geradoEm: string;
  organizacao: { id: string; sigla: string; serial: number };
  totalScripts: number;
  scripts: Array<{
    nome: string;
    caminho: string;
    categoria: string;
    versao: string;
    sha256: string;
    variaveisUsadas: string[];
    autor: string;
  }>;
}

export async function buildBundle(
  org: Organization,
  scripts: SeederScript[],
  variables?: import("./types").VariableDef[],
): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder("softwarelivre")!;

  root.file(`etc/${org.sigla.toLowerCase()}.conf`, generateOrgConfBash(org, variables));
  root.file("etc/versao.conf", `SERIAL_GLOBAL=${org.serial}\nSIGLA=${org.sigla}\n`);

  const manifestScripts: BundleManifest["scripts"] = [];
  for (const s of scripts) {
    const folder = folderForScript(s);
    const caminho = `${folder}/${s.nome}`;
    const conteudo = renderScriptForOrg(s, org);
    root.file(caminho, conteudo);
    manifestScripts.push({
      nome: s.nome,
      caminho,
      categoria: s.categoria,
      versao: s.versao,
      sha256: await sha256(conteudo),
      variaveisUsadas: s.variaveisUsadas,
      autor: s.autor,
    });
  }

  const manifest: BundleManifest = {
    bundleVersion: "1.0",
    geradoEm: new Date().toISOString(),
    organizacao: { id: org.id, sigla: org.sigla, serial: org.serial },
    totalScripts: scripts.length,
    scripts: manifestScripts,
  };

  root.file("manifest.json", JSON.stringify(manifest, null, 2));
  root.file("README.md", README(org, scripts));

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
