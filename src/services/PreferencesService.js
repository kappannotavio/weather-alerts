/**
 * PreferencesService.js
 * Preferências deste navegador: notificações e tema.
 * Não há cadastro nem login; as preferências ficam no localStorage.
 * Importa: (recebe) PreferencesRepository.
 */
export class PreferencesService {
  /** @param {import('../data/repositories/PreferencesRepository.js').PreferencesRepository} preferencesRepository */
  constructor(preferencesRepository) {
    this.preferencesRepository = preferencesRepository;
  }

  /** Lê as preferências atuais. */
  getPreferences() {
    return this.preferencesRepository.get();
  }

  /** Caso de uso "Ativar ou desativar notificações": grava a preferência. */
  setNotifications(enabled) {
    const preferences = this.preferencesRepository.get();
    if (enabled) preferences.enableNotifications();
    else preferences.disableNotifications();
    return this.preferencesRepository.save(preferences);
  }

  /**
   * Caso de uso "Alternar tema": grava o tema escolhido (claro ou escuro)
   * no registro de preferências do localStorage.
   * @param {'light'|'dark'} theme
   */
  setTheme(theme) {
    const preferences = this.preferencesRepository.get();
    preferences.setTheme(theme);
    return this.preferencesRepository.save(preferences);
  }
}
