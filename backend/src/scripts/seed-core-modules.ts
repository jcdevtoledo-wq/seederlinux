// Seed Core Modules — SeederLinux v3.0
// Uso: npx tsx backend/src/scripts/seed-core-modules.ts

import { PrismaClient } from '@prisma/client';
import { CORE_MODULES, validateOrdering } from '../seed/core-modules';

const prisma = new PrismaClient();

async function main() {
  validateOrdering();
  console.log(`🌱 Seeding ${CORE_MODULES.length} core modules...`);

  for (const m of CORE_MODULES) {
    const existing = await prisma.coreModule.findUnique({ where: { code: m.code } });
    await prisma.coreModule.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        description: m.description,
        category: m.category,
        version: m.version,
        executionOrder: m.executionOrder,
        requiredVars: m.requiredVars,
        optionalVars: m.optionalVars,
        dependencies: m.dependencies,
        manifest: m.manifest as any,
        scriptContent: m.scriptContent,
        rollbackScript: m.rollbackScript,
        validationScript: m.validationScript,
        supportedDistros: m.supportedDistros,
      },
      create: {
        code: m.code,
        name: m.name,
        description: m.description,
        category: m.category,
        version: m.version,
        serial: 0,
        executionOrder: m.executionOrder,
        immutable: true,
        enabled: true,
        manifest: m.manifest as any,
        requiredVars: m.requiredVars,
        optionalVars: m.optionalVars,
        dependencies: m.dependencies,
        scriptContent: m.scriptContent,
        rollbackScript: m.rollbackScript,
        validationScript: m.validationScript,
        supportedDistros: m.supportedDistros,
      },
    });
    console.log(`  ${existing ? '↻' : '✓'} [${m.executionOrder.toString().padStart(2, ' ')}] ${m.code.padEnd(22)} ${m.name}`);
  }

  console.log('✅ Core modules seeded.');
}

main()
  .catch((err) => {
    console.error('❌ Core modules seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
