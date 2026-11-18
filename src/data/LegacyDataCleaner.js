/**
 * LegacyDataCleaner.js
 * Apaga do localStorage os dados deixados pelas versões anteriores do
 * app, que usavam a API Open-Meteo e permitiam várias cidades:
 * - "locations" (cidades consultadas) e "history:<id>" (cache do histórico);
 * - leituras e alertas de qualquer localidade que não seja a estação atual;
 * - leituras antigas sem o formato da estação (id "<localidade>@<hora>")
 *   e alertas gerados a partir delas;
 * - o campo "currentLocationId" das preferências.
 * Mantém só o que a versão atual usa. Pode rodar a cada abertura da
 * página: quando não há nada antigo, não grava nada.
 * Importa: STORAGE_KEYS e ClimateCondition (formato do id das medições).
 */
import { STORAGE_KEYS } from '../config/constants.js';
import { ClimateCondition } from '../models/ClimateCondition.js';

export class LegacyDataCleaner {
  /** @param {import('./BrowserStorage.js').BrowserStorage} storage */
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Executa a limpeza.
   * @param {string} locationId - id da localidade atual (estação monitorada)
   * @returns {string[]} chaves apagadas ou alteradas (para registro/testes)
   */
  run(locationId) {
    const changed = [];
    const conditionsKey = `${STORAGE_KEYS.CONDITIONS_PREFIX}${locationId}`;
    const alertsKey = `${STORAGE_KEYS.ALERTS_PREFIX}${locationId}`;
    const kept = new Set([STORAGE_KEYS.PREFERENCES, conditionsKey, alertsKey]);

    // 1. Qualquer chave que a versão atual não usa (cidades, histórico, outras localidades)
    for (const key of this.storage.keys()) {
      if (!kept.has(key)) {
        this.storage.remove(key);
        changed.push(key);
      }
    }

    // 2. Medições da estação: só as do formato atual (id = localidade@hora da medição)
    const conditions = this.storage.read(conditionsKey, null);
    if (Array.isArray(conditions)) {
      const valid = conditions.filter((record) => record?.id && record.id === ClimateCondition.buildId(record.locationId, record.observedAt));
      if (valid.length !== conditions.length) {
        this.storage.write(conditionsKey, valid);
        changed.push(conditionsKey);
      }

      // 3. Alertas: só os gerados a partir dessas medições
      const validIds = new Set(valid.map((record) => record.id));
      const alerts = this.storage.read(alertsKey, null);
      if (Array.isArray(alerts)) {
        const validAlerts = alerts.filter((record) => validIds.has(record?.climateConditionId));
        if (validAlerts.length !== alerts.length) {
          this.storage.write(alertsKey, validAlerts);
          changed.push(alertsKey);
        }
      }
    }

    // 4. Preferências: remove o campo da localidade escolhida (não existe mais)
    const preferences = this.storage.read(STORAGE_KEYS.PREFERENCES, null);
    if (preferences && typeof preferences === 'object' && 'currentLocationId' in preferences) {
      const { currentLocationId, ...rest } = preferences;
      this.storage.write(STORAGE_KEYS.PREFERENCES, rest);
      changed.push(STORAGE_KEYS.PREFERENCES);
    }
    return changed;
  }
}
