/**
 * ClimateCondition.js
 * Entidade Condição Climática: a medição de uma hora da estação
 * automática do INMET (temperatura, umidade, orvalho, pressão e chuva),
 * obtida no WIS2 e gravada no localStorage. Guarda também o resumo do
 * dia local até aquela hora (máximas, mínima de umidade e chuva
 * acumulada) e o nível de risco classificado.
 * Importa: Entity (classe base) e computeHeatIndex (utils/heatIndex.js).
 */
import { Entity } from './Entity.js';
import { computeHeatIndex } from '../utils/heatIndex.js';

export class ClimateCondition extends Entity {
  constructor({
    locationId = null,
    observedAt = null,
    temperature = null,
    apparentTemperature = null,
    humidity = null,
    dewPoint = null,
    pressure = null,
    precipitation = null,
    hourMaxTemperature = null,
    hourMinTemperature = null,
    maxTemperature = null,
    maxApparentTemperature = null,
    minHumidity = null,
    dailyPrecipitation = null,
    riskLevelId = null,
    ...base
  } = {}) {
    super({ ...base, id: base.id ?? ClimateCondition.buildId(locationId, observedAt) });
    this.locationId = locationId; // FK para Location
    this.observedAt = observedAt; // hora da medição (UTC, ISO 8601)
    // Medição da hora
    this.temperature = temperature; // temperatura do ar (°C)
    this.apparentTemperature = apparentTemperature; // sensação térmica pelo índice de calor (°C)
    this.humidity = humidity; // umidade relativa (%)
    this.dewPoint = dewPoint; // ponto de orvalho (°C)
    this.pressure = pressure; // pressão na estação (hPa)
    this.precipitation = precipitation; // chuva na última hora (mm)
    this.hourMaxTemperature = hourMaxTemperature; // máxima dentro da hora (°C)
    this.hourMinTemperature = hourMinTemperature; // mínima dentro da hora (°C)
    // Resumo do dia local até esta hora (calculado pelo StationService)
    this.maxTemperature = maxTemperature; // máxima do dia (°C)
    this.maxApparentTemperature = maxApparentTemperature; // maior sensação do dia (°C)
    this.minHumidity = minHumidity; // menor umidade do dia (%)
    this.dailyPrecipitation = dailyPrecipitation; // chuva acumulada no dia (mm)
    this.riskLevelId = riskLevelId; // código do nível de risco (catálogo no código)
  }

  /**
   * Id fixo por localidade e hora: a mesma medição baixada de novo
   * substitui a anterior em vez de duplicar (upsert no repositório).
   */
  static buildId(locationId, observedAt) {
    return locationId && observedAt ? `${locationId}@${observedAt}` : null;
  }

  /**
   * Cria a condição a partir de uma observação SYNOP já decodificada.
   * Método de fábrica (Factory Method): isola o formato do WIS2 do domínio.
   * A sensação térmica não é medida pela estação: é calculada pelo
   * índice de calor da NOAA (temperatura + umidade).
   * @param {ReturnType<import('../data/bufr/synopObservation.js').extractSynopObservation>} observation
   * @param {import('./Location.js').Location} location
   */
  static fromObservation(observation, location) {
    if (typeof observation?.temperature !== 'number' || typeof observation?.humidity !== 'number') {
      throw new Error('Medição da estação sem temperatura ou umidade.');
    }
    return new ClimateCondition({
      locationId: location.id,
      observedAt: observation.observedAt,
      temperature: observation.temperature,
      apparentTemperature: computeHeatIndex(observation.temperature, observation.humidity),
      humidity: observation.humidity,
      dewPoint: observation.dewPoint,
      pressure: observation.pressure,
      precipitation: observation.precipitation,
      hourMaxTemperature: observation.maxTemperature,
      hourMinTemperature: observation.minTemperature,
    });
  }

  /**
   * Grava o resumo do dia local até esta hora.
   * @param {{maxTemperature: number|null, maxApparentTemperature: number|null, minHumidity: number|null, dailyPrecipitation: number|null}} summary
   */
  applyDailySummary({ maxTemperature, maxApparentTemperature, minHumidity, dailyPrecipitation }) {
    this.maxTemperature = maxTemperature;
    this.maxApparentTemperature = maxApparentTemperature;
    this.minHumidity = minHumidity;
    this.dailyPrecipitation = dailyPrecipitation;
  }

  /**
   * Temperatura usada na classificação de risco: a pior entre a
   * temperatura, a sensação desta hora e a maior sensação do dia.
   */
  getEvaluatedTemperature() {
    const values = [this.apparentTemperature, this.maxApparentTemperature, this.temperature]
      .filter((value) => typeof value === 'number');
    return values.length > 0 ? Math.max(...values) : -Infinity;
  }

  /**
   * Umidade usada na classificação de risco: a pior (menor) entre a
   * umidade desta hora e a menor umidade do dia.
   */
  getEvaluatedHumidity() {
    const values = [this.humidity, this.minHumidity].filter((value) => typeof value === 'number');
    return values.length > 0 ? Math.min(...values) : Infinity;
  }

  /**
   * Indica se a medição é antiga demais para representar o momento
   * (ex.: estação sem transmitir há algumas horas).
   * @param {number} maxAgeMinutes
   * @param {Date} now - data de referência (parâmetro facilita testes)
   */
  isStale(maxAgeMinutes, now = new Date()) {
    if (!this.observedAt) return true;
    return now.getTime() - new Date(this.observedAt).getTime() > maxAgeMinutes * 60 * 1000;
  }

  /** Associa a condição ao nível de risco calculado pelo RiskClassifier. */
  assignRiskLevel(riskLevel) {
    this.riskLevelId = riskLevel.id;
  }

  toRecord() {
    return {
      ...super.toRecord(),
      locationId: this.locationId,
      observedAt: this.observedAt,
      temperature: this.temperature,
      apparentTemperature: this.apparentTemperature,
      humidity: this.humidity,
      dewPoint: this.dewPoint,
      pressure: this.pressure,
      precipitation: this.precipitation,
      hourMaxTemperature: this.hourMaxTemperature,
      hourMinTemperature: this.hourMinTemperature,
      maxTemperature: this.maxTemperature,
      maxApparentTemperature: this.maxApparentTemperature,
      minHumidity: this.minHumidity,
      dailyPrecipitation: this.dailyPrecipitation,
      riskLevelId: this.riskLevelId,
    };
  }
}
