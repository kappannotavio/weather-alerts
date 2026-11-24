/**
 * bufr.test.js
 * Testes do decodificador BUFR e da leitura da mensagem SYNOP, com uma
 * mensagem real da estação A833 (Santiago/RS) baixada do WIS2:
 * 16/11/2026, 18h UTC. Os valores esperados conferem com a tabela de
 * dados da estação no site do INMET (tempo.inmet.gov.br/TabelaEstacoes/A833).
 * Também cobre o índice de calor (sensação térmica).
 * Executar com: npm test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BufrDecoder, BufrDecodeError } from '../src/data/bufr/BufrDecoder.js';
import { extractSynopObservation } from '../src/data/bufr/synopObservation.js';
import { computeHeatIndex } from '../src/utils/heatIndex.js';

const fixture = () => new Uint8Array(readFileSync(new URL('./fixtures/a833-20261116T180000.bufr4', import.meta.url)));

test('BufrDecoder lê cabeçalho e valores da mensagem real da A833', () => {
  const { header, subsets } = new BufrDecoder().decode(fixture());
  assert.equal(header.edition, 4);
  assert.equal(header.centre, 43); // centro emissor: Brasília (INMET)
  assert.deepEqual(header.descriptors, ['301150', '307091']);
  assert.equal(subsets.length, 1);
  const value = (descriptor) => subsets[0].find((item) => item.descriptor === descriptor)?.value;
  assert.equal(value('001015'), 'SANTIAGO');
  assert.equal(value('001128'), '4317400000000441');
  assert.equal(value('012101'), 306.35); // 33,2 °C em Kelvin
  assert.equal(value('005001'), -29.19167);
});

test('extractSynopObservation converte unidades e acha os valores da última hora', () => {
  const { subsets } = new BufrDecoder().decode(fixture());
  const observation = extractSynopObservation(subsets[0]);
  assert.deepEqual(observation, {
    wigosId: '0-76-0-4317400000000441',
    observedAt: '2026-11-16T18:00:00.000Z',
    temperature: 33.2,
    dewPoint: 20,
    humidity: 46,
    pressure: 958.7,
    maxTemperature: 33.2,
    minTemperature: 31.1,
    precipitation: 0,
  });
});

test('BufrDecoder recusa arquivo que não é BUFR e mensagem truncada', () => {
  const decoder = new BufrDecoder();
  assert.throws(() => decoder.decode(new TextEncoder().encode('<Error>NoSuchKey</Error>')), BufrDecodeError);
  assert.throws(() => decoder.decode(fixture().subarray(0, 120)), BufrDecodeError);
});

test('BufrDecoder recusa descritor fora das tabelas', () => {
  const decoder = new BufrDecoder({ tableB: {}, tableD: {} });
  assert.throws(() => decoder.decode(fixture()), BufrDecodeError);
});

test('índice de calor: confere com a tabela da NOAA e fica perto da temperatura em dia ameno', () => {
  // Tabela NOAA: 90 °F (32,2 °C) com 50% de umidade -> 95 °F (35 °C)
  assert.ok(Math.abs(computeHeatIndex(32.2, 50) - 35) < 0.6);
  // 33,2 °C e 46% (medição real da A833) -> sensação acima da temperatura
  assert.ok(computeHeatIndex(33.2, 46) > 33.2);
  // Dia ameno: sensação próxima da temperatura
  assert.ok(Math.abs(computeHeatIndex(20, 60) - 20) < 1);
  assert.equal(computeHeatIndex(null, 50), null);
});
