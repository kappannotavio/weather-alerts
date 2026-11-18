/**
 * ClimateHistoryService.js
 * Monta o resumo diário dos últimos dias a partir das medições
 * horárias da estação já gravadas no navegador (ClimateConditionRepository).
 * Não consulta a rede: o espelho do WIS2 só guarda ~24 a 48 h, então
 * o histórico vai se completando conforme o app é usado.
 * Importa: APP_CONFIG e DailyClimate.
 */
import { APP_CONFIG } from '../config/constants.js';
import { DailyClimate } from '../models/DailyClimate.js';

export class ClimateHistoryService {
  /** @param {import('../data/repositories/ClimateConditionRepository.js').ClimateConditionRepository} conditionRepository */
  constructor(conditionRepository) {
    this.conditionRepository = conditionRepository;
  }

  /**
   * Resumos dos dias encerrados (antes de hoje, no fuso da localidade),
   * do mais recente para o mais antigo, até APP_CONFIG.HISTORY_DAYS dias.
   * @param {import('../models/Location.js').Location} location
   * @param {{now?: Date}} options - data de referência (facilita testes)
   * @returns {{ days: DailyClimate[], readingsCount: number }}
   */
  getRecentDays(location, { now = new Date() } = {}) {
    const readings = this.conditionRepository.findByLocation(location.id);
    const today = location.localDateOf(now.toISOString());

    // Agrupa as medições por dia local, ignorando o dia de hoje (ainda em andamento)
    const byDate = new Map();
    for (const reading of readings) {
      const date = location.localDateOf(reading.observedAt);
      if (date >= today) continue;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(reading);
    }

    const days = [...byDate.keys()]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, APP_CONFIG.HISTORY_DAYS)
      .map((date) => DailyClimate.fromReadings(date, byDate.get(date), location.id));
    return { days, readingsCount: readings.length };
  }
}
