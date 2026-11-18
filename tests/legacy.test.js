/**
 * legacy.test.js
 * Testes da limpeza dos dados deixados pelas versões anteriores
 * (Open-Meteo, várias cidades) no localStorage, com armazenamento simulado.
 * Executar com: npm test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserStorage } from '../src/data/BrowserStorage.js';
import { LegacyDataCleaner } from '../src/data/LegacyDataCleaner.js';
import { ClimateCondition } from '../src/models/ClimateCondition.js';

/** localStorage simulado com a interface completa (inclui length e key). */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const STATION_ID = '-29.19_-54.89';
const NS = 'alerta-saude:v1:';

/** Monta um navegador com dados da versão antiga e da versão atual. */
function browserWithOldData() {
  const memory = new MemoryStorage();
  const stationReading = new ClimateCondition({ locationId: STATION_ID, observedAt: '2026-11-18T12:00:00.000Z', temperature: 21.7, humidity: 92 });
  stationReading.markPersisted();
  const set = (key, value) => memory.setItem(NS + key, JSON.stringify(value));
  // Versão antiga (Open-Meteo)
  set('locations', { '-29.19_-54.87': { name: 'Santiago' }, '-5.09_-42.80': { name: 'Teresina' } });
  set('history:-29.19_-54.87', { fetchedAt: '2026-11-12T10:00:00Z', days: [] });
  set('conditions:-29.19_-54.87', [{ id: 'uuid-1', weatherCode: 0, uvIndexMax: 9 }]);
  set('alerts:-5.09_-42.80', [{ id: 'a1' }]);
  set('preferences', { id: 'preferences', currentLocationId: '-5.09_-42.80', notificationsEnabled: true, theme: 'dark' });
  // Leitura antiga que caiu na chave da estação e o alerta gerado por ela
  set(`conditions:${STATION_ID}`, [{ id: 'uuid-2', locationId: STATION_ID, weatherCode: 3 }, stationReading.toRecord()]);
  set(`alerts:${STATION_ID}`, [{ id: 'a2', climateConditionId: 'uuid-2' }, { id: 'a3', climateConditionId: stationReading.id }]);
  // Chave de outro site no mesmo navegador: não pode ser tocada
  memory.setItem('outro-app:token', 'x');
  return memory;
}

test('LegacyDataCleaner apaga cidades, histórico e dados de outras localidades', () => {
  const memory = browserWithOldData();
  new LegacyDataCleaner(new BrowserStorage(memory)).run(STATION_ID);
  assert.deepEqual([...memory.map.keys()].sort(), [
    `${NS}alerts:${STATION_ID}`,
    `${NS}conditions:${STATION_ID}`,
    `${NS}preferences`,
    'outro-app:token',
  ]);
});

test('LegacyDataCleaner mantém só medições da estação e os alertas gerados por elas', () => {
  const memory = browserWithOldData();
  new LegacyDataCleaner(new BrowserStorage(memory)).run(STATION_ID);
  const conditions = JSON.parse(memory.getItem(`${NS}conditions:${STATION_ID}`));
  const alerts = JSON.parse(memory.getItem(`${NS}alerts:${STATION_ID}`));
  assert.deepEqual(conditions.map((record) => record.id), [`${STATION_ID}@2026-11-18T12:00:00.000Z`]);
  assert.deepEqual(alerts.map((record) => record.id), ['a3']);
});

test('LegacyDataCleaner remove a localidade das preferências e preserva tema e notificações', () => {
  const memory = browserWithOldData();
  new LegacyDataCleaner(new BrowserStorage(memory)).run(STATION_ID);
  const preferences = JSON.parse(memory.getItem(`${NS}preferences`));
  assert.equal('currentLocationId' in preferences, false);
  assert.equal(preferences.theme, 'dark');
  assert.equal(preferences.notificationsEnabled, true);
});

test('LegacyDataCleaner não grava nada quando não há dados antigos', () => {
  const memory = browserWithOldData();
  const cleaner = new LegacyDataCleaner(new BrowserStorage(memory));
  cleaner.run(STATION_ID);
  assert.deepEqual(cleaner.run(STATION_ID), []);
});
