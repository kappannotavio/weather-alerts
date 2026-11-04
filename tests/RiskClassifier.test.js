/**
 * RiskClassifier.test.js
 * Testes unitários da regra de classificação de risco e da coerência
 * do catálogo de níveis. Executar com: npm test (node:test, sem dependências).
 * Importa: RiskClassifier, ClimateCondition e o catálogo RISK_LEVELS.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RiskClassifier } from '../src/services/RiskClassifier.js';
import { RiskLevel } from '../src/models/RiskLevel.js';
import { ClimateCondition } from '../src/models/ClimateCondition.js';
import { RISK_LEVELS } from '../src/catalog/riskLevels.js';

const classifier = new RiskClassifier(RISK_LEVELS);

/** Cria uma condição em que atual e previsão têm os mesmos valores. */
const condition = (temperature, humidity) => new ClimateCondition({
  locationId: 'teste', temperature, apparentTemperature: temperature, humidity,
  maxApparentTemperature: temperature, minHumidity: humidity,
});

test('classifica como Normal quando nenhum limite é atingido', () => {
  const result = classifier.classify(condition(25, 60));
  assert.equal(result.riskLevel.name, 'Normal');
  assert.deepEqual(result.triggers, []);
});

test('classifica como Atenção pelo calor (sensação de 32 °C)', () => {
  const result = classifier.classify(condition(32, 60));
  assert.equal(result.riskLevel.name, 'Atenção');
  assert.deepEqual(result.triggers, ['temperature']);
});

test('classifica como Alerta pela baixa umidade (20%)', () => {
  const result = classifier.classify(condition(25, 20));
  assert.equal(result.riskLevel.name, 'Alerta');
  assert.deepEqual(result.triggers, ['humidity']);
});

test('prevalece o nível mais grave entre calor e umidade', () => {
  assert.equal(classifier.classify(condition(33, 10)).riskLevel.name, 'Emergência');
});

test('usa a previsão do dia quando ela é pior que o valor atual', () => {
  const morning = new ClimateCondition({
    locationId: 'teste', temperature: 24, apparentTemperature: 25, humidity: 70,
    maxApparentTemperature: 38, minHumidity: 45,
  });
  assert.equal(classifier.classify(morning).riskLevel.name, 'Alerta');
});

test('não aceita catálogo vazio', () => {
  assert.throws(() => new RiskClassifier([]));
});

test('o catálogo de níveis do código é coerente', () => {
  assert.deepEqual(RiskClassifier.validateScale(RISK_LEVELS), {});
});

test('detecta escala com temperatura fora de ordem', () => {
  const broken = RISK_LEVELS.map((level) => new RiskLevel({ ...level, minTemperature: level.id === 'alerta' ? 30 : level.minTemperature }));
  assert.ok(RiskClassifier.validateScale(broken).alerta);
});
