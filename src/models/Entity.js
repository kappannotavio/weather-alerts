/**
 * Entity.js
 * Classe base abstrata das entidades gravadas no navegador
 * (Localidade, Preferências, Condição Climática e Alerta).
 * Centraliza identificador e datas de criação/atualização.
 * Não acessa armazenamento nem APIs: apenas regra de domínio.
 */
export class Entity {
  /**
   * @param {object} data - dados lidos do localStorage ou criados pelo sistema
   */
  constructor({ id = null, createdAt = null, updatedAt = null } = {}) {
    // Impede instanciar a classe abstrata diretamente
    if (new.target === Entity) {
      throw new TypeError('Entity é abstrata e não pode ser instanciada.');
    }
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /** Indica se a entidade ainda não foi gravada. */
  isNew() {
    return this.createdAt === null;
  }

  /**
   * Prepara a entidade para ser gravada: gera um UUID (Web Crypto API)
   * quando ainda não há id e atualiza as datas de auditoria.
   */
  markPersisted() {
    const now = new Date().toISOString();
    if (this.id === null) this.id = globalThis.crypto.randomUUID();
    if (this.createdAt === null) this.createdAt = now;
    this.updatedAt = now;
  }

  /**
   * Converte a entidade em objeto simples (JSON) para gravação.
   * As subclasses estendem este método com seus próprios campos.
   */
  toRecord() {
    return { id: this.id, createdAt: this.createdAt, updatedAt: this.updatedAt };
  }
}
