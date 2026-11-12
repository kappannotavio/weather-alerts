/**
 * AlertRepository.js
 * Persistência dos alertas gerados por localidade
 * (chave "alerta-saude:v1:alerts:<id da localidade>").
 * Importa: LocationScopedRepository, Alert, APP_CONFIG e STORAGE_KEYS.
 */
import { LocationScopedRepository } from './LocationScopedRepository.js';
import { Alert } from '../../models/Alert.js';
import { APP_CONFIG, STORAGE_KEYS } from '../../config/constants.js';

export class AlertRepository extends LocationScopedRepository {
  constructor(storage) {
    super(storage, STORAGE_KEYS.ALERTS_PREFIX, (record) => new Alert(record), APP_CONFIG.MAX_ALERTS_PER_LOCATION, 'startsAt');
  }

  /** Lista os alertas ainda ativos da localidade (vigentes ou não). */
  findActiveByLocation(locationId) {
    return this.findByLocation(locationId).filter((alert) => alert.active);
  }
}
