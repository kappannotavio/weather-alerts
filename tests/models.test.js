/**
 * models.test.js
 * Testes unitários das entidades (Location, Preferences, Alert,
 * ClimateCondition), do catálogo de recomendações e do serviço de
 * recomendações. Executar com: npm test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { Alert } from '../src/models/Alert.js';
import { Location } from '../src/models/Location.js';
import { Preferences } from '../src/models/Preferences.js';
import { ClimateCondition } from '../src/models/ClimateCondition.js';
import { RISK_LEVELS, findRiskLevel } from '../src/catalog/riskLevels.js';
import { RECOMMENDATIONS } from '../src/catalog/recommendations.js';
import { RecommendationService } from '../src/services/RecommendationService.js';

test('Location: id é derivado das coordenadas (mesma cidade, mesma chave)', () => {
  const a = new Location({ name: 'Santiago', latitude: -29.1917, longitude: -54.8672 });
  const b = new Location({ name: 'Santiago, RS', latitude: -29.19, longitude: -54.87 });
  assert.equal(a.id, '-29.19_-54.87');
  assert.equal(a.id, b.id);
});

test('Preferences: seleciona localidade e alterna notificações', () => {
  const preferences = new Preferences();
  preferences.selectLocation(new Location({ latitude: -15.6, longitude: -56.1 }));
  preferences.enableNotifications();
  assert.equal(preferences.currentLocationId, '-15.60_-56.10');
  assert.equal(preferences.toRecord().notificationsEnabled, true);
});

test('Preferences: tema começa seguindo o sistema e só aceita claro ou escuro', () => {
  const preferences = new Preferences();
  assert.equal(preferences.theme, null);
  preferences.setTheme('dark');
  assert.equal(preferences.toRecord().theme, 'dark');
  assert.throws(() => preferences.setTheme('azul'), TypeError);
  // Valor inválido vindo do localStorage é descartado
  assert.equal(new Preferences({ theme: '<script>' }).theme, null);
});

test('Alert: vigência respeita início, expiração e encerramento', () => {
  const now = new Date('2026-11-04T12:00:00Z');
  const alert = new Alert({ startsAt: '2026-11-04T10:00:00Z', expiresAt: '2026-11-04T20:00:00Z' });
  assert.equal(alert.isCurrentlyActive(now), true);
  assert.equal(alert.isCurrentlyActive(new Date('2026-11-05T00:00:00Z')), false);
  alert.deactivate();
  assert.equal(alert.isCurrentlyActive(now), false);
});

test('Alert.createFrom usa a mensagem do nível e expira no fim do dia', () => {
  const location = new Location({ name: 'Cuiabá', latitude: -15.6, longitude: -56.1 });
  const condition = new ClimateCondition({ id: 'c1', locationId: location.id });
  const alert = Alert.createFrom(condition, findRiskLevel('alerta'), location);
  assert.equal(alert.title, 'Alerta em Cuiabá');
  assert.match(alert.message, /Alerta de calor/);
  assert.equal(alert.climateConditionId, 'c1');
  assert.equal(new Date(alert.expiresAt).getHours(), 23);
  assert.equal(alert.wasNotified(), false);
});

test('ClimateCondition.fromApiResponse converte a resposta da Open-Meteo', () => {
  const json = {
    current: { time: '2026-11-04T14:00', temperature_2m: 33.1, relative_humidity_2m: 25, apparent_temperature: 35.2, weather_code: 0 },
    daily: { temperature_2m_max: [36], apparent_temperature_max: [38.4], relative_humidity_2m_min: [18], uv_index_max: [10.2] },
  };
  const location = new Location({ name: 'Cuiabá', latitude: -15.6, longitude: -56.1 });
  const condition = ClimateCondition.fromApiResponse(json, location);
  assert.equal(condition.locationId, location.id);
  assert.equal(condition.getEvaluatedTemperature(), 38.4);
  assert.equal(condition.getEvaluatedHumidity(), 18);
  assert.throws(() => ClimateCondition.fromApiResponse({}, location));
});

test('catálogo: toda recomendação aponta para um nível existente e todo nível tem recomendação geral', () => {
  RECOMMENDATIONS.forEach((item) => assert.ok(findRiskLevel(item.riskLevelId), item.id));
  RISK_LEVELS.forEach((level) => assert.ok(RECOMMENDATIONS.some((item) => item.riskLevelId === level.id && item.isGeneral()), level.id));
});

test('RecommendationService: aba de grupo mostra o grupo e as gerais', () => {
  const service = new RecommendationService();
  const elderly = service.listForRiskLevel('alerta', 'idosos');
  assert.ok(elderly.every((item) => item.targetGroup === 'idosos' || item.isGeneral()));
  assert.equal(elderly[0].targetGroup, 'idosos');
  const all = service.listForRiskLevel('alerta', 'geral');
  assert.equal(all.length, RECOMMENDATIONS.filter((item) => item.riskLevelId === 'alerta').length);
  assert.ok(all[0].isGeneral());
});

test('catálogo: toda recomendação tem ilustração existente em assets/img/care', () => {
  for (const recommendation of RECOMMENDATIONS) {
    assert.ok(recommendation.illustration, `${recommendation.id} sem ilustração`);
    const file = new URL(`../assets/img/care/${recommendation.illustration}.svg`, import.meta.url);
    assert.ok(existsSync(file), `${recommendation.id}: ${recommendation.illustration}.svg não encontrado`);
  }
});
