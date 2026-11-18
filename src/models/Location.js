/**
 * Location.js
 * Entidade Localidade: o local monitorado e a estação meteorológica
 * automática do INMET que mede o clima dele (nesta versão, apenas a
 * estação A833, em Santiago/RS). O id é derivado das coordenadas
 * arredondadas e identifica as listas de leituras e alertas no localStorage.
 * Importa: Entity (classe base).
 */
import { Entity } from './Entity.js';

export class Location extends Entity {
  constructor({
    name = '',
    latitude = 0,
    longitude = 0,
    stationCode = null,
    wigosId = null,
    utcOffsetHours = 0,
    ...base
  } = {}) {
    super({ ...base, id: base.id ?? Location.buildId(latitude, longitude) });
    this.name = name;
    this.latitude = Number(latitude);
    this.longitude = Number(longitude);
    this.stationCode = stationCode; // código da estação no INMET, ex.: "A833"
    this.wigosId = wigosId; // identificador internacional WIGOS, usado nos arquivos do WIS2
    this.utcOffsetHours = Number(utcOffsetHours); // fuso da localidade, define o "dia" local (ex.: -3)
  }

  /**
   * Gera o identificador a partir das coordenadas com 2 casas (~1 km).
   * Ex.: (-29.19167, -54.88556) -> "-29.19_-54.89"
   */
  static buildId(latitude, longitude) {
    return `${Number(latitude).toFixed(2)}_${Number(longitude).toFixed(2)}`;
  }

  /**
   * Data local ("AAAA-MM-DD") de um instante em UTC, no fuso da localidade.
   * @param {string} isoUtc - data e hora em UTC (ISO 8601)
   */
  localDateOf(isoUtc) {
    const shifted = new Date(new Date(isoUtc).getTime() + this.utcOffsetHours * 3600000);
    return shifted.toISOString().slice(0, 10);
  }

  toRecord() {
    return {
      ...super.toRecord(),
      name: this.name,
      latitude: this.latitude,
      longitude: this.longitude,
      stationCode: this.stationCode,
      wigosId: this.wigosId,
      utcOffsetHours: this.utcOffsetHours,
    };
  }
}
