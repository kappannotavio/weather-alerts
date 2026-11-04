/**
 * ClimateCondition.js
 * Entidade Condição Climática: uma leitura de temperatura e umidade
 * de uma localidade, obtida da API Open-Meteo e gravada no
 * localStorage (histórico + cache). Guarda o nível de risco classificado.
 * Importa: Entity (classe base).
 */
import { Entity } from './Entity.js';

export class ClimateCondition extends Entity {
  constructor({
    locationId = null,
    temperature = null,
    apparentTemperature = null,
    humidity = null,
    maxTemperature = null,
    maxApparentTemperature = null,
    minHumidity = null,
    uvIndexMax = null,
    weatherCode = null,
    observedAt = null,
    riskLevelId = null,
    ...base
  } = {}) {
    super(base);
    this.locationId = locationId; // FK para Location
    this.temperature = temperature; // temperatura do ar atual (°C)
    this.apparentTemperature = apparentTemperature; // sensação térmica atual (°C)
    this.humidity = humidity; // umidade relativa atual (%)
    this.maxTemperature = maxTemperature; // máxima prevista para hoje (°C)
    this.maxApparentTemperature = maxApparentTemperature; // sensação máxima prevista (°C)
    this.minHumidity = minHumidity; // umidade mínima prevista para hoje (%)
    this.uvIndexMax = uvIndexMax; // índice UV máximo previsto
    this.weatherCode = weatherCode; // código WMO do tempo atual
    this.observedAt = observedAt; // horário da leitura informado pela API
    this.riskLevelId = riskLevelId; // código do nível de risco (catálogo no código)
  }

  /**
   * Cria uma condição a partir da resposta JSON da API Open-Meteo.
   * Método de fábrica (Factory Method): isola o formato da API do domínio.
   * @param {object} json - resposta de /v1/forecast
   * @param {import('./Location.js').Location} location
   */
  static fromApiResponse(json, location) {
    const current = json?.current;
    const daily = json?.daily;
    // Valida o mínimo necessário: sem temperatura e umidade não há classificação
    if (!current || typeof current.temperature_2m !== 'number' || typeof current.relative_humidity_2m !== 'number') {
      throw new Error('Resposta da API de clima incompleta.');
    }
    // Lê o primeiro (e único) dia da previsão diária, quando disponível
    const firstDay = (key) => (Array.isArray(daily?.[key]) && typeof daily[key][0] === 'number' ? daily[key][0] : null);

    return new ClimateCondition({
      locationId: location.id,
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature ?? current.temperature_2m,
      humidity: current.relative_humidity_2m,
      maxTemperature: firstDay('temperature_2m_max'),
      maxApparentTemperature: firstDay('apparent_temperature_max'),
      minHumidity: firstDay('relative_humidity_2m_min'),
      uvIndexMax: firstDay('uv_index_max'),
      weatherCode: current.weather_code ?? null,
      observedAt: current.time ?? new Date().toISOString(),
    });
  }

  /**
   * Temperatura usada na classificação de risco: a pior entre a
   * temperatura atual, a sensação térmica atual e a sensação máxima do dia.
   */
  getEvaluatedTemperature() {
    const values = [this.apparentTemperature, this.maxApparentTemperature, this.temperature]
      .filter((value) => typeof value === 'number');
    return Math.max(...values);
  }

  /**
   * Umidade usada na classificação de risco: a pior (menor) entre a
   * umidade atual e a mínima prevista para o dia.
   */
  getEvaluatedHumidity() {
    const values = [this.humidity, this.minHumidity].filter((value) => typeof value === 'number');
    return Math.min(...values);
  }

  /**
   * Verifica se a leitura está velha demais para ser reaproveitada (cache).
   * @param {number} maxAgeMinutes
   * @param {Date} now - data de referência (parâmetro facilita testes)
   */
  isStale(maxAgeMinutes, now = new Date()) {
    if (!this.createdAt) return true;
    const ageMs = now.getTime() - new Date(this.createdAt).getTime();
    return ageMs > maxAgeMinutes * 60 * 1000;
  }

  /** Associa a condição ao nível de risco calculado pelo RiskClassifier. */
  assignRiskLevel(riskLevel) {
    this.riskLevelId = riskLevel.id;
  }

  toRecord() {
    return {
      ...super.toRecord(),
      locationId: this.locationId,
      temperature: this.temperature,
      apparentTemperature: this.apparentTemperature,
      humidity: this.humidity,
      maxTemperature: this.maxTemperature,
      maxApparentTemperature: this.maxApparentTemperature,
      minHumidity: this.minHumidity,
      uvIndexMax: this.uvIndexMax,
      weatherCode: this.weatherCode,
      observedAt: this.observedAt,
      riskLevelId: this.riskLevelId,
    };
  }
}
