/**
 * storage.test.js
 * Testes da persistência no navegador (BrowserStorage + repositórios)
 * e do AlertService, usando um localStorage simulado em memória.
 * Executar com: npm test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserStorage } from '../src/data/BrowserStorage.js';
import { PreferencesRepository } from '../src/data/repositories/PreferencesRepository.js';
import { ClimateConditionRepository } from '../src/data/repositories/ClimateConditionRepository.js';
import { AlertRepository } from '../src/data/repositories/AlertRepository.js';
import { PreferencesService } from '../src/services/PreferencesService.js';
import { AlertService } from '../src/services/AlertService.js';
import { Location } from '../src/models/Location.js';
import { ClimateCondition } from '../src/models/ClimateCondition.js';
import { findRiskLevel } from '../src/catalog/riskLevels.js';
import { APP_CONFIG } from '../src/config/constants.js';
import { StorageError } from '../src/utils/errors.js';

/** localStorage simulado (mesma interface da Web Storage API). */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const santiago = () => new Location({ name: 'Santiago, Rio Grande do Sul', latitude: -29.1917, longitude: -54.8672 });

test('BrowserStorage grava JSON com namespace e devolve fallback para dado corrompido', () => {
  const memory = new MemoryStorage();
  const storage = new BrowserStorage(memory);
  storage.write('preferences', { a: 1 });
  assert.equal(memory.getItem('alerta-saude:v1:preferences'), '{"a":1}');
  memory.setItem('alerta-saude:v1:locations', '{quebrado');
  assert.deepEqual(storage.read('locations', {}), {});
});

test('BrowserStorage converte falha de gravação em StorageError', () => {
  const blocked = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
  assert.throws(() => new BrowserStorage(blocked).write('x', 1), StorageError);
});

test('PreferencesService: tema escolhido fica gravado no localStorage', () => {
  const memory = new MemoryStorage();
  const storage = new BrowserStorage(memory);
  const service = new PreferencesService(new PreferencesRepository(storage));
  service.setTheme('dark');
  assert.equal(JSON.parse(memory.getItem('alerta-saude:v1:preferences')).theme, 'dark');
  assert.equal(service.getPreferences().theme, 'dark');
});

test('ClimateConditionRepository guarda medições por localidade, ordena pela hora e respeita o limite', () => {
  const repository = new ClimateConditionRepository(new BrowserStorage(new MemoryStorage()));
  const location = santiago();
  // Uma medição por hora, gravadas fora de ordem e em lote
  const conditions = [];
  for (let i = 0; i < APP_CONFIG.MAX_CONDITIONS_PER_LOCATION + 5; i++) {
    const observedAt = new Date(Date.UTC(2026, 10, 1, i)).toISOString();
    conditions.push(new ClimateCondition({ locationId: location.id, observedAt, temperature: 20 + i, humidity: 50 }));
  }
  repository.saveAll(location.id, conditions.reverse());
  // Mesma hora gravada de novo substitui em vez de duplicar
  repository.save(new ClimateCondition({ ...conditions[0].toRecord(), temperature: 99 }));
  repository.save(new ClimateCondition({ locationId: 'outra', observedAt: '2026-11-01T00:00:00.000Z', temperature: 30, humidity: 40 }));
  assert.equal(repository.findByLocation(location.id).length, APP_CONFIG.MAX_CONDITIONS_PER_LOCATION);
  assert.equal(repository.findLatestByLocation(location.id).temperature, 99);
  assert.equal(repository.findByLocation('outra').length, 1);
});

test('AlertService mantém um único alerta vigente e encerra quando volta a Normal', () => {
  const service = new AlertService(new AlertRepository(new BrowserStorage(new MemoryStorage())));
  const location = santiago();
  const condition = new ClimateCondition({ id: 'c1', locationId: location.id });

  const first = service.syncAutomaticAlert(condition, findRiskLevel('alerta'), location);
  const again = service.syncAutomaticAlert(condition, findRiskLevel('alerta'), location);
  assert.equal(first.id, again.id);
  assert.equal(service.listCurrentAlerts(location.id).length, 1);

  service.syncAutomaticAlert(condition, findRiskLevel('emergencia'), location);
  const current = service.listCurrentAlerts(location.id);
  assert.equal(current.length, 1);
  assert.equal(current[0].riskLevelId, 'emergencia');

  assert.equal(service.syncAutomaticAlert(condition, findRiskLevel('normal'), location), null);
  assert.equal(service.listCurrentAlerts(location.id).length, 0);
});
