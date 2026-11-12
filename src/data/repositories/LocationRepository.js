/**
 * LocationRepository.js
 * Persistência das Localidades consultadas na chave
 * "alerta-saude:v1:locations" do localStorage, guardadas como um
 * objeto indexado pelo id da localidade ({ "-29.19_-54.87": {...} }).
 * Importa: Location e STORAGE_KEYS.
 */
import { Location } from '../../models/Location.js';
import { STORAGE_KEYS } from '../../config/constants.js';

export class LocationRepository {
  /** @param {import('../BrowserStorage.js').BrowserStorage} storage */
  constructor(storage) {
    this.storage = storage;
  }

  /** Lê o mapa de localidades gravado. */
  #readAll() {
    const records = this.storage.read(STORAGE_KEYS.LOCATIONS, {});
    return records && typeof records === 'object' ? records : {};
  }

  /** Busca uma localidade pelo id; retorna null se não existir. */
  findById(id) {
    const record = this.#readAll()[id];
    return record ? new Location(record) : null;
  }

  /** Lista as localidades, da acessada mais recentemente para a mais antiga. */
  findAll() {
    return Object.values(this.#readAll())
      .map((record) => new Location(record))
      .sort((a, b) => (b.lastAccessAt ?? '').localeCompare(a.lastAccessAt ?? ''));
  }

  /** Insere ou atualiza uma localidade (upsert pelo id). */
  save(location) {
    location.markPersisted();
    const records = this.#readAll();
    records[location.id] = location.toRecord();
    this.storage.write(STORAGE_KEYS.LOCATIONS, records);
    return location;
  }
}
