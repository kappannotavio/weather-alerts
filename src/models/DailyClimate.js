/**
 * DailyClimate.js
 * Resumo climático de um dia já encerrado de uma localidade (máximas,
 * mínimas, chuva e vento), usado no histórico dos últimos dias.
 * Tem a mesma interface de avaliação da ClimateCondition
 * (getEvaluatedTemperature/getEvaluatedHumidity), então o RiskClassifier
 * classifica cada dia com a mesma escala de risco.
 * Não estende Entity: o histórico é gravado em bloco, como cache da API.
 */
export class DailyClimate {
  constructor({
    locationId = null,
    date = null,
    maxTemperature = null,
    minTemperature = null,
    maxApparentTemperature = null,
    minHumidity = null,
    precipitation = null,
    maxWindSpeed = null,
    uvIndexMax = null,
    weatherCode = null,
    riskLevelId = null,
  } = {}) {
    this.locationId = locationId; // FK para Location
    this.date = date; // dia no fuso da localidade, "AAAA-MM-DD"
    this.maxTemperature = maxTemperature; // temperatura máxima (°C)
    this.minTemperature = minTemperature; // temperatura mínima (°C)
    this.maxApparentTemperature = maxApparentTemperature; // sensação térmica máxima (°C)
    this.minHumidity = minHumidity; // umidade relativa mínima (%)
    this.precipitation = precipitation; // chuva acumulada no dia (mm)
    this.maxWindSpeed = maxWindSpeed; // vento máximo a 10 m (km/h)
    this.uvIndexMax = uvIndexMax; // índice UV máximo
    this.weatherCode = weatherCode; // código WMO predominante do dia
    this.riskLevelId = riskLevelId; // código do nível de risco (catálogo no código)
  }

  /**
   * Cria a lista de dias a partir da resposta "daily" da API Open-Meteo,
   * do dia mais recente para o mais antigo.
   * Método de fábrica (Factory Method): isola o formato da API do domínio.
   * @param {object} json - resposta de /v1/forecast com past_days
   * @param {import('./Location.js').Location} location
   */
  static listFromApiResponse(json, location) {
    const daily = json?.daily;
    if (!daily || !Array.isArray(daily.time)) {
      throw new Error('Resposta da API de histórico incompleta.');
    }
    const valueAt = (key, index) => (typeof daily[key]?.[index] === 'number' ? daily[key][index] : null);

    return daily.time
      .map((date, index) => new DailyClimate({
        locationId: location.id,
        date,
        maxTemperature: valueAt('temperature_2m_max', index),
        minTemperature: valueAt('temperature_2m_min', index),
        maxApparentTemperature: valueAt('apparent_temperature_max', index),
        minHumidity: valueAt('relative_humidity_2m_min', index),
        precipitation: valueAt('precipitation_sum', index),
        maxWindSpeed: valueAt('wind_speed_10m_max', index),
        uvIndexMax: valueAt('uv_index_max', index),
        weatherCode: valueAt('weather_code', index),
      }))
      // Dias sem temperatura nem umidade não podem ser classificados
      .filter((day) => day.maxTemperature !== null || day.minHumidity !== null)
      .reverse();
  }

  /** Temperatura usada na classificação: a pior entre a máxima e a sensação máxima do dia. */
  getEvaluatedTemperature() {
    const values = [this.maxApparentTemperature, this.maxTemperature].filter((value) => typeof value === 'number');
    return values.length > 0 ? Math.max(...values) : -Infinity;
  }

  /** Umidade usada na classificação: a mínima do dia. */
  getEvaluatedHumidity() {
    return typeof this.minHumidity === 'number' ? this.minHumidity : Infinity;
  }

  /** Associa o dia ao nível de risco calculado pelo RiskClassifier. */
  assignRiskLevel(riskLevel) {
    this.riskLevelId = riskLevel.id;
  }

  toRecord() {
    return {
      locationId: this.locationId,
      date: this.date,
      maxTemperature: this.maxTemperature,
      minTemperature: this.minTemperature,
      maxApparentTemperature: this.maxApparentTemperature,
      minHumidity: this.minHumidity,
      precipitation: this.precipitation,
      maxWindSpeed: this.maxWindSpeed,
      uvIndexMax: this.uvIndexMax,
      weatherCode: this.weatherCode,
      riskLevelId: this.riskLevelId,
    };
  }
}
