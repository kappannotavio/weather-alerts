/**
 * RiskClassifier.js
 * Regra de negócio central: classifica uma Condição Climática em um
 * Nível de Risco do catálogo. Percorre os níveis do mais grave para o
 * menos grave e escolhe o primeiro cujos limites de temperatura ou
 * umidade forem atingidos; se nenhum for atingido, usa o nível de
 * menor severidade (Normal). Também valida a coerência da escala.
 * Classe pura (sem armazenamento/API), coberta por testes automatizados.
 */
export class RiskClassifier {
  /** @param {import('../models/RiskLevel.js').RiskLevel[]} riskLevels - catálogo de níveis */
  constructor(riskLevels) {
    if (!riskLevels || riskLevels.length === 0) {
      throw new Error('Nenhum nível de risco configurado.');
    }
    // Cópia ordenada do mais grave para o menos grave
    this.levelsBySeverityDesc = [...riskLevels].sort((a, b) => b.severity - a.severity);
  }

  /**
   * @param {import('../models/ClimateCondition.js').ClimateCondition} condition
   * @returns {{ riskLevel: import('../models/RiskLevel.js').RiskLevel, triggers: string[] }}
   */
  classify(condition) {
    for (const level of this.levelsBySeverityDesc) {
      const triggers = level.getTriggers(condition);
      if (triggers.length > 0) {
        return { riskLevel: level, triggers };
      }
    }
    // Nenhum limite atingido: nível base (Normal)
    return { riskLevel: this.levelsBySeverityDesc[this.levelsBySeverityDesc.length - 1], triggers: [] };
  }

  /**
   * Verifica se uma escala é coerente: cada nível mais grave precisa de uma
   * temperatura limite maior e de uma umidade limite menor que o anterior,
   * e o nível de severidade 0 (Normal) não pode ter limites.
   * Usado pelos testes para garantir que o catálogo do código está correto.
   * @returns {Record<string, string>} erros por id do nível (vazio = válido)
   */
  static validateScale(riskLevels) {
    const errors = {};
    const ordered = [...riskLevels].sort((a, b) => a.severity - b.severity);
    let previousTemperature = -Infinity;
    let previousHumidity = Infinity;

    for (const level of ordered) {
      if (level.isNormal()) {
        if (level.minTemperature !== null || level.maxHumidity !== null) {
          errors[level.id] = `O nível "${level.name}" representa ausência de risco e não deve ter limites.`;
        }
        continue;
      }
      if (level.minTemperature === null && level.maxHumidity === null) {
        errors[level.id] = `Defina ao menos um limite (temperatura ou umidade) para "${level.name}".`;
        continue;
      }
      if (level.minTemperature !== null) {
        if (level.minTemperature <= previousTemperature) {
          errors[level.id] = `A temperatura de "${level.name}" deve ser maior que a do nível anterior.`;
          continue;
        }
        previousTemperature = level.minTemperature;
      }
      if (level.maxHumidity !== null) {
        if (level.maxHumidity >= previousHumidity) {
          errors[level.id] = `A umidade de "${level.name}" deve ser menor que a do nível anterior.`;
          continue;
        }
        previousHumidity = level.maxHumidity;
      }
    }
    return errors;
  }
}
