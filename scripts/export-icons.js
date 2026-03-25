/**
 * Скрипт экспорта иконок персонажей из БД в файловую систему
 * Запуск: node scripts/export-icons.js
 * Результат: файлы в exports/icons/{heroes,titans,krips,pets,spirits}/
 * 
 * Имена файлов = ID персонажа (например: 26.png, 4001.png)
 * Для Google Drive: загрузить содержимое папок в соответствующие Drive-папки
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '..', 'exports', 'icons');

// Создаём папки
const dirs = ['heroes', 'titans', 'krips', 'pets', 'spirits'];
dirs.forEach(d => mkdirSync(join(ICONS_DIR, d), { recursive: true }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function base64ToBuffer(iconUrl) {
  // iconUrl = "data:image/png;base64,<data>" или просто base64
  const match = iconUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { ext: match[1].split('/')[1] || 'png', buffer: Buffer.from(match[2], 'base64') };
  }
  // Если просто base64 без префикса
  return { ext: 'png', buffer: Buffer.from(iconUrl, 'base64') };
}

async function main() {
  const { rows: heroIconsData } = await pool.query(`
    SELECT hero_id, icon_url, category FROM hero_icons ORDER BY hero_id
  `);
  const { rows: petIconsData } = await pool.query(`
    SELECT pet_id, icon_url FROM pet_icons ORDER BY pet_id
  `);
  const { rows: spiritIconsData } = await pool.query(`
    SELECT skill_id, icon_url FROM spirit_icons ORDER BY skill_id
  `);

  console.log(`Экспорт иконок персонажей (${heroIconsData.length} шт.)...`);
  let saved = 0;
  for (const row of heroIconsData) {
    try {
      const { ext, buffer } = base64ToBuffer(row.icon_url);

      // Определяем папку по category или по диапазону hero_id
      let folder;
      if (row.category === 'titan' || (row.hero_id >= 4000 && row.hero_id <= 5999)) {
        folder = 'titans';
      } else if (row.category === 'krip' || (row.hero_id >= 1000 && row.hero_id <= 3999)) {
        folder = 'krips';
      } else {
        folder = 'heroes';
      }

      const filename = `${row.hero_id}.${ext}`;
      writeFileSync(join(ICONS_DIR, folder, filename), buffer);
      saved++;
    } catch (e) {
      console.warn(`  Пропуск hero_id=${row.hero_id}: ${e.message}`);
    }
  }
  console.log(`✓ Персонажи: ${saved} иконок → exports/icons/{heroes,titans,krips}/`);

  console.log(`\nЭкспорт иконок питомцев (${petIconsData.length} шт.)...`);
  saved = 0;
  for (const row of petIconsData) {
    try {
      const { ext, buffer } = base64ToBuffer(row.icon_url);
      writeFileSync(join(ICONS_DIR, 'pets', `${row.pet_id}.${ext}`), buffer);
      saved++;
    } catch (e) {
      console.warn(`  Пропуск pet_id=${row.pet_id}: ${e.message}`);
    }
  }
  console.log(`✓ Питомцы: ${saved} иконок → exports/icons/pets/`);

  console.log(`\nЭкспорт иконок скилов тотемов (${spiritIconsData.length} шт.)...`);
  saved = 0;
  for (const row of spiritIconsData) {
    try {
      const { ext, buffer } = base64ToBuffer(row.icon_url);
      writeFileSync(join(ICONS_DIR, 'spirits', `${row.skill_id}.${ext}`), buffer);
      saved++;
    } catch (e) {
      console.warn(`  Пропуск skill_id=${row.skill_id}: ${e.message}`);
    }
  }
  console.log(`✓ Тотемы: ${saved} иконок → exports/icons/spirits/`);

  console.log('\nСтруктура экспортированных иконок:');
  console.log('exports/icons/');
  console.log('  heroes/    ← герои (ID 1-999): 26.png, 34.png...');
  console.log('  titans/    ← титаны (ID 4000-4999): 4001.png, 4003.png...');
  console.log('  krips/     ← крипы (ID 1000-3999): 1001.png...');
  console.log('  pets/      ← питомцы (ID 6000-6999): 6005.png...');
  console.log('  spirits/   ← скилы тотемов: 3001.png...');
  console.log('\nГотово! Загрузите в Google Drive, сохранив структуру папок.');

  await pool.end();
}

main().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
