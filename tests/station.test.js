/**
 * station.test.js
 * Testes do StationService (download das horas que faltam no WIS2,
 * decodificação e resumo do dia) e do ClimateHistoryService (resumo
 * diário a partir das medições salvas), com fetch e localStorage simulados.
 * Executar com: npm test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BrowserStorage } from '../src/data/BrowserStorage.js';
import { ClimateConditionRepository } from '../src/data/repositories/ClimateConditionRepository.js';
import { StationService } from '../src/services/StationService.js';
import { ClimateHistoryService } from '../src/services/ClimateHistoryService.js';
import { RiskClassifier } from '../src/services/RiskClassifier.js';
import { ClimateCondition } from '../src/models/ClimateCondition.js';
import { Location } from '../src/models/Location.js';
import { RISK_LEVELS } from '../src/catalog/riskLevels.js';
import { STATION, APP_CONFIG } from '../src/config/constants.js';
import { ExternalServiceError } from '../src/utils/errors.js';

/** localStorage simulado (mesma interface da Web Storage API). */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const fixture = readFileSync(new URL('./fixtures/a833-20261116T180000.bufr4', import.meta.url));
const station = () => new Location(STATION);
const repositoryWith = () => new ClimateConditionRepository(new BrowserStorage(new MemoryStorage()));

/**
 * fetch simulado: só a hora 18h de 16/11 existe (mensagem real);
 * as demais respondem 404, como o espelho do WIS2 faz.
 */
function fakeFetch({ offline = false } = {}) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    if (offline) throw new TypeError('Failed to fetch');
    const found = url.endsWith(`WIGOS_${STATION.wigosId}_20261116T180000.bufr4`);
    return {
      ok: found,
      status: found ? 200 : 404,
      arrayBuffer: async () => fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength),
    };
  };
  return { fetch, calls };
}

const now = new Date('2026-11-16T18:40:00Z');

test('StationService baixa a janela de horas, grava a medição e calcula a sensação', async () => {
  const { fetch, calls } = fakeFetch();
  const service = new StationService(repositoryWith(), { httpClient: fetch });
  const condition = await service.getCurrentCondition(station(), { now });

  assert.equal(calls.length, APP_CONFIG.READINGS_LOOKBACK_HOURS + 1);
  assert.match(calls[0], /WIGOS_0-76-0-4317400000000441_20261116T180000\.bufr4$/);
  assert.equal(condition.observedAt, '2026-11-16T18:00:00.000Z');
  assert.equal(condition.temperature, 33.2);
  assert.equal(condition.humidity, 46);
  assert.ok(condition.apparentTemperature > 33.2); // índice de calor
  assert.equal(condition.maxTemperature, 33.2);
  assert.equal(condition.dailyPrecipitation, 0);
});

test('StationService não baixa de novo as horas já salvas no navegador', async () => {
  const repository = repositoryWith();
  const first = fakeFetch();
  await new StationService(repository, { httpClient: first.fetch }).syncReadings(station(), { now });
  const second = fakeFetch();
  await new StationService(repository, { httpClient: second.fetch }).syncReadings(station(), { now });
  assert.equal(second.calls.length, first.calls.length - 1);
  assert.ok(second.calls.every((url) => !url.includes('20261116T180000')));
});

test('StationService classifica as medições baixadas que ainda não têm nível', async () => {
  const repository = repositoryWith();
  const service = new StationService(repository, { httpClient: fakeFetch().fetch });
  await service.syncReadings(station(), { now });
  const classifier = new RiskClassifier(RISK_LEVELS);
  assert.equal(service.classifyPendingReadings(station().id, (reading) => classifier.classify(reading)).length, 1);
  assert.ok(repository.findByLocation(station().id).every((reading) => reading.riskLevelId));
  assert.equal(service.classifyPendingReadings(station().id, (reading) => classifier.classify(reading)).length, 0);
});

test('StationService ignora arquivo de outra estação', async () => {
  const other = new Location({ ...STATION, wigosId: '0-76-0-9999999999999999' });
  const fetchOther = async () => ({ ok: true, status: 200, arrayBuffer: async () => fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength) });
  const service = new StationService(repositoryWith(), { httpClient: fetchOther });
  await assert.rejects(service.getCurrentCondition(other, { now }), ExternalServiceError);
});

test('StationService sem internet e sem dados salvos lança ExternalServiceError', async () => {
  const service = new StationService(repositoryWith(), { httpClient: fakeFetch({ offline: true }).fetch });
  await assert.rejects(service.getCurrentCondition(station(), { now }), ExternalServiceError);
});

test('resumo do dia acumula máxima, menor umidade e chuva só dentro do dia local', () => {
  const location = station();
  const reading = (observedAt, temperature, humidity, precipitation) => new ClimateCondition({
    locationId: location.id, observedAt, temperature, humidity, precipitation, apparentTemperature: temperature,
  });
  const readings = [
    reading('2026-11-16T02:00:00.000Z', 30, 40, 1.0), // 15/11 23h em Santiago (dia anterior)
    reading('2026-11-16T03:00:00.000Z', 20, 90, 0.4), // 16/11 0h local
    reading('2026-11-16T15:00:00.000Z', 31, 35, 0.0),
    reading('2026-11-16T12:00:00.000Z', 27, 50, 0.2),
  ];
  StationService.applyDailySummaries(readings, location);
  const at = (iso) => readings.find((item) => item.observedAt === iso);
  assert.equal(at('2026-11-16T15:00:00.000Z').maxTemperature, 31);
  assert.equal(at('2026-11-16T15:00:00.000Z').minHumidity, 35);
  assert.equal(at('2026-11-16T15:00:00.000Z').dailyPrecipitation, 0.6);
  assert.equal(at('2026-11-16T12:00:00.000Z').maxTemperature, 27); // só considera horas anteriores
  assert.equal(at('2026-11-16T03:00:00.000Z').dailyPrecipitation, 0.4); // 23h do dia anterior não entra
});

test('ClimateHistoryService resume os dias encerrados e o classificador avalia cada um', () => {
  const location = station();
  const repository = repositoryWith();
  const reading = (observedAt, temperature, humidity) => new ClimateCondition({
    locationId: location.id, observedAt, temperature, humidity, apparentTemperature: temperature, precipitation: 0.5,
  });
  repository.saveAll(location.id, [
    reading('2026-11-14T18:00:00.000Z', 38, 30), // 14/11
    reading('2026-11-14T09:00:00.000Z', 18, 85),
    reading('2026-11-15T18:00:00.000Z', 25, 60), // 15/11
    reading('2026-11-16T15:00:00.000Z', 30, 45), // hoje (16/11): fora do histórico
  ]);
  const history = new ClimateHistoryService(repository).getRecentDays(location, { now });
  assert.deepEqual(history.days.map((day) => day.date), ['2026-11-15', '2026-11-14']);
  const nov14 = history.days[1];
  assert.equal(nov14.maxTemperature, 38);
  assert.equal(nov14.minTemperature, 18);
  assert.equal(nov14.minHumidity, 30);
  assert.equal(nov14.precipitation, 1);
  assert.equal(nov14.readingsCount, 2);
  assert.equal(history.readingsCount, 4);
  assert.equal(new RiskClassifier(RISK_LEVELS).classify(nov14).riskLevel.id, 'alerta');
});
