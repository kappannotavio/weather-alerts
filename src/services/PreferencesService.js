/**
 * PreferencesService.js
 * Preferências deste navegador: localidade consultada e notificações.
 * Não há cadastro nem login; as preferências ficam no localStorage.
 * Importa: PreferencesRepository, LocationRepository, Location e APP_CONFIG.
 */
import { Location } from '../models/Location.js';
import { APP_CONFIG } from '../config/constants.js';

export class PreferencesService {
  /**
   * @param {import('../data/repositories/PreferencesRepository.js').PreferencesRepository} preferencesRepository
   * @param {import('../data/repositories/LocationRepository.js').LocationRepository} locationRepository
   */
  constructor(preferencesRepository, locationRepository) {
    this.preferencesRepository = preferencesRepository;
    this.locationRepository = locationRepository;
  }

  /** Lê as preferências atuais. */
  getPreferences() {
    return this.preferencesRepository.get();
  }

  /**
   * Retorna a localidade consultada. No primeiro acesso, grava e
   * seleciona a localidade padrão (Santiago, RS).
   */
  getCurrentLocation() {
    const preferences = this.preferencesRepository.get();
    const saved = preferences.currentLocationId ? this.locationRepository.findById(preferences.currentLocationId) : null;
    return saved ?? this.changeLocation(new Location(APP_CONFIG.DEFAULT_LOCATION));
  }

  /**
   * Caso de uso "Alterar localização": grava a localidade (ou atualiza o
   * último acesso, se já existia) e a define como atual.
   * @param {Location} location
   */
  changeLocation(location) {
    const existing = this.locationRepository.findById(location.id);
    const target = existing ?? location;
    if (existing && location.name !== 'Minha localização') target.name = location.name;
    target.registerAccess();
    this.locationRepository.save(target);

    const preferences = this.preferencesRepository.get();
    preferences.selectLocation(target);
    this.preferencesRepository.save(preferences);
    return target;
  }

  /** Lista as localidades já consultadas neste navegador (mais recentes primeiro). */
  listRecentLocations() {
    return this.locationRepository.findAll();
  }

  /** Caso de uso "Ativar ou desativar notificações": grava a preferência. */
  setNotifications(enabled) {
    const preferences = this.preferencesRepository.get();
    if (enabled) preferences.enableNotifications();
    else preferences.disableNotifications();
    return this.preferencesRepository.save(preferences);
  }
}
