/**
 * PreferencesRepository.js
 * Persistência das Preferências deste navegador na chave
 * "alerta-saude:v1:preferences" do localStorage (registro único).
 * Importa: BrowserStorage, Preferences e STORAGE_KEYS.
 */
import { Preferences } from '../../models/Preferences.js';
import { STORAGE_KEYS } from '../../config/constants.js';

export class PreferencesRepository {
  /** @param {import('../BrowserStorage.js').BrowserStorage} storage */
  constructor(storage) {
    this.storage = storage;
  }

  /** Lê as preferências; devolve um objeto novo (não gravado) se ainda não existirem. */
  get() {
    const record = this.storage.read(STORAGE_KEYS.PREFERENCES);
    return new Preferences(record ?? {});
  }

  /** Grava as preferências. */
  save(preferences) {
    preferences.markPersisted();
    this.storage.write(STORAGE_KEYS.PREFERENCES, preferences.toRecord());
    return preferences;
  }
}
