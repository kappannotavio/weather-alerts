/**
 * HomeController.js
 * Controlador da página. Orquestra o fluxo principal:
 * localidade (preferências) -> clima (API/cache) -> classificação de
 * risco -> alerta automático -> alertas vigentes -> recomendações ->
 * notificação. Também trata busca de cidade, localidades recentes,
 * troca de público-alvo, notificações e tema claro/escuro.
 * Importa: serviços (via container), HomeView, APP_CONFIG, TARGET_GROUPS, THEMES e AppError.
 */
import { APP_CONFIG, TARGET_GROUPS, THEMES } from '../config/constants.js';
import { AppError } from '../utils/errors.js';

export class HomeController {
  /**
   * @param {object} services - criados em config/container.js
   * @param {import('../views/HomeView.js').HomeView} view
   */
  constructor(services, view) {
    this.services = services;
    this.view = view;
    this.location = null;
    this.classification = null;
    this.selectedGroup = TARGET_GROUPS.GENERAL;
  }

  /** Inicializa a página: liga eventos, carrega dados e agenda atualização. */
  async init() {
    // Tema salvo é aplicado antes de tudo, para a página não piscar no tema errado
    this.view.applyTheme(this.services.preferencesService.getPreferences().theme);
    this.view.onToggleTheme(() => this.toggleTheme());
    this.view.onCitySearch((query) => this.searchCity(query));
    this.view.onUseMyLocation(() => this.useMyLocation());
    this.view.onRefresh(() => this.refresh({ forceRefresh: true }));
    this.view.onToggleNotifications((enabled) => this.toggleNotifications(enabled));
    this.view.renderGroupTabs(this.selectedGroup, (group) => this.selectGroup(group));

    this.location = this.services.preferencesService.getCurrentLocation();
    this.#renderNotificationState();
    await this.refresh();

    // Atualização periódica enquanto a página estiver aberta
    setInterval(() => this.refresh(), APP_CONFIG.REFRESH_INTERVAL_MINUTES * 60000);
  }

  /**
   * Caso de uso "Consultar condições climáticas" (inclui "Visualizar nível
   * de risco", "Gerar alerta automático", "Consultar recomendações" e
   * "Visualizar alertas").
   */
  async refresh({ forceRefresh = false } = {}) {
    const { weatherService, riskClassifier, alertService, notificationService, preferencesService, riskLevels } = this.services;
    this.view.showLoading();
    try {
      // 1. Condição climática (cache no navegador ou API Open-Meteo)
      const condition = await weatherService.getCurrentCondition(this.location, { forceRefresh });

      // 2. Classificação do risco e gravação do nível na leitura
      this.classification = riskClassifier.classify(condition);
      weatherService.saveClassification(condition, this.classification.riskLevel);

      // 3. Alerta automático e alertas vigentes da localidade
      alertService.syncAutomaticAlert(condition, this.classification.riskLevel, this.location);
      const alerts = alertService.listCurrentAlerts(this.location.id);

      // 4. Desenho da tela
      const levelsById = new Map(riskLevels.map((level) => [level.id, level]));
      this.view.renderCondition(condition, this.location, this.classification, riskLevels);
      this.view.renderAlerts(alerts, levelsById);
      this.#renderRecommendations();
      this.view.renderHistory(weatherService.getHistory(this.location.id), levelsById);
      this.view.renderRecentLocations(preferencesService.listRecentLocations(), this.location, (location) => this.changeLocation(location));
      this.view.showStatus('');

      // 5. Notificação dos alertas novos, se ativada neste navegador
      if (preferencesService.getPreferences().notificationsEnabled) {
        alertService.markNotified(notificationService.notifyNewAlerts(alerts));
      }
    } catch (error) {
      this.#handleError(error);
    }
  }

  /** Troca o público-alvo das recomendações (abas). */
  selectGroup(group) {
    this.selectedGroup = group;
    this.view.renderGroupTabs(group, (next) => this.selectGroup(next));
    this.#renderRecommendations();
  }

  /** Caso de uso "Alterar localização": busca cidades pelo nome. */
  async searchCity(query) {
    try {
      const cities = await this.services.locationService.searchCities(query);
      this.view.renderCityResults(cities, (city) => this.changeLocation(city));
    } catch (error) {
      this.#handleError(error);
    }
  }

  /** Caso de uso "Alterar localização": usa a posição do dispositivo. */
  async useMyLocation() {
    try {
      const location = await this.services.locationService.getCurrentPosition();
      await this.changeLocation(location);
    } catch (error) {
      this.#handleError(error);
    }
  }

  /** Grava a nova localidade nas preferências e recarrega os dados. */
  async changeLocation(location) {
    try {
      this.view.hideCityResults();
      this.location = this.services.preferencesService.changeLocation(location);
      await this.refresh();
    } catch (error) {
      this.#handleError(error);
    }
  }

  /** Caso de uso "Ativar ou desativar notificações". */
  async toggleNotifications(enabled) {
    const { notificationService, preferencesService } = this.services;
    try {
      if (enabled && !(await notificationService.requestPermission())) {
        this.#renderNotificationState({ announce: true });
        return;
      }
      preferencesService.setNotifications(enabled);
      this.#renderNotificationState({ announce: true });
      if (enabled) await this.refresh();
    } catch (error) {
      this.#handleError(error);
    }
  }

  /**
   * Caso de uso "Alternar tema": troca entre claro e escuro a partir do
   * tema exibido agora (salvo ou do sistema) e grava a escolha.
   */
  toggleTheme() {
    try {
      const next = this.view.getActiveTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
      this.services.preferencesService.setTheme(next);
      this.view.applyTheme(next);
    } catch (error) {
      this.#handleError(error);
    }
  }

  #renderRecommendations() {
    if (!this.classification) return;
    const recommendations = this.services.recommendationService
      .listForRiskLevel(this.classification.riskLevel.id, this.selectedGroup);
    this.view.renderRecommendations(recommendations);
  }

  /** announce: mostra o aviso flutuante (só quando o usuário clica no botão). */
  #renderNotificationState({ announce = false } = {}) {
    const { notificationService, preferencesService } = this.services;
    const permission = notificationService.getPermission();
    const enabled = preferencesService.getPreferences().notificationsEnabled && permission === 'granted';
    this.view.renderNotificationState(enabled, permission, { announce });
  }

  /** Mostra erros previstos com a mensagem do serviço; os demais, de forma genérica. */
  #handleError(error) {
    console.error(error);
    const message = error instanceof AppError ? error.message : 'Algo deu errado ao carregar os dados. Tente novamente.';
    this.view.showStatus(message, true);
  }
}
