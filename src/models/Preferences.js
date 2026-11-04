/**
 * Preferences.js
 * Entidade Preferências: configurações deste navegador.
 * Guarda qual localidade está sendo consultada e se as notificações
 * de alertas estão ativas. Existe um único registro (id "preferences").
 * Importa: Entity (classe base).
 */
import { Entity } from './Entity.js';

export class Preferences extends Entity {
  constructor({ currentLocationId = null, notificationsEnabled = false, ...base } = {}) {
    super({ ...base, id: 'preferences' });
    this.currentLocationId = currentLocationId; // FK para Location
    this.notificationsEnabled = Boolean(notificationsEnabled);
  }

  /** Troca a localidade consultada. */
  selectLocation(location) {
    this.currentLocationId = location.id;
  }

  /** Ativa o recebimento de notificações de alertas. */
  enableNotifications() {
    this.notificationsEnabled = true;
  }

  /** Desativa o recebimento de notificações de alertas. */
  disableNotifications() {
    this.notificationsEnabled = false;
  }

  toRecord() {
    return {
      ...super.toRecord(),
      currentLocationId: this.currentLocationId,
      notificationsEnabled: this.notificationsEnabled,
    };
  }
}
