/**
 * HomeView.js
 * Camada de apresentação da página (index.html).
 * Só desenha dados e repassa eventos ao HomeController;
 * não acessa armazenamento, API ou regras de negócio (padrão MVC).
 * Importa: utilitários dom.js e format.js, TARGET_GROUP_LABELS, TARGET_GROUPS e THEMES.
 */
import { h, replaceChildren } from '../utils/dom.js';
import { formatTemperature, formatHumidity, formatTime, formatDateTime, formatDay, formatPrecipitation, describeWeatherCode, describeUvIndex } from '../utils/format.js';
import { TARGET_GROUP_LABELS, TARGET_GROUPS, THEMES } from '../config/constants.js';

// Comprimento do arco do medidor (2 x pi x raio 70 do círculo no index.html)
const GAUGE_LENGTH = 439.8;
// Tempo em que o aviso flutuante fica visível
const TOAST_DURATION_MS = 4500;

export class HomeView {
  constructor(root = document) {
    // Referências aos elementos fixos do index.html
    this.root = root;
    this.riskPanel = root.getElementById('risk-panel');
    this.placeName = root.getElementById('place-name');
    this.updatedAt = root.getElementById('updated-at');
    this.riskName = root.getElementById('risk-name');
    this.riskDescription = root.getElementById('risk-description');
    this.riskReason = root.getElementById('risk-reason');
    this.readings = root.getElementById('readings');
    this.gaugeArc = root.getElementById('gauge-arc');
    this.gaugeStep = root.getElementById('gauge-step');
    this.gaugeLabel = root.getElementById('gauge-label');
    this.scale = root.getElementById('risk-scale');
    this.groupTabs = root.getElementById('group-tabs');
    this.recommendationList = root.getElementById('recommendation-list');
    this.alertList = root.getElementById('alert-list');
    this.locationForm = root.getElementById('location-form');
    this.cityInput = root.getElementById('city-input');
    this.cityResults = root.getElementById('city-results');
    this.geoButton = root.getElementById('geo-button');
    this.refreshButton = root.getElementById('refresh-button');
    this.notifyToggle = root.getElementById('notify-toggle');
    this.notifyHint = root.getElementById('notify-hint');
    this.themeToggle = root.getElementById('theme-toggle');
    this.status = root.getElementById('status-message');
    this.toast = root.getElementById('toast');
    this.recentLocations = root.getElementById('recent-locations');
    this.historyTable = root.getElementById('history-table');
    this.dailyTable = root.getElementById('daily-table');
    this.dailyMeta = root.getElementById('daily-meta');
    this.toastTimer = null;

    // Se o tema do sistema mudar (sem tema salvo), o botão de tema acompanha
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => this.#syncThemeButton());
  }

  // ---------- Ligação de eventos (o controlador fornece os handlers) ----------

