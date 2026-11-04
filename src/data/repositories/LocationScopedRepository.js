/**
 * LocationScopedRepository.js
 * Repositório genérico (padrão Repository) para entidades guardadas
 * por localidade: cada localidade tem sua própria chave no localStorage
 * (ex.: "alerta-saude:v1:conditions:-29.19_-54.87") contendo uma lista.
 * Mantém só os registros mais recentes (limite configurável) para não
 * esgotar o espaço do navegador.
 * Usado por: ClimateConditionRepository e AlertRepository.
 */
export class LocationScopedRepository {
  /**
   * @param {import('../BrowserStorage.js').BrowserStorage} storage
   * @param {string} keyPrefix - prefixo da chave (STORAGE_KEYS.*_PREFIX)
   * @param {(record: object) => object} toEntity - converte registro em entidade
   * @param {number} maxItems - quantidade máxima guardada por localidade
   * @param {string} orderField - campo de data usado para manter os mais recentes
   */
  constructor(storage, keyPrefix, toEntity, maxItems, orderField = 'createdAt') {
    if (new.target === LocationScopedRepository) {
      throw new TypeError('LocationScopedRepository é abstrata.');
    }
    this.storage = storage;
    this.keyPrefix = keyPrefix;
    this.toEntity = toEntity;
    this.maxItems = maxItems;
    this.orderField = orderField;
  }

  /** Chave da lista de uma localidade. */
  #key(locationId) {
    return `${this.keyPrefix}${locationId}`;
  }

  #readRecords(locationId) {
    const records = this.storage.read(this.#key(locationId), []);
    return Array.isArray(records) ? records : [];
  }

  /** Lista as entidades de uma localidade, da mais recente para a mais antiga. */
  findByLocation(locationId) {
    return this.#readRecords(locationId)
      .map(this.toEntity)
      .sort((a, b) => String(b[this.orderField]).localeCompare(String(a[this.orderField])));
  }

  /**
   * Insere ou atualiza a entidade na lista da sua localidade (upsert pelo id)
   * e descarta os registros mais antigos acima do limite.
   */
  save(entity) {
    entity.markPersisted();
    const others = this.#readRecords(entity.locationId).filter((record) => record.id !== entity.id);
    const records = [...others, entity.toRecord()]
      .sort((a, b) => String(b[this.orderField]).localeCompare(String(a[this.orderField])))
      .slice(0, this.maxItems);
    this.storage.write(this.#key(entity.locationId), records);
    return entity;
  }
}
