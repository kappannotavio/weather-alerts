/**
 * ClimateHistoryService.js
 * Obtém o resumo diário dos últimos dias de uma localidade na API
 * Open-Meteo (parâmetro past_days de /v1/forecast, dados de modelo).
 * É a fonte provisória do histórico: a estação automática do INMET em
 * Santiago (A833) só entrega dados com token do INMET. Para trocar de
 * fonte, basta outro #fetchDays que devolva objetos DailyClimate.
 * Usa o localStorage como cache (APP_CONFIG.HISTORY_CACHE_MINUTES).
 * Importa: APP_CONFIG, DailyClimate e fetchJson.
 */
import { APP_CONFIG } from '../config/constants.js';
import { DailyClimate } from '../models/DailyClimate.js';
import { fetchJson } from '../utils/http.js';

// Variáveis diárias solicitadas à API
const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'relative_humidity_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
  'uv_index_max',
].join(',');

export class ClimateHistoryService {
  /**
   * @param {import('../data/repositories/DailyHistoryRepository.js').DailyHistoryRepository} historyRepository
   * @param {typeof fetch} httpClient - injetado para facilitar testes
   */
  constructor(historyRepository, httpClient = globalThis.fetch?.bind(globalThis)) {
    this.historyRepository = historyRepository;
    this.httpClient = httpClient;
  }

  /**
   * Retorna os últimos dias encerrados da localidade, do mais recente para o mais antigo.
   * @param {import('../models/Location.js').Location} location
   * @param {{forceRefresh?: boolean, now?: Date}} options - ignora o cache quando forceRefresh
   * @returns {Promise<{ fetchedAt: string, days: DailyClimate[] }>}
   */
  async getRecentDays(location, { forceRefresh = false, now = new Date() } = {}) {
    if (!forceRefresh) {
      const cached = this.historyRepository.findByLocation(location.id);
      const ageMs = cached ? now.getTime() - new Date(cached.fetchedAt).getTime() : Infinity;
      if (ageMs <= APP_CONFIG.HISTORY_CACHE_MINUTES * 60 * 1000) return cached;
    }
    const days = await this.#fetchDays(location);
    return this.historyRepository.save(location.id, days, now.toISOString());
  }

  /** Grava em cada dia o nível de risco calculado e atualiza o cache. */
  saveClassifications(locationId, history, classify) {
    history.days.forEach((day) => day.assignRiskLevel(classify(day).riskLevel));
    return this.historyRepository.save(locationId, history.days, history.fetchedAt);
  }

  /** Consulta a API: dias anteriores a hoje (past_days) e nenhum dia de previsão. */
  async #fetchDays(location) {
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      daily: DAILY_FIELDS,
      timezone: 'auto',
      past_days: String(APP_CONFIG.HISTORY_DAYS),
      forecast_days: '0',
    });
    const json = await fetchJson(this.httpClient, `${APP_CONFIG.WEATHER_API_URL}?${params}`, 'histórico do clima');
    return DailyClimate.listFromApiResponse(json, location);
  }
}
