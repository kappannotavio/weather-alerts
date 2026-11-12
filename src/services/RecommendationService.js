/**
 * RecommendationService.js
 * Caso de uso "Consultar recomendações de saúde": seleciona, no
 * catálogo do código, as recomendações do nível de risco calculado
 * para o clima da localidade e do público-alvo escolhido.
 * Importa: catálogo RECOMMENDATIONS e TARGET_GROUPS.
 */
import { RECOMMENDATIONS } from '../catalog/recommendations.js';
import { TARGET_GROUPS } from '../config/constants.js';

export class RecommendationService {
  /** @param {import('../models/Recommendation.js').Recommendation[]} catalog */
  constructor(catalog = RECOMMENDATIONS) {
    this.catalog = catalog;
  }

  /**
   * Recomendações para o nível e o público escolhido.
   * Na aba "Todos" as gerais vêm primeiro; numa aba de grupo,
   * as específicas daquele grupo vêm primeiro.
   */
  listForRiskLevel(riskLevelId, targetGroup = TARGET_GROUPS.GENERAL) {
    const direction = targetGroup === TARGET_GROUPS.GENERAL ? -1 : 1;
    return this.catalog
      .filter((recommendation) => recommendation.appliesTo(riskLevelId, targetGroup))
      .sort((a, b) => direction * (Number(a.isGeneral()) - Number(b.isGeneral())));
  }
}
