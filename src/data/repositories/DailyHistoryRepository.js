/**
 * DailyHistoryRepository.js
 * Persistência do histórico diário por localidade
 * (chave "alerta-saude:v1:history:<id da localidade>"). Guarda a lista
 * de dias inteira de uma vez, com a data da consulta, servindo de cache
 * da API: o histórico só muda quando um novo dia termina.
 * Importa: DailyClimate e STORAGE_KEYS.
 */
import { DailyClimate } from '../../models/DailyClimate.js';
import { STORAGE_KEYS } from '../../config/constants.js';

export class DailyHistoryRepository {
  /** @param {import('../BrowserStorage.js').BrowserStorage} storage */
  constructor(storage) {
    this.storage = storage;
  }

  #key(locationId) {
    return `${STORAGE_KEYS.HISTORY_PREFIX}${locationId}`;
  }

  /**
   * Lê o histórico salvo da localidade.
   * @returns {{ fetchedAt: string, days: DailyClimate[] } | null}
   */
  findByLocation(locationId) {
    const record = this.storage.read(this.#key(locationId), null);
    if (!record || typeof record.fetchedAt !== 'string' || !Array.isArray(record.days)) return null;
    return { fetchedAt: record.fetchedAt, days: record.days.map((day) => new DailyClimate(day)) };
  }

  /** Substitui o histórico da localidade pela lista consultada agora. */
  save(locationId, days, fetchedAt = new Date().toISOString()) {
    this.storage.write(this.#key(locationId), { fetchedAt, days: days.map((day) => day.toRecord()) });
    return { fetchedAt, days };
  }
}
