/**
 * Preferences.js
 * Entidade Preferências: configurações deste navegador.
 * Guarda qual localidade está sendo consultada, se as notificações
 * de alertas estão ativas e o tema escolhido (claro ou escuro).
 * Existe um único registro (id "preferences").
 * Importa: Entity (classe base) e THEMES (constants.js).
 */
import { Entity } from './Entity.js';
import { THEMES } from '../config/constants.js';

export class Preferences extends Entity {
  constructor({ currentLocationId = null, notificationsEnabled = false, theme = null, ...base } = {}) {
    super({ ...base, id: 'preferences' });
    this.currentLocationId = currentLocationId; // FK para Location
    this.notificationsEnabled = Boolean(notificationsEnabled);
    // Valor lido do localStorage pode ter sido alterado à mão: só aceita temas conhecidos
    this.theme = Preferences.isValidTheme(theme) ? theme : null; // null = segue o sistema
  }

  /** Verifica se o valor é um dos temas da página (THEMES). */
  static isValidTheme(theme) {
    return Object.values(THEMES).includes(theme);
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

  /**
   * Define o tema escolhido pelo usuário.
   * @param {'light'|'dark'} theme
   */
  setTheme(theme) {
    if (!Preferences.isValidTheme(theme)) throw new TypeError(`Tema inválido: ${theme}`);
    this.theme = theme;
  }

  toRecord() {
    return {
      ...super.toRecord(),
      currentLocationId: this.currentLocationId,
      notificationsEnabled: this.notificationsEnabled,
      theme: this.theme,
    };
  }
}
