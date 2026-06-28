// =============================================================================
// Seed Catalog Script - SeederLinux v3.0
// Popula a tabela variable_definitions com o catálogo oficial (Documento 06)
// Uso: npx tsx backend/src/scripts/seed-catalog.ts
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { VARIABLE_CATALOG } from '../seed/variable-catalog';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding variable catalog (variable_definitions)...');
  console.log(`📋 Total entries to seed: ${VARIABLE_CATALOG.length}`);

  let created = 0;
  let updated = 0;

  for (const def of VARIABLE_CATALOG) {
    const existing = await prisma.variableDefinition.findUnique({
      where: { key: def.key },
    });

    await prisma.variableDefinition.upsert({
      where: { key: def.key },
      update: {
        label: def.label,
        category: def.category,
        description: def.description,
        type: def.type,
        required: def.required,
        editable: def.editable,
        oficial: def.oficial,
        defaultValue: def.defaultValue,
        exemplo: def.exemplo ?? null,
        validation: def.validation ?? null,
        coreModule: def.coreModule ?? null,
      },
      create: {
        key: def.key,
        label: def.label,
        category: def.category,
        description: def.description,
        type: def.type,
        required: def.required,
        editable: def.editable,
        oficial: def.oficial,
        defaultValue: def.defaultValue,
        exemplo: def.exemplo ?? null,
        validation: def.validation ?? null,
        coreModule: def.coreModule ?? null,
      },
    });

    if (existing) {
      updated += 1;
      console.log(`  ↻ ${def.key.padEnd(28)} (${def.category})`);
    } else {
      created += 1;
      console.log(`  ✓ ${def.key.padEnd(28)} (${def.category})`);
    }
  }

  console.log('');
  console.log(`✅ Catalog seeded: ${created} created, ${updated} updated.`);
}

main()
  .catch((err) => {
    console.error('❌ Catalog seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
