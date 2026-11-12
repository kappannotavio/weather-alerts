/**
 * Alert.js
 * Entidade Alerta: aviso gerado automaticamente pelo sistema quando a
 * condição climática de uma localidade atinge um nível de risco maior
 * que Normal. É gravado no localStorage da localidade.
 * Importa: Entity (classe base).
 */
import { Entity } from './Entity.js';

export class Alert extends Entity {
  constructor({
    locationId = null,
    climateConditionId = null,
    riskLevelId = null,
    title = '',
    message = '',
    active = true,
    startsAt = null,
    expiresAt = null,
    notifiedAt = null,
    ...base
  } = {}) {
    super(base);
    this.locationId = locationId; // FK para Location
    this.climateConditionId = climateConditionId; // FK para a leitura que gerou o alerta
    this.riskLevelId = riskLevelId; // código do nível de risco (define cor e gravidade)
    this.title = title;
    this.message = message;
    this.active = Boolean(active); // falso quando o nível de risco mudou
    this.startsAt = startsAt ?? new Date().toISOString();
    this.expiresAt = expiresAt; // fim do dia em que foi gerado
    this.notifiedAt = notifiedAt; // quando a notificação do navegador foi exibida
  }

  /**
   * Cria um alerta a partir da condição e do nível classificado.
   * Factory Method usado pelo AlertService. Expira no fim do dia.
   * @param {import('./ClimateCondition.js').ClimateCondition} condition
   * @param {import('./RiskLevel.js').RiskLevel} riskLevel
   * @param {import('./Location.js').Location} location
   */
  static createFrom(condition, riskLevel, location) {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return new Alert({
      locationId: location.id,
      climateConditionId: condition.id,
      riskLevelId: riskLevel.id,
      title: `${riskLevel.name} em ${location.name}`,
      message: riskLevel.alertMessage || riskLevel.description,
      expiresAt: endOfDay.toISOString(),
    });
  }

  /**
   * Um alerta está vigente se estiver ativo, já tiver começado e não expirou.
   * @param {Date} now - data de referência (parâmetro facilita testes)
   */
  isCurrentlyActive(now = new Date()) {
    if (!this.active) return false;
    if (this.startsAt && new Date(this.startsAt) > now) return false;
    if (this.expiresAt && new Date(this.expiresAt) < now) return false;
    return true;
  }

  /** Encerra o alerta (o nível de risco da localidade mudou). */
  deactivate() {
    this.active = false;
  }

  /** Indica se a notificação deste alerta já foi exibida. */
  wasNotified() {
    return this.notifiedAt !== null;
  }

  /** Registra que a notificação foi exibida. */
  markNotified() {
    this.notifiedAt = new Date().toISOString();
  }

  toRecord() {
    return {
      ...super.toRecord(),
      locationId: this.locationId,
      climateConditionId: this.climateConditionId,
      riskLevelId: this.riskLevelId,
      title: this.title,
      message: this.message,
      active: this.active,
      startsAt: this.startsAt,
      expiresAt: this.expiresAt,
      notifiedAt: this.notifiedAt,
    };
  }
}
