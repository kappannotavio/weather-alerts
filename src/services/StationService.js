/**
 * StationService.js
 * Obtém as medições horárias da estação automática do INMET (A833,
 * Santiago/RS) publicadas no WIS2, o sistema de troca de dados da OMM.
 * Fluxo: monta a URL do arquivo de cada hora -> baixa só as horas que
 * ainda não estão no localStorage -> decodifica o BUFR -> converte em
 * ClimateCondition -> recalcula o resumo do dia local -> grava.
 * Fonte: espelho público do WIS2 no AWS (APP_CONFIG.WIS2_SYNOP_URL),
 * sem chave de acesso e com leitura liberada para o navegador (CORS).
 * Importa: APP_CONFIG, ClimateCondition, BufrDecoder, extractSynopObservation,
 * fetchBytes e ExternalServiceError.
 */
import { APP_CONFIG } from '../config/constants.js';
import { ClimateCondition } from '../models/ClimateCondition.js';
import { BufrDecoder } from '../data/bufr/BufrDecoder.js';
import { extractSynopObservation } from '../data/bufr/synopObservation.js';
import { fetchBytes } from '../utils/http.js';
import { ExternalServiceError } from '../utils/errors.js';

const HOUR_MS = 3600000;
const SERVICE_NAME = 'estação meteorológica';

/** Maior valor numérico entre o atual e os novos (ignora null). */
function maxOf(current, ...values) {
  return values.reduce((acc, value) => (typeof value === 'number' && (acc === null || value > acc) ? value : acc), current);
}

/** Hora UTC no formato dos nomes de arquivo do WIS2: "20261116T180000". */
function toWis2Stamp(date) {
  return date.toISOString().slice(0, 13).replace(/-/g, '') + '0000';
}

export class StationService {
  /**
   * @param {import('../data/repositories/ClimateConditionRepository.js').ClimateConditionRepository} conditionRepository
   * @param {{httpClient?: typeof fetch, decoder?: BufrDecoder, baseUrl?: string}} options - injetáveis para testes
   */
  constructor(conditionRepository, {
    httpClient = globalThis.fetch?.bind(globalThis),
    decoder = new BufrDecoder(),
    baseUrl = APP_CONFIG.WIS2_SYNOP_URL,
  } = {}) {
    this.conditionRepository = conditionRepository;
    this.httpClient = httpClient;
    this.decoder = decoder;
    this.baseUrl = baseUrl;
  }

  /**
   * Atualiza as medições salvas e retorna a mais recente.
   * @param {import('../models/Location.js').Location} location - estação monitorada
   * @param {{now?: Date}} options - data de referência (facilita testes)
   * @returns {Promise<ClimateCondition>}
   */
  async getCurrentCondition(location, { now = new Date() } = {}) {
    await this.syncReadings(location, { now });
    const latest = this.conditionRepository.findLatestByLocation(location.id);
    if (!latest) {
      throw new ExternalServiceError(`Nenhuma medição recente da estação ${location.stationCode} está disponível. Tente novamente mais tarde.`);
    }
    return latest;
  }

