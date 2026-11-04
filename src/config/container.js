/**
 * container.js
 * Raiz de composição (injeção de dependências): cria o acesso ao
 * localStorage, os repositórios e entrega cada serviço já com suas
 * dependências. O controlador recebe os serviços prontos, o que
 * mantém as camadas desacopladas e facilita testes.
 * Importa: BrowserStorage, repositórios, serviços e catálogo de níveis.
 */
import { BrowserStorage } from '../data/BrowserStorage.js';
import { PreferencesRepository } from '../data/repositories/PreferencesRepository.js';
import { LocationRepository } from '../data/repositories/LocationRepository.js';
import { ClimateConditionRepository } from '../data/repositories/ClimateConditionRepository.js';
import { AlertRepository } from '../data/repositories/AlertRepository.js';
import { RISK_LEVELS } from '../catalog/riskLevels.js';
import { RiskClassifier } from '../services/RiskClassifier.js';
import { WeatherService } from '../services/WeatherService.js';
import { LocationService } from '../services/LocationService.js';
import { PreferencesService } from '../services/PreferencesService.js';
import { RecommendationService } from '../services/RecommendationService.js';
import { AlertService } from '../services/AlertService.js';
import { NotificationService } from '../services/NotificationService.js';

/**
 * Cria os serviços usados pela página.
 * @param {Storage} storage - localStorage (substituível em testes)
 */
export function createContainer(storage = globalThis.localStorage) {
  const browserStorage = new BrowserStorage(storage);
  const alertRepository = new AlertRepository(browserStorage);

  return {
    riskLevels: RISK_LEVELS,
    riskClassifier: new RiskClassifier(RISK_LEVELS),
    weatherService: new WeatherService(new ClimateConditionRepository(browserStorage)),
    locationService: new LocationService(),
    preferencesService: new PreferencesService(new PreferencesRepository(browserStorage), new LocationRepository(browserStorage)),
    recommendationService: new RecommendationService(),
    alertService: new AlertService(alertRepository),
    notificationService: new NotificationService(),
  };
}
