/**
 * NotificationService.js
 * Notificações do sistema operacional via Notifications API do navegador.
 * Exibe uma notificação para cada alerta vigente ainda não notificado.
 * Limitação: sem servidor de push, as notificações só são verificadas
 * enquanto o Alerta Saúde estiver aberto em alguma aba.
 */
export class NotificationService {
  /** O navegador possui a Notifications API? */
  isSupported() {
    return 'Notification' in globalThis;
  }

  /** Permissão atual: "granted", "denied", "default" ou "unsupported". */
  getPermission() {
    return this.isSupported() ? Notification.permission : 'unsupported';
  }

  /**
   * Solicita permissão ao usuário (precisa partir de um clique).
   * @returns {Promise<boolean>} true se a permissão foi concedida
   */
  async requestPermission() {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  /**
   * Notifica os alertas que ainda não foram notificados.
   * @param {import('../models/Alert.js').Alert[]} alerts
   * @returns {import('../models/Alert.js').Alert[]} alertas notificados agora
   */
  notifyNewAlerts(alerts) {
    if (this.getPermission() !== 'granted') return [];
    const pending = alerts.filter((alert) => !alert.wasNotified());
    pending.forEach((alert) => {
      // "tag" evita notificações duplicadas do mesmo alerta
      new Notification(alert.title, { body: alert.message, tag: alert.id, icon: 'assets/img/favicon.svg' });
    });
    return pending;
  }
}