  /**
   * Baixa do WIS2 as horas da janela APP_CONFIG.READINGS_LOOKBACK_HOURS
   * que ainda não estão salvas e grava as novas medições.
   * @returns {Promise<ClimateCondition[]>} medições novas
   */
  async syncReadings(location, { now = new Date() } = {}) {
    const stored = this.conditionRepository.findByLocation(location.id);
    const storedHours = new Set(stored.map((reading) => reading.observedAt));

    // Horas cheias da janela, da atual para trás, que ainda faltam no navegador
    const currentHour = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
    const missingHours = [];
    for (let h = 0; h <= APP_CONFIG.READINGS_LOOKBACK_HOURS; h += 1) {
      const hour = new Date(currentHour - h * HOUR_MS);
      if (!storedHours.has(hour.toISOString())) missingHours.push(hour);
    }

    // Downloads em paralelo; cada arquivo tem poucas centenas de bytes
    const results = await Promise.allSettled(missingHours.map((hour) => this.#fetchReading(location, hour)));
    const failures = results.filter((result) => result.status === 'rejected');
    // Se todos os downloads falharam por rede, não há o que mostrar de novo: avisa o usuário
    if (failures.length > 0 && failures.length === results.length && stored.length === 0) {
      throw failures[0].reason;
    }
    failures.forEach((failure) => console.warn('Falha ao obter uma hora da estação:', failure.reason));

    const fresh = results
      .filter((result) => result.status === 'fulfilled' && result.value !== null)
      .map((result) => result.value);
    if (fresh.length === 0) return [];

    // Recalcula o resumo do dia para todas as datas que receberam medições novas
    const all = [...stored, ...fresh];
    const touchedDates = new Set(fresh.map((reading) => location.localDateOf(reading.observedAt)));
    const updated = all.filter((reading) => touchedDates.has(location.localDateOf(reading.observedAt)));
    StationService.applyDailySummaries(updated, location);
    this.conditionRepository.saveAll(location.id, updated);
    return fresh;
  }

  /**
   * Calcula em cada medição o resumo do seu dia local até aquela hora
   * (máxima, maior sensação, menor umidade e chuva acumulada).
   * @param {ClimateCondition[]} readings - medições (qualquer ordem)
   * @param {import('../models/Location.js').Location} location - define o fuso do "dia"
   */
  static applyDailySummaries(readings, location) {
    const byDate = new Map();
    for (const reading of readings) {
      const date = location.localDateOf(reading.observedAt);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(reading);
    }
    for (const dayReadings of byDate.values()) {
      dayReadings.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
      let maxTemperature = null;
      let maxApparentTemperature = null;
      let minHumidity = null;
      let dailyPrecipitation = null;
      for (const reading of dayReadings) {
        maxTemperature = maxOf(maxTemperature, reading.temperature, reading.hourMaxTemperature);
        maxApparentTemperature = maxOf(maxApparentTemperature, reading.apparentTemperature);
        if (typeof reading.humidity === 'number' && (minHumidity === null || reading.humidity < minHumidity)) minHumidity = reading.humidity;
        if (typeof reading.precipitation === 'number') dailyPrecipitation = Number(((dailyPrecipitation ?? 0) + reading.precipitation).toFixed(1));
        reading.applyDailySummary({ maxTemperature, maxApparentTemperature, minHumidity, dailyPrecipitation });
      }
    }
  }

  /** Grava na medição o nível de risco calculado. */
  saveClassification(condition, riskLevel) {
    condition.assignRiskLevel(riskLevel);
    return this.conditionRepository.save(condition);
  }

  /**
   * Classifica as medições salvas que ainda não têm nível de risco
   * (as baixadas em lote) e grava o resultado de uma vez.
   * @param {string} locationId
   * @param {(condition: ClimateCondition) => {riskLevel: import('../models/RiskLevel.js').RiskLevel}} classify
   */
  classifyPendingReadings(locationId, classify) {
    const pending = this.conditionRepository.findByLocation(locationId).filter((reading) => !reading.riskLevelId);
    pending.forEach((reading) => reading.assignRiskLevel(classify(reading).riskLevel));
    if (pending.length > 0) this.conditionRepository.saveAll(locationId, pending);
    return pending;
  }

  /** Lista as medições salvas da localidade, da mais recente para a mais antiga. */
  getHistory(locationId) {
    return this.conditionRepository.findByLocation(locationId);
  }

  /**
   * Baixa e decodifica a medição de uma hora.
   * @returns {Promise<ClimateCondition|null>} null se a hora não foi publicada ou o arquivo é inválido
   */
  async #fetchReading(location, hour) {
    const url = `${this.baseUrl}/WIGOS_${location.wigosId}_${toWis2Stamp(hour)}.bufr4`;
    const bytes = await fetchBytes(this.httpClient, url, SERVICE_NAME);
    if (!bytes) return null;
    try {
      const { subsets } = this.decoder.decode(bytes);
      const observation = extractSynopObservation(subsets[0]);
      // Confere se o arquivo é mesmo da estação pedida
      if (observation.wigosId !== location.wigosId) return null;
      return ClimateCondition.fromObservation(observation, location);
    } catch (error) {
      console.warn(`Medição inválida em ${url}:`, error);
      return null;
    }
  }
}
