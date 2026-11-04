/**
 * HomeView.js
 * Camada de apresentação da página (index.html).
 * Só desenha dados e repassa eventos ao HomeController;
 * não acessa armazenamento, API ou regras de negócio (padrão MVC).
 * Importa: utilitários dom.js e format.js, TARGET_GROUP_LABELS.
 */
import { h, replaceChildren, readableTextColor } from '../utils/dom.js';
import { formatTemperature, formatHumidity, formatTime, formatDateTime, describeWeatherCode, describeUvIndex } from '../utils/format.js';
import { TARGET_GROUP_LABELS, TARGET_GROUPS } from '../config/constants.js';

export class HomeView {
  constructor(root = document) {
    // Referências aos elementos fixos do index.html
    this.riskPanel = root.getElementById('risk-panel');
    this.placeName = root.getElementById('place-name');
    this.updatedAt = root.getElementById('updated-at');
    this.riskName = root.getElementById('risk-name');
    this.riskDescription = root.getElementById('risk-description');
    this.riskReason = root.getElementById('risk-reason');
    this.readings = root.getElementById('readings');
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
    this.status = root.getElementById('status-message');
    this.recentLocations = root.getElementById('recent-locations');
    this.historyTable = root.getElementById('history-table');
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

  /**
   * Desenha o painel de risco: nível, leituras e escala de níveis.
   * A cor do painel é a cor definida para o nível no catálogo.
   */
  renderCondition(condition, location, classification, riskLevels) {
    const { riskLevel, triggers } = classification;
    this.riskPanel.removeAttribute('aria-busy');
    this.riskPanel.style.setProperty('--level-color', riskLevel.color);
    this.riskPanel.style.setProperty('--level-ink', readableTextColor(riskLevel.color));
    this.riskPanel.dataset.severity = String(riskLevel.severity);

    this.placeName.textContent = location.name;
    this.updatedAt.textContent = `${describeWeatherCode(condition.weatherCode)}, atualizado às ${formatTime(condition.createdAt)}`;
    this.riskName.textContent = riskLevel.name;
    this.riskDescription.textContent = riskLevel.description;
    this.riskReason.textContent = this.#describeTriggers(condition, triggers);

    const reading = (label, value) => h('div', { className: 'reading' }, h('dt', { text: label }), h('dd', { text: value }));
    replaceChildren(this.readings,
      reading('Temperatura agora', formatTemperature(condition.temperature)),
      reading('Sensação agora', formatTemperature(condition.apparentTemperature)),
      reading('Umidade agora', formatHumidity(condition.humidity)),
      reading('Máxima hoje', formatTemperature(condition.maxTemperature)),
      reading('Sensação máx. hoje', formatTemperature(condition.maxApparentTemperature)),
      reading('Umidade mínima hoje', formatHumidity(condition.minHumidity)),
      reading('Índice UV máximo', describeUvIndex(condition.uvIndexMax)));

    // Escala completa, destacando o nível atual
    replaceChildren(this.scale, riskLevels.map((level) => h('li', {
      className: level.id === riskLevel.id ? 'scale__step scale__step--current' : 'scale__step',
      style: { '--step-color': level.color },
      attrs: { 'aria-current': level.id === riskLevel.id ? 'step' : null },
    }, h('span', { className: 'scale__name', text: level.name }))));
  }

  /** Lista as recomendações do nível atual para o público escolhido. */
  renderRecommendations(recommendations) {
    if (recommendations.length === 0) {
      replaceChildren(this.recommendationList, h('li', { className: 'empty', text: 'Nenhuma recomendação para esta situação.' }));
      return;
    }
    replaceChildren(this.recommendationList, recommendations.map((item) => h('li', { className: 'care__item' },
      h('h3', { text: item.title }),
      h('p', { text: item.description }),
      item.targetGroup !== TARGET_GROUPS.GENERAL ? h('span', { className: 'care__group', text: TARGET_GROUP_LABELS[item.targetGroup] }) : null)));
  }

  /** Lista os alertas vigentes, com a cor do nível de cada um. */
  renderAlerts(alerts, levelsById) {
    if (alerts.length === 0) {
      replaceChildren(this.alertList, h('li', { className: 'empty', text: 'Nenhum alerta vigente para esta localidade.' }));
      return;
    }
    replaceChildren(this.alertList, alerts.map((alert) => {
      const level = levelsById.get(alert.riskLevelId);
      return h('li', { className: 'alert-item', style: { '--alert-color': level?.color ?? '#5B6B70' } },
        h('h3', { text: alert.title }),
        h('p', { text: alert.message }),
        h('p', { className: 'alert-item__meta', text: `Gerado em ${formatDateTime(alert.startsAt)}, válido até ${formatTime(alert.expiresAt)}` }));
    }));
  }

  /** Localidades já consultadas neste navegador, como atalhos. */
  renderRecentLocations(locations, currentLocation, handler) {
    const others = locations.filter((location) => location.id !== currentLocation.id).slice(0, 5);
    this.recentLocations.hidden = others.length === 0;
    replaceChildren(this.recentLocations.querySelector('ul'), others.map((location) => h('li', {},
      h('button', { className: 'chip', text: location.name, attrs: { type: 'button' }, on: { click: () => handler(location) } }))));
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
        h('td', {}, h('span', { className: 'level-tag', text: level?.name ?? '—', style: { '--tag-color': level?.color ?? '#999' } })));
    }));
  }

  /** Sugestões de cidades encontradas na busca. */
  renderCityResults(cities, handler) {
    if (cities.length === 0) {
      replaceChildren(this.cityResults, h('li', { className: 'city-results__empty', text: 'Nenhuma cidade encontrada.' }));
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

  /** Atualiza o interruptor de notificações. */
  renderNotificationState(enabled, permission) {
    this.notifyToggle.setAttribute('aria-checked', String(enabled));
    const hints = {
      denied: 'Notificações bloqueadas no navegador. Libere nas configurações do site.',
      unsupported: 'Este navegador não suporta notificações.',
    };
    this.notifyHint.textContent = hints[permission] ?? (enabled ? 'Você será avisado sobre novos alertas enquanto esta página estiver aberta.' : '');
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
