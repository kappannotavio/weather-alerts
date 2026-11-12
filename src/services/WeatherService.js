/**
 * WeatherService.js
 * Obtém a condição climática de uma localidade na API pública
 * Open-Meteo (https://open-meteo.com, gratuita e sem chave de acesso).
 * Antes de chamar a API, verifica no localStorage se existe leitura
 * recente da mesma localidade (cache de 15 min), reduzindo requisições.
 * Importa: APP_CONFIG, ClimateCondition e fetchJson.
 */
import { APP_CONFIG } from '../config/constants.js';
import { ClimateCondition } from '../models/ClimateCondition.js';
import { fetchJson } from '../utils/http.js';

// Variáveis solicitadas à API (atuais e previsão diária de hoje)
const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code';
const DAILY_FIELDS = 'temperature_2m_max,apparent_temperature_max,relative_humidity_2m_min,uv_index_max';

export class WeatherService {
  /**
   * @param {import('../data/repositories/ClimateConditionRepository.js').ClimateConditionRepository} conditionRepository
   * @param {typeof fetch} httpClient - injetado para facilitar testes
   */
  constructor(conditionRepository, httpClient = globalThis.fetch?.bind(globalThis)) {
    this.conditionRepository = conditionRepository;
    this.httpClient = httpClient;
  }

  /**
   * Retorna a condição climática atual da localidade.
   * @param {import('../models/Location.js').Location} location
   * @param {{forceRefresh?: boolean}} options - ignora o cache quando true
   */
  async getCurrentCondition(location, { forceRefresh = false } = {}) {
    // 1. Tenta reaproveitar a leitura mais recente salva no navegador
    if (!forceRefresh) {
      const cached = this.conditionRepository.findLatestByLocation(location.id);
      if (cached && !cached.isStale(APP_CONFIG.WEATHER_CACHE_MINUTES)) {
        return cached;
      }
    }
    // 2. Consulta a API e grava a nova leitura no histórico da localidade
    const json = await this.#fetchForecast(location);
    const condition = ClimateCondition.fromApiResponse(json, location);
    return this.conditionRepository.save(condition);
  }

  /** Grava na leitura o nível de risco calculado. */
  saveClassification(condition, riskLevel) {
    condition.assignRiskLevel(riskLevel);
    return this.conditionRepository.save(condition);
  }

  /** Lista o histórico de leituras da localidade, da mais recente para a mais antiga. */
  getHistory(locationId) {
    return this.conditionRepository.findByLocation(locationId);
  }

  /** Faz a requisição HTTP GET à API de previsão (tempo limite em fetchJson). */
  #fetchForecast({ latitude, longitude }) {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: CURRENT_FIELDS,
      daily: DAILY_FIELDS,
      timezone: 'auto',
      forecast_days: '1',
    });
    return fetchJson(this.httpClient, `${APP_CONFIG.WEATHER_API_URL}?${params}`, 'clima');
  }
}
