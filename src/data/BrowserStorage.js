/**
 * BrowserStorage.js
 * Acesso ao armazenamento do navegador (Web Storage API / localStorage).
 * - Prefixa todas as chaves com o namespace da aplicação;
 * - Converte objetos em JSON na gravação e de volta na leitura;
 * - Trata armazenamento indisponível (modo privado) e cota excedida.
 * Os repositórios usam esta classe; nenhuma outra parte acessa o localStorage.
 * Importa: APP_CONFIG e StorageError.
 */
import { APP_CONFIG } from '../config/constants.js';
import { StorageError } from '../utils/errors.js';

export class BrowserStorage {
  /**
   * @param {Storage} storage - localStorage do navegador (injetado para testes)
   * @param {string} namespace - prefixo das chaves
   */
  constructor(storage = globalThis.localStorage, namespace = APP_CONFIG.STORAGE_NAMESPACE) {
    this.storage = storage;
    this.namespace = namespace;
  }

  /** Monta a chave completa, ex.: "alerta-saude:v1:preferences". */
  #fullKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Lê e converte o JSON de uma chave.
   * @param {string} key
   * @param {*} fallback - valor devolvido se a chave não existir ou estiver corrompida
   */
  read(key, fallback = null) {
    try {
      const raw = this.storage.getItem(this.#fullKey(key));
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /**
   * Grava um valor como JSON.
   * @throws {StorageError} quando o navegador bloqueia o armazenamento ou a cota acaba
   */
  write(key, value) {
    try {
      this.storage.setItem(this.#fullKey(key), JSON.stringify(value));
    } catch {
      throw new StorageError('Não foi possível salvar os dados neste navegador. Verifique se o armazenamento de sites está permitido.');
    }
  }

  /** Remove uma chave. */
  remove(key) {
    try {
      this.storage.removeItem(this.#fullKey(key));
    } catch {
      // Armazenamento indisponível: nada a remover
    }
  }
}
