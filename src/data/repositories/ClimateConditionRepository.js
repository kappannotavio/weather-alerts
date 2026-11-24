/**
 * ClimateConditionRepository.js
 * Persistência das medições horárias da estação por localidade
 * (chave "alerta-saude:v1:conditions:<id da localidade>"). Ordena pela
 * hora da medição (observedAt) e guarda até APP_CONFIG.MAX_CONDITIONS_PER_LOCATION
 * leituras, que formam as "Últimas leituras" e o histórico diário.
 * Importa: LocationScopedRepository, ClimateCondition, APP_CONFIG e STORAGE_KEYS.
 */
import { LocationScopedRepository } from './LocationScopedRepository.js';
import { ClimateCondition } from '../../models/ClimateCondition.js';
import { APP_CONFIG, STORAGE_KEYS } from '../../config/constants.js';

export class ClimateConditionRepository extends LocationScopedRepository {
  constructor(storage) {
    super(storage, STORAGE_KEYS.CONDITIONS_PREFIX, (record) => new ClimateCondition(record), APP_CONFIG.MAX_CONDITIONS_PER_LOCATION, 'observedAt');
  }

  /** Retorna a medição mais recente da localidade, ou null. */
  findLatestByLocation(locationId) {
    return this.findByLocation(locationId)[0] ?? null;
  }
}