  onCitySearch(handler) {
    this.locationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handler(this.cityInput.value);
    });
  }

  onUseMyLocation(handler) {
    this.geoButton.addEventListener('click', handler);
  }

  onRefresh(handler) {
    this.refreshButton.addEventListener('click', handler);
  }

  onToggleNotifications(handler) {
    this.notifyToggle.addEventListener('click', () => handler(this.notifyToggle.getAttribute('aria-checked') !== 'true'));
  }

  onToggleTheme(handler) {
    this.themeToggle.addEventListener('click', handler);
  }

  /** Cria as abas de público-alvo e avisa o controlador ao trocar. */
  renderGroupTabs(selectedGroup, handler) {
    const tabs = Object.values(TARGET_GROUPS).map((group) => h('button', {
      className: 'tab',
      text: TARGET_GROUP_LABELS[group],
      attrs: { type: 'button', role: 'tab', 'aria-selected': String(group === selectedGroup) },
      on: { click: () => handler(group) },
    }));
    replaceChildren(this.groupTabs, tabs);
  }

  // ---------- Tema claro/escuro ----------

  /**
   * Aplica o tema gravando data-theme no <html> (lido pelo base.css).
   * Sem tema salvo (null), remove o atributo e a página segue o sistema.
   * @param {'light'|'dark'|null} theme
   */
  applyTheme(theme) {
    const html = this.root.documentElement;
    if (theme) html.dataset.theme = theme;
    else delete html.dataset.theme;
    this.#syncThemeButton();
  }

  /** Tema exibido agora: o salvo ou, sem escolha salva, o do sistema (matchMedia). */
  getActiveTheme() {
    const saved = this.root.documentElement.dataset.theme;
    if (saved) return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
  }

  // ---------- Estados da tela ----------

  showLoading(message = 'Consultando o clima…') {
    this.riskPanel.setAttribute('aria-busy', 'true');
    this.showStatus(message);
  }

  showStatus(message, isError = false) {
    this.status.textContent = message;
    this.status.classList.toggle('status--error', isError);
    this.status.hidden = !message;
  }

  /** Mostra um aviso flutuante por alguns segundos (não desloca o layout). */
  showToast(message) {
    clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.classList.add('toast--visible');
    this.toastTimer = setTimeout(() => this.toast.classList.remove('toast--visible'), TOAST_DURATION_MS);
  }

  /**
   * Desenha o painel de risco, o medidor e a escala de níveis.
   * A cor de destaque (--lvl) é a cor definida para o nível no catálogo.
   */
  renderCondition(condition, location, classification, riskLevels) {
    const { riskLevel, triggers } = classification;
    this.riskPanel.removeAttribute('aria-busy');
    this.riskPanel.style.setProperty('--lvl', riskLevel.color);
    this.riskPanel.dataset.severity = String(riskLevel.severity);

    this.placeName.textContent = location.name;
    this.updatedAt.textContent = `${describeWeatherCode(condition.weatherCode)}, atualizado às ${formatTime(condition.createdAt)}`;
    this.riskName.textContent = riskLevel.name;
    this.riskDescription.textContent = riskLevel.description;
    this.riskReason.textContent = this.#describeTriggers(condition, triggers);

    const reading = (label, value) => h('div', { className: 'metric' }, h('dt', { text: label }), h('dd', { text: value }));
    replaceChildren(this.readings,
      reading('Temperatura agora', formatTemperature(condition.temperature)),
      reading('Sensação agora', formatTemperature(condition.apparentTemperature)),
      reading('Umidade agora', formatHumidity(condition.humidity)),
      reading('Máxima hoje', formatTemperature(condition.maxTemperature)),
      reading('Sensação máx. hoje', formatTemperature(condition.maxApparentTemperature)),
      reading('Umidade mínima hoje', formatHumidity(condition.minHumidity)),
      reading('Índice UV máximo', describeUvIndex(condition.uvIndexMax)));

    // Medidor: o arco preenche a fração (posição do nível / total de níveis)
    const position = riskLevels.findIndex((level) => level.id === riskLevel.id) + 1;
    this.gaugeArc.style.setProperty('--lvl', riskLevel.color);
    this.gaugeArc.style.strokeDashoffset = String(GAUGE_LENGTH * (1 - position / riskLevels.length));
    this.gaugeStep.textContent = String(position);
    this.gaugeLabel.textContent = `de ${riskLevels.length} níveis`;

    // Escala completa, destacando o nível atual
    replaceChildren(this.scale, riskLevels.map((level) => {
      const isCurrent = level.id === riskLevel.id;
      return h('li', {
        className: isCurrent ? 'scale__step scale__step--current' : 'scale__step',
        style: { '--lvl': level.color },
        attrs: { 'aria-current': isCurrent ? 'step' : null },
      }, level.name, isCurrent ? h('span', { className: 'scale__now lvl-text', text: 'Agora' }) : null);
    }));
  }

  /** Lista as recomendações do nível atual para o público escolhido. */
  renderRecommendations(recommendations) {
    if (recommendations.length === 0) {
      replaceChildren(this.recommendationList, h('li', { className: 'empty', text: 'Nenhuma recomendação para esta situação.' }));
      return;
    }
    replaceChildren(this.recommendationList, recommendations.map((item) => h('li', { className: 'care-card' },
      h('h3', { text: item.title }),
      h('p', { text: item.description }),
      item.targetGroup !== TARGET_GROUPS.GENERAL ? h('span', { className: 'care-card__group', text: TARGET_GROUP_LABELS[item.targetGroup] }) : null)));
  }

  /** Lista os alertas vigentes, com a cor do nível de cada um. */
  renderAlerts(alerts, levelsById) {
    if (alerts.length === 0) {
      replaceChildren(this.alertList, h('li', { className: 'empty', text: 'Nenhum alerta vigente para esta localidade.' }));
      return;
    }
    replaceChildren(this.alertList, alerts.map((alert) => {
      const level = levelsById.get(alert.riskLevelId);
      return h('li', { className: 'alert', style: { '--lvl': level?.color ?? '#64748b' } },
        h('div', { className: 'alert__top' },
          h('h3', { text: alert.title }),
          level ? h('span', { className: 'lvl-tag lvl-text', text: level.name }) : null),
        h('p', { text: alert.message }),
        h('p', { className: 'alert__meta', text: `Gerado em ${formatDateTime(alert.startsAt)}, válido até ${formatTime(alert.expiresAt)}` }));
    }));
  }

  /** Localidades já consultadas neste navegador, como atalhos. */
  renderRecentLocations(locations, currentLocation, handler) {
    const others = locations.filter((location) => location.id !== currentLocation.id).slice(0, 5);
    this.recentLocations.hidden = others.length === 0;
    replaceChildren(this.recentLocations.querySelector('ul'), others.map((location) => h('li', {},
      h('button', { className: 'chip chip--button', text: location.name, attrs: { type: 'button' }, on: { click: () => handler(location) } }))));
  }

  /** Leituras guardadas no navegador para a localidade atual. */
  renderHistory(conditions, levelsById) {
    if (conditions.length === 0) {
      replaceChildren(this.historyTable, h('tr', {}, h('td', { className: 'empty', text: 'Nenhuma leitura salva.', attrs: { colspan: 4 } })));
      return;
    }
    replaceChildren(this.historyTable, conditions.slice(0, 8).map((condition) => {
      const level = levelsById.get(condition.riskLevelId);
      return h('tr', {},
        h('td', { text: formatDateTime(condition.createdAt) }),
        h('td', { text: formatTemperature(condition.apparentTemperature) }),
        h('td', { text: formatHumidity(condition.humidity) }),
        h('td', {}, h('span', { className: 'lvl-tag lvl-text', text: level?.name ?? '—', style: { '--lvl': level?.color ?? '#64748b' } })));
    }));
  }

  // ---------- Histórico dos últimos dias ----------

  showDailyHistoryLoading() {
    this.dailyTable.closest('table').setAttribute('aria-busy', 'true');
    // Na primeira carga a tabela está vazia; nas seguintes mantém os dias já exibidos
    if (!this.dailyTable.hasChildNodes()) this.#renderDailyMessage('Carregando…');
  }

  /** Resumo diário dos últimos dias, com o nível de risco de cada dia. */
  renderDailyHistory({ fetchedAt, days }, levelsById) {
    this.dailyTable.closest('table').removeAttribute('aria-busy');
    this.dailyMeta.textContent = `Consultado às ${formatTime(fetchedAt)}.`;
    if (days.length === 0) {
      this.#renderDailyMessage('Nenhum dado disponível para os últimos dias.');
      return;
    }
    replaceChildren(this.dailyTable, days.map((day) => {
      const level = levelsById.get(day.riskLevelId);
      return h('tr', {},
        h('td', { text: formatDay(day.date) }),
        h('td', { text: describeWeatherCode(day.weatherCode) }),
        h('td', { text: `${formatTemperature(day.minTemperature)} / ${formatTemperature(day.maxTemperature)}` }),
        h('td', { text: formatTemperature(day.maxApparentTemperature) }),
        h('td', { text: formatHumidity(day.minHumidity) }),
        h('td', { text: formatPrecipitation(day.precipitation) }),
        h('td', {}, h('span', { className: 'lvl-tag lvl-text', text: level?.name ?? '—', style: { '--lvl': level?.color ?? '#64748b' } })));
    }));
  }

  showDailyHistoryError(message) {
    this.dailyTable.closest('table').removeAttribute('aria-busy');
    this.dailyMeta.textContent = '';
    this.#renderDailyMessage(message);
  }

  #renderDailyMessage(message) {
    replaceChildren(this.dailyTable, h('tr', {}, h('td', { className: 'empty', text: message, attrs: { colspan: 7 } })));
  }

  /** Sugestões de cidades encontradas na busca. */
  renderCityResults(cities, handler) {
    if (cities.length === 0) {
      replaceChildren(this.cityResults, h('li', { className: 'search-results__empty', text: 'Nenhuma cidade encontrada.' }));
    } else {
      replaceChildren(this.cityResults, cities.map((city) => h('li', {},
        h('button', { text: city.name, attrs: { type: 'button' }, on: { click: () => handler(city) } }))));
    }
    this.cityResults.hidden = false;
  }

  hideCityResults() {
    this.cityResults.hidden = true;
    this.cityInput.value = '';
  }

  /**
   * Atualiza o botão de notificações. A explicação vai para o texto
   * lido por leitores de tela, para a dica do botão e, quando o
   * usuário clicou (announce), para o aviso flutuante.
   */
  renderNotificationState(enabled, permission, { announce = false } = {}) {
    this.notifyToggle.setAttribute('aria-checked', String(enabled));
    const hints = {
      denied: 'Notificações bloqueadas no navegador. Libere nas configurações do site.',
      unsupported: 'Este navegador não suporta notificações.',
    };
    const hint = hints[permission] ?? (enabled
      ? 'Notificações ativadas: você será avisado sobre novos alertas enquanto esta página estiver aberta.'
      : 'Notificações desativadas.');
    this.notifyHint.textContent = hint;
    this.notifyToggle.title = hint;
    if (announce) this.showToast(hint);
  }

  /** Atualiza estado e rótulo do botão de tema conforme o tema exibido. */
  #syncThemeButton() {
    const isDark = this.getActiveTheme() === THEMES.DARK;
    this.themeToggle.setAttribute('aria-pressed', String(isDark));
    this.themeToggle.title = isDark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro';
  }

  /** Monta a frase que explica por que o nível foi atingido. */
  #describeTriggers(condition, triggers) {
    if (triggers.length === 0) return 'Nenhum limite de calor ou de ar seco foi atingido hoje.';
    const parts = [];
    if (triggers.includes('temperature')) parts.push(`sensação térmica de até ${formatTemperature(condition.getEvaluatedTemperature())}`);
    if (triggers.includes('humidity')) parts.push(`umidade do ar de até ${formatHumidity(condition.getEvaluatedHumidity())}`);
    return `Motivo: ${parts.join(' e ')} prevista para hoje.`;
  }
}
