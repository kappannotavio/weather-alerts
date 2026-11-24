/**
 * HomeController.js
 * Controlador da página. Orquestra o fluxo principal:
 * medições da estação A833 (WIS2) -> classificação de risco -> alerta
 * automático -> alertas vigentes -> recomendações -> notificação ->
 * histórico dos últimos dias (calculado com as medições salvas).
 * Também trata troca de público-alvo, notificações e tema claro/escuro.
 * Importa: serviços (via container), HomeView, APP_CONFIG, TARGET_GROUPS, THEMES,
 * AppError e formatDateTime.
 */
import { APP_CONFIG, TARGET_GROUPS, THEMES } from '../config/constants.js';
import { AppError } from '../utils/errors.js';
import { formatDateTime } from '../utils/format.js';

export class HomeController {
  /**
   * @param {object} services - criados em config/container.js
   * @param {import('../views/HomeView.js').HomeView} view
   */
  constructor(services, view) {
    this.services = services;
    this.view = view;
    this.location = services.location; // estação monitorada (fixa: A833)
    this.classification = null;
    this.selectedGroup = TARGET_GROUPS.GENERAL;
    this.refreshing = false;
  }

  /** Inicializa a página: liga eventos, carrega dados e agenda atualização. */
  async init() {
    // Apaga dados de versões antigas (Open-Meteo, outras cidades) antes de ler qualquer coisa
    this.services.legacyDataCleaner.run(this.location.id);
    // Tema salvo é aplicado antes de tudo, para a página não piscar no tema errado
    this.view.applyTheme(this.services.preferencesService.getPreferences().theme);
    this.view.onToggleTheme(() => this.toggleTheme());
    this.view.onRefresh(() => this.refresh());
    this.view.onToggleNotifications((enabled) => this.toggleNotifications(enabled));
    this.view.renderGroupTabs(this.selectedGroup, (group) => this.selectGroup(group));

    this.#renderNotificationState();
    await this.refresh();

    // Atualização periódica enquanto a página estiver aberta
    setInterval(() => this.refresh(), APP_CONFIG.REFRESH_INTERVAL_MINUTES * 60000);
  }

  /**
   * Caso de uso "Consultar condições climáticas" (inclui "Visualizar nível
   * de risco", "Gerar alerta automático", "Consultar recomendações",
   * "Visualizar alertas" e o histórico dos últimos dias).
   */
  async refresh() {
    // Evita duas sincronizações ao mesmo tempo (clique em "Atualizar" durante a automática)
    if (this.refreshing) return;
    this.refreshing = true;
    this.view.showLoading('Consultando a estação…');
    this.view.showDailyHistoryLoading();
    try {
      await this.#refreshCurrent();
      // O histórico usa as medições que acabaram de ser gravadas
      this.#refreshDailyHistory();
    } finally {
      this.refreshing = false;
    }
  }

  async #refreshCurrent() {
    const { stationService, riskClassifier, alertService, notificationService, preferencesService, riskLevels } = this.services;
    try {
      // 1. Medições da estação (WIS2) e a mais recente
      const condition = await stationService.getCurrentCondition(this.location);

      // 2. Classificação do risco e gravação do nível na medição atual
      //    e nas demais medições baixadas (exibidas em "Últimas medições")
      this.classification = riskClassifier.classify(condition);
      stationService.saveClassification(condition, this.classification.riskLevel);
      stationService.classifyPendingReadings(this.location.id, (reading) => riskClassifier.classify(reading));

      // 3. Alerta automático e alertas vigentes da localidade
      alertService.syncAutomaticAlert(condition, this.classification.riskLevel, this.location);
      const alerts = alertService.listCurrentAlerts(this.location.id);

      // 4. Desenho da tela
      const levelsById = new Map(riskLevels.map((level) => [level.id, level]));
      this.view.renderCondition(condition, this.location, this.classification, riskLevels);
      this.view.renderAlerts(alerts, levelsById);
      this.#renderRecommendations();
      this.view.renderHistory(stationService.getHistory(this.location.id), levelsById);

      // Medição antiga: a estação pode estar sem transmitir; avisa sem esconder os dados
      if (condition.isStale(APP_CONFIG.STALE_READING_MINUTES)) {
        this.view.showStatus(`A última medição da estação ${this.location.stationCode} é de ${formatDateTime(condition.observedAt)}. A estação pode estar temporariamente sem transmitir.`);
      } else {
        this.view.showStatus('');
      }

      // 5. Notificação dos alertas novos, se ativada neste navegador
      if (preferencesService.getPreferences().notificationsEnabled) {
        alertService.markNotified(notificationService.notifyNewAlerts(alerts));
      }
    } catch (error) {
      this.#handleError(error);
    }
  }

  /** Caso de uso "Consultar histórico": resumo dos últimos dias, classificado com a mesma escala de risco. */
  #refreshDailyHistory() {
    const { climateHistoryService, riskClassifier, riskLevels } = this.services;
    try {
      const history = climateHistoryService.getRecentDays(this.location);
      history.days.forEach((day) => day.assignRiskLevel(riskClassifier.classify(day).riskLevel));
      this.view.renderDailyHistory(history, new Map(riskLevels.map((level) => [level.id, level])));
    } catch (error) {
      console.error(error);
      const message = error instanceof AppError ? error.message : 'Não foi possível montar o histórico dos últimos dias.';
      this.view.showDailyHistoryError(message);
    }
  }

  /** Troca o público-alvo das recomendações (abas). */
  selectGroup(group) {
    this.selectedGroup = group;
    this.view.renderGroupTabs(group, (next) => this.selectGroup(next));
    this.#renderRecommendations();
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
