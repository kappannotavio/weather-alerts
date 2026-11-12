/**
 * AlertService.js
 * Casos de uso de Alerta:
 * - "Gerar alerta automático": mantém um único alerta vigente por
 *   localidade, coerente com o nível de risco atual;
 * - "Visualizar alertas": lista os alertas vigentes da localidade.
 * Importa: AlertRepository, Alert e o catálogo de níveis (findRiskLevel).
 */
import { Alert } from '../models/Alert.js';
import { findRiskLevel } from '../catalog/riskLevels.js';

export class AlertService {
  /** @param {import('../data/repositories/AlertRepository.js').AlertRepository} alertRepository */
  constructor(alertRepository) {
    this.alertRepository = alertRepository;
  }

  /**
   * Gera (ou reaproveita) o alerta da localidade.
   * - Nível Normal: encerra os alertas ativos e não gera nada;
   * - Outro nível: encerra alertas de outro nível e mantém um único
   *   alerta vigente do nível atual.
   * @returns {Alert|null} o alerta vigente
   */
  syncAutomaticAlert(condition, riskLevel, location) {
    const now = new Date();
    const active = this.alertRepository.findActiveByLocation(location.id);

    // Encerra alertas de outro nível ou já expirados (a situação mudou)
    active
      .filter((alert) => alert.riskLevelId !== riskLevel.id || !alert.isCurrentlyActive(now))
      .forEach((alert) => {
        alert.deactivate();
        this.alertRepository.save(alert);
      });

    if (riskLevel.isNormal()) return null;

    const existing = active.find((alert) => alert.riskLevelId === riskLevel.id && alert.isCurrentlyActive(now));
    if (existing) return existing;

    return this.alertRepository.save(Alert.createFrom(condition, riskLevel, location));
  }

  /** Alertas vigentes da localidade, do mais grave para o menos grave. */
  listCurrentAlerts(locationId) {
    const now = new Date();
    const severity = (alert) => findRiskLevel(alert.riskLevelId)?.severity ?? 0;
    return this.alertRepository.findByLocation(locationId)
      .filter((alert) => alert.isCurrentlyActive(now))
      .sort((a, b) => severity(b) - severity(a));
  }

  /** Registra que os alertas foram notificados (não serão notificados de novo). */
  markNotified(alerts) {
    alerts.forEach((alert) => {
      alert.markNotified();
      this.alertRepository.save(alert);
    });
  }
}
