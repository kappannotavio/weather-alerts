/**
 * container.js
 * Raiz de composição (injeção de dependências): cria o acesso ao
 * localStorage, os repositórios, a localidade monitorada (estação A833)
 * e entrega cada serviço já com suas dependências. O controlador recebe
 * os serviços prontos, o que mantém as camadas desacopladas e facilita testes.
 * Importa: STATION, BrowserStorage, repositórios, LegacyDataCleaner, Location, serviços e catálogo de níveis.
 */
import { STATION } from './constants.js';
import { BrowserStorage } from '../data/BrowserStorage.js';
import { PreferencesRepository } from '../data/repositories/PreferencesRepository.js';
import { ClimateConditionRepository } from '../data/repositories/ClimateConditionRepository.js';
import { AlertRepository } from '../data/repositories/AlertRepository.js';
import { LegacyDataCleaner } from '../data/LegacyDataCleaner.js';
import { Location } from '../models/Location.js';
import { RISK_LEVELS } from '../catalog/riskLevels.js';
import { RiskClassifier } from '../services/RiskClassifier.js';
import { StationService } from '../services/StationService.js';
import { ClimateHistoryService } from '../services/ClimateHistoryService.js';
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
  const conditionRepository = new ClimateConditionRepository(browserStorage);

  return {
    location: new Location(STATION),
    legacyDataCleaner: new LegacyDataCleaner(browserStorage),
    riskLevels: RISK_LEVELS,
    riskClassifier: new RiskClassifier(RISK_LEVELS),
    stationService: new StationService(conditionRepository),
    climateHistoryService: new ClimateHistoryService(conditionRepository),
    preferencesService: new PreferencesService(new PreferencesRepository(browserStorage)),
    recommendationService: new RecommendationService(),
    alertService: new AlertService(new AlertRepository(browserStorage)),
    notificationService: new NotificationService(),
  };
}
