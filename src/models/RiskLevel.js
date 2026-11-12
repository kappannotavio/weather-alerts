/**
 * RiskLevel.js
 * Nível de Risco: faixa de classificação definida no próprio código
 * (catálogo em src/catalog/riskLevels.js), como Normal, Atenção,
 * Alerta e Emergência. Cada nível tem limites de temperatura e/ou
 * umidade que o disparam. Não é gravado no navegador (somente leitura).
 */
export class RiskLevel {
  constructor({
    id,
    name,
    severity,
    color,
    description,
    minTemperature = null,
    maxHumidity = null,
    alertMessage = '',
  }) {
    this.id = id; // código fixo, ex.: "alerta"
    this.name = name;
    this.severity = severity; // 0 = sem risco; quanto maior, mais grave
    this.color = color; // cor hexadecimal usada na interface
    this.description = description; // explicação curta para a população
    this.minTemperature = minTemperature; // °C (sensação) a partir da qual o nível é disparado
    this.maxHumidity = maxHumidity; // % de umidade abaixo da qual o nível é disparado
    this.alertMessage = alertMessage; // texto usado nos alertas automáticos
    Object.freeze(this); // catálogo imutável
  }

  /** O nível de severidade 0 representa condições sem risco relevante. */
  isNormal() {
    return this.severity === 0;
  }

  /**
   * Retorna os motivos pelos quais a condição dispara este nível.
   * @param {import('./ClimateCondition.js').ClimateCondition} condition
   * @returns {Array<'temperature'|'humidity'>} lista vazia se não dispara
   */
  getTriggers(condition) {
    const triggers = [];
    if (this.minTemperature !== null && condition.getEvaluatedTemperature() >= this.minTemperature) {
      triggers.push('temperature');
    }
    if (this.maxHumidity !== null && condition.getEvaluatedHumidity() <= this.maxHumidity) {
      triggers.push('humidity');
    }
    return triggers;
  }

  /** Indica se a condição climática se enquadra neste nível. */
  matches(condition) {
    return this.getTriggers(condition).length > 0;
  }
}
