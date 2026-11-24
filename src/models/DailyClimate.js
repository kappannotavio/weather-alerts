/**
 * DailyClimate.js
 * Resumo de um dia já encerrado, calculado a partir das medições
 * horárias da estação gravadas no navegador (máximas, mínimas, menor
 * umidade e chuva acumulada), usado no histórico dos últimos dias.
 * Tem a mesma interface de avaliação da ClimateCondition
 * (getEvaluatedTemperature/getEvaluatedHumidity), então o RiskClassifier
 * classifica cada dia com a mesma escala de risco.
 * Não é gravado: é recalculado a partir das leituras sempre que exibido.
 */

const numbers = (values) => values.filter((value) => typeof value === 'number');

export class DailyClimate {
  constructor({
    locationId = null,
    date = null,
    maxTemperature = null,
    minTemperature = null,
    maxApparentTemperature = null,
    minHumidity = null,
    precipitation = null,
    readingsCount = 0,
    riskLevelId = null,
  } = {}) {
    this.locationId = locationId; // FK para Location
    this.date = date; // dia no fuso da localidade, "AAAA-MM-DD"
    this.maxTemperature = maxTemperature; // temperatura máxima (°C)
    this.minTemperature = minTemperature; // temperatura mínima (°C)
    this.maxApparentTemperature = maxApparentTemperature; // maior sensação térmica (°C)
    this.minHumidity = minHumidity; // menor umidade relativa (%)
    this.precipitation = precipitation; // chuva acumulada no dia (mm)
    this.readingsCount = readingsCount; // horas com medição (de 24)
    this.riskLevelId = riskLevelId; // código do nível de risco (catálogo no código)
  }

  /**
   * Cria o resumo de um dia a partir das medições horárias desse dia.
   * Método de fábrica (Factory Method).
   * @param {string} date - "AAAA-MM-DD" no fuso da localidade
   * @param {import('./ClimateCondition.js').ClimateCondition[]} readings - medições do dia
   * @param {string} locationId
   */
  static fromReadings(date, readings, locationId) {
    // Máxima/mínima da hora são mais precisas que o valor instantâneo, quando existem
    const highs = numbers(readings.flatMap((reading) => [reading.hourMaxTemperature, reading.temperature]));
    const lows = numbers(readings.flatMap((reading) => [reading.hourMinTemperature, reading.temperature]));
    const apparent = numbers(readings.map((reading) => reading.apparentTemperature));
    const humidity = numbers(readings.map((reading) => reading.humidity));
    const rain = numbers(readings.map((reading) => reading.precipitation));
    return new DailyClimate({
      locationId,
      date,
      maxTemperature: highs.length > 0 ? Math.max(...highs) : null,
      minTemperature: lows.length > 0 ? Math.min(...lows) : null,
      maxApparentTemperature: apparent.length > 0 ? Math.max(...apparent) : null,
      minHumidity: humidity.length > 0 ? Math.min(...humidity) : null,
      precipitation: rain.length > 0 ? Number(rain.reduce((sum, value) => sum + value, 0).toFixed(1)) : null,
      readingsCount: readings.length,
    });
  }

  /** Temperatura usada na classificação: a pior entre a máxima e a sensação máxima do dia. */
  getEvaluatedTemperature() {
    const values = numbers([this.maxApparentTemperature, this.maxTemperature]);
    return values.length > 0 ? Math.max(...values) : -Infinity;
  }

  /** Umidade usada na classificação: a menor do dia. */
  getEvaluatedHumidity() {
    return typeof this.minHumidity === 'number' ? this.minHumidity : Infinity;
  }

  /** Associa o dia ao nível de risco calculado pelo RiskClassifier. */
  assignRiskLevel(riskLevel) {
    this.riskLevelId = riskLevel.id;
  }
}
