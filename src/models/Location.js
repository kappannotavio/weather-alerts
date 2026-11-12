/**
 * Location.js
 * Entidade Localidade: cidade (ou posição do dispositivo) consultada.
 * O id é derivado das coordenadas arredondadas, de modo que a mesma
 * cidade sempre gera a mesma chave no localStorage, e os dados
 * (leituras e alertas) ficam separados por localidade.
 * Importa: Entity (classe base).
 */
import { Entity } from './Entity.js';

export class Location extends Entity {
  constructor({ name = '', latitude = 0, longitude = 0, lastAccessAt = null, ...base } = {}) {
    super({ ...base, id: base.id ?? Location.buildId(latitude, longitude) });
    this.name = name;
    this.latitude = Number(latitude);
    this.longitude = Number(longitude);
    this.lastAccessAt = lastAccessAt; // último acesso, usado para ordenar as recentes
  }

  /**
   * Gera o identificador a partir das coordenadas com 2 casas (~1 km).
   * Ex.: (-29.1917, -54.8672) -> "-29.19_-54.87"
   */
  static buildId(latitude, longitude) {
    return `${Number(latitude).toFixed(2)}_${Number(longitude).toFixed(2)}`;
  }

  /** Registra que a localidade acabou de ser consultada. */
  registerAccess() {
    this.lastAccessAt = new Date().toISOString();
  }

  toRecord() {
    return {
      ...super.toRecord(),
      name: this.name,
      latitude: this.latitude,
      longitude: this.longitude,
      lastAccessAt: this.lastAccessAt,
    };
  }
}
