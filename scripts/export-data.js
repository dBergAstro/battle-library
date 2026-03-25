/**
 * Скрипт экспорта всех данных из PostgreSQL в JSON файлы
 * Запуск: node scripts/export-data.js
 * Результат: файлы в папке exports/
 */

import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, '..', 'exports');

mkdirSync(EXPORTS_DIR, { recursive: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

function save(filename, data) {
  const path = join(EXPORTS_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ ${filename} — ${data.length} записей`);
}

async function main() {
  console.log('Экспорт данных из PostgreSQL...\n');

  // boss_list.json — все бои (без устаревших id <= 226)
  const bossList = await query(`
    SELECT game_id, label, "desc", hero_id 
    FROM boss_list 
    WHERE game_id > 226 AND defenders_fragments IS NULL
    ORDER BY game_id
  `);
  save('boss_list.json', bossList);

  // boss_list_full.json — все записи включая replay-боссов
  const bossListFull = await query(`
    SELECT game_id, label, "desc", hero_id, 
           CASE WHEN defenders_fragments IS NOT NULL THEN true ELSE false END as has_replay
    FROM boss_list WHERE game_id > 226 ORDER BY game_id
  `);
  save('boss_list_full.json', bossListFull);

  // boss_team.json
  const bossTeam = await query(`
    SELECT boss_game_id, hero_id, unit_id, boss_level_id 
    FROM boss_team ORDER BY boss_game_id, id
  `);
  save('boss_team.json', bossTeam);

  // boss_level.json
  const bossLevel = await query(`
    SELECT game_id, boss_id, power_level 
    FROM boss_level ORDER BY boss_id, game_id
  `);
  save('boss_level.json', bossLevel);

  // attack_teams.json — записи (replays), без base64 данных
  const attackTeams = await query(`
    SELECT game_id, invasion_id, boss_id, boss_level, chapter, level, 
           enemy_type, main_buff, comment, defenders_fragments
    FROM attack_teams ORDER BY chapter, level, game_id
  `);
  // Парсим defenders_fragments из строки в объект
  const attackTeamsParsed = attackTeams.map(r => ({
    ...r,
    defenders_fragments: r.defenders_fragments ? JSON.parse(r.defenders_fragments) : null
  }));
  save('attack_teams.json', attackTeamsParsed);

  // tags.json
  const tags = await query(`
    SELECT battle_game_id, tag FROM battle_tags ORDER BY battle_game_id
  `);
  save('tags.json', tags);

  // character_names.json — все имена (DB + встроенные из hero_names)
  const heroNames = await query(`
    SELECT hero_id, name FROM hero_names ORDER BY hero_id
  `);
  save('character_names.json', heroNames);

  // titan_elements.json
  const titanElements = await query(`
    SELECT titan_id, element, points FROM titan_elements ORDER BY titan_id
  `);
  save('titan_elements.json', titanElements);

  // sort_order.json
  const sortOrder = await query(`
    SELECT hero_id, sort_order FROM hero_sort_order ORDER BY sort_order
  `);
  save('sort_order.json', sortOrder);

  // spirit_skills.json — скилы тотемов
  const spiritSkills = await query(`
    SELECT skill_id, name FROM spirit_skills ORDER BY skill_id
  `);
  save('spirit_skills.json', spiritSkills);

  // collection.json — коллекция (48 слотов)
  const collection = await query(`
    SELECT item_id, item_type, game_id, label, "desc", battle_type,
           raw_defenders_fragments, main_buff, totems_json, boss_hero_id, created_at
    FROM collection_items ORDER BY created_at
  `);
  save('collection.json', collection);

  // app_settings.json
  const settings = await query(`SELECT key, value FROM app_settings`);
  save('app_settings.json', settings);

  // summary.json — статистика
  const summary = {
    exported_at: new Date().toISOString(),
    counts: {
      boss_list: bossList.length,
      boss_team: bossTeam.length,
      boss_level: bossLevel.length,
      attack_teams: attackTeams.length,
      tags: tags.length,
      character_names: heroNames.length,
      titan_elements: titanElements.length,
      sort_order: sortOrder.length,
      spirit_skills: spiritSkills.length,
      collection: collection.length,
    }
  };
  writeFileSync(join(EXPORTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n✓ summary.json');
  console.log('\nЭкспорт завершён! Файлы в папке: exports/');

  await pool.end();
}

main().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
