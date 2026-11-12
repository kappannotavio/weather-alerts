/**
 * history.test.js
 * Testes do histórico dos últimos dias: conversão da resposta da API
 * (DailyClimate), classificação de cada dia e cache no localStorage
 * (ClimateHistoryService + DailyHistoryRepository), com fetch simulado.
 * Executar com: npm test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserStorage } from '../src/data/BrowserStorage.js';
import { DailyHistoryRepository } from '../src/data/repositories/DailyHistoryRepository.js';
import { ClimateHistoryService } from '../src/services/ClimateHistoryService.js';
import { RiskClassifier } from '../src/services/RiskClassifier.js';
import { DailyClimate } from '../src/models/DailyClimate.js';
import { Location } from '../src/models/Location.js';
import { RISK_LEVELS } from '../src/catalog/riskLevels.js';
import { ExternalServiceError } from '../src/utils/errors.js';

/** localStorage simulado (mesma interface da Web Storage API). */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const santiago = () => new Location({ name: 'Santiago, Rio Grande do Sul', latitude: -29.1917, longitude: -54.8672 });

// Trecho real da resposta de /v1/forecast?past_days=... (3 dias)
const apiResponse = () => ({
  daily: {
    time: ['2026-11-09', '2026-11-10', '2026-11-11'],
    weather_code: [2, 3, 53],
    temperature_2m_max: [23.9, 26.4, 26.7],
    temperature_2m_min: [9.7, 13.9, 17.1],
    apparent_temperature_max: [22.8, 26.9, 27.6],
    relative_humidity_2m_min: [45, 47, 55],
    precipitation_sum: [0, 0, 2.2],
    wind_speed_10m_max: [20.5, 20.9, 20.5],
    uv_index_max: [9.15, 9.15, 7.8],
  },
});

/** fetch simulado que conta as chamadas e guarda a última URL. */
function fakeFetch(body = apiResponse(), ok = true) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    return { ok, status: ok ? 200 : 503, json: async () => body };
  };
  return { fetch, calls };
}

test('DailyClimate converte a resposta da API do dia mais recente para o mais antigo', () => {
  const days = DailyClimate.listFromApiResponse(apiResponse(), santiago());
  assert.deepEqual(days.map((day) => day.date), ['2026-11-11', '2026-11-10', '2026-11-09']);
  assert.equal(days[0].locationId, '-29.19_-54.87');
  assert.equal(days[0].precipitation, 2.2);
  assert.equal(days[0].getEvaluatedTemperature(), 27.6);
  assert.equal(days[0].getEvaluatedHumidity(), 55);
  assert.throws(() => DailyClimate.listFromApiResponse({}, santiago()));
});

test('DailyClimate descarta dias sem temperatura e sem umidade', () => {
  const json = apiResponse();
  json.daily.temperature_2m_max[1] = null;
  json.daily.relative_humidity_2m_min[1] = null;
  assert.equal(DailyClimate.listFromApiResponse(json, santiago()).length, 2);
});

test('ClimateHistoryService pede só dias passados e reaproveita o cache', async () => {
  const { fetch, calls } = fakeFetch();
  const service = new ClimateHistoryService(new DailyHistoryRepository(new BrowserStorage(new MemoryStorage())), fetch);
  const now = new Date('2026-11-12T10:00:00Z');

  const first = await service.getRecentDays(santiago(), { now });
  assert.equal(first.days.length, 3);
  const params = new URL(calls[0]).searchParams;
  assert.equal(params.get('past_days'), '10');
  assert.equal(params.get('forecast_days'), '0');

  // Dentro do tempo de cache: não chama a API de novo
  await service.getRecentDays(santiago(), { now: new Date('2026-11-12T10:30:00Z') });
  assert.equal(calls.length, 1);
  // Cache vencido ou atualização forçada: chama a API
  await service.getRecentDays(santiago(), { now: new Date('2026-11-12T12:00:00Z') });
  await service.getRecentDays(santiago(), { now: new Date('2026-11-12T12:01:00Z'), forceRefresh: true });
  assert.equal(calls.length, 3);
});

test('ClimateHistoryService grava o nível de risco de cada dia', async () => {
  const json = apiResponse();
  json.daily.relative_humidity_2m_min[0] = 10; // ar muito seco em 09/11
  const repository = new DailyHistoryRepository(new BrowserStorage(new MemoryStorage()));
  const service = new ClimateHistoryService(repository, fakeFetch(json).fetch);
  const classifier = new RiskClassifier(RISK_LEVELS);

  const history = await service.getRecentDays(santiago());
  service.saveClassifications(santiago().id, history, (day) => classifier.classify(day));

  const saved = repository.findByLocation(santiago().id).days;
  assert.ok(saved.every((day) => day.riskLevelId));
  assert.notEqual(saved.find((day) => day.date === '2026-11-09').riskLevelId, 'normal');
});

test('ClimateHistoryService converte erro da API em ExternalServiceError', async () => {
  const service = new ClimateHistoryService(new DailyHistoryRepository(new BrowserStorage(new MemoryStorage())), fakeFetch({}, false).fetch);
  await assert.rejects(service.getRecentDays(santiago()), ExternalServiceError);
});
