/**
 * Recommendation.js
 * Recomendação de saúde definida no próprio código (catálogo em
 * src/catalog/recommendations.js), associada a um nível de risco e a
 * um público-alvo. Não é gravada no navegador (somente leitura).
 * Importa: TARGET_GROUPS (constants.js).
 */
import { TARGET_GROUPS } from '../config/constants.js';

export class Recommendation {
  constructor({ id, title, description, riskLevelId, targetGroup = TARGET_GROUPS.GENERAL }) {
    this.id = id; // código fixo, ex.: "alerta-01"
    this.title = title;
    this.description = description;
    this.riskLevelId = riskLevelId; // código do RiskLevel
    this.targetGroup = targetGroup; // geral, crianças, idosos ou trabalho ao ar livre
    Object.freeze(this); // catálogo imutável
  }

  /**
   * Verifica se a recomendação deve ser exibida para um nível e um grupo.
   * Na aba "Todos" (geral) aparecem todas as do nível; numa aba de grupo,
   * aparecem as daquele grupo e as gerais.
   */
  appliesTo(riskLevelId, targetGroup = TARGET_GROUPS.GENERAL) {
    if (this.riskLevelId !== riskLevelId) return false;
    if (targetGroup === TARGET_GROUPS.GENERAL) return true;
    return this.targetGroup === TARGET_GROUPS.GENERAL || this.targetGroup === targetGroup;
  }

  /** Indica se a recomendação é voltada a todos os públicos. */
  isGeneral() {
    return this.targetGroup === TARGET_GROUPS.GENERAL;
  }
}
