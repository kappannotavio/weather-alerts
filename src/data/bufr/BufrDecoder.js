/**
 * BufrDecoder.js
 * Decodificador mínimo de mensagens BUFR edição 4 (formato binário
 * padrão da OMM), escrito em JavaScript puro, sem bibliotecas.
 * Suporta o que as mensagens SYNOP do INMET no WIS2 usam: descritores
 * de elemento (Tabela B), sequências (Tabela D) e repetições fixas e
 * variáveis (descritores 1XXYYY). Não suporta dados comprimidos nem
 * operadores (2XXYYY): nesses casos lança BufrDecodeError.
 * Não acessa rede nem armazenamento: recebe os bytes e devolve valores.
 * Importa: TABLE_B e TABLE_D (bufrTables.js).
 */
import { TABLE_B, TABLE_D } from './bufrTables.js';

/** Mensagem BUFR inválida ou com recurso não suportado. */
export class BufrDecodeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BufrDecodeError';
  }
}

/**
 * Leitor sequencial de bits (os campos BUFR não são alinhados em bytes).
 * Lê no máximo 52 bits por vez como número, limite seguro do Number.
 */
class BitReader {
  /** @param {Uint8Array} bytes - seção 4 (dados), a partir do primeiro bit de dados */
  constructor(bytes) {
    this.bytes = bytes;
    this.position = 0; // posição atual em bits
  }

  /** Lê "width" bits como inteiro sem sinal (mais significativo primeiro). */
  readUnsigned(width) {
    if (width > 52) throw new BufrDecodeError(`Campo numérico de ${width} bits não suportado.`);
    if (this.position + width > this.bytes.length * 8) throw new BufrDecodeError('Fim inesperado dos dados BUFR.');
    let value = 0;
    for (let i = 0; i < width; i += 1) {
      const bitIndex = this.position + i;
      const bit = (this.bytes[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1;
      value = value * 2 + bit; // multiplicação (e não <<) para passar de 32 bits sem estouro
    }
    this.position += width;
    return value;
  }
}

/** Lê inteiro sem sinal de "length" bytes a partir de "offset" (big-endian). */
function readUint(bytes, offset, length) {
  let value = 0;
  for (let i = 0; i < length; i += 1) value = value * 256 + bytes[offset + i];
  return value;
}

export class BufrDecoder {
  /**
   * @param {{tableB?: object, tableD?: object}} tables - substituíveis em testes
   */
  constructor({ tableB = TABLE_B, tableD = TABLE_D } = {}) {
    this.tableB = tableB;
    this.tableD = tableD;
  }

  /**
   * Decodifica uma mensagem BUFR.
   * @param {Uint8Array|ArrayBuffer} input - conteúdo do arquivo .bufr4
   * @returns {{ header: object, subsets: Array<Array<{descriptor: string, value: number|string|null}>> }}
   */
  decode(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

    // Seção 0: assinatura "BUFR", tamanho total e edição
    if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'BUFR') {
      throw new BufrDecodeError('O arquivo não é uma mensagem BUFR.');
    }
    const edition = bytes[7];
    if (edition !== 4) throw new BufrDecodeError(`Edição BUFR ${edition} não suportada (apenas 4).`);

    // Seção 1: identificação (centro, categoria, data de referência)
    const s1 = 8;
    const s1Length = readUint(bytes, s1, 3);
    const hasSection2 = (bytes[s1 + 9] & 0x80) !== 0;
    const header = {
      edition,
      centre: readUint(bytes, s1 + 4, 2),
      dataCategory: bytes[s1 + 10],
      masterTableVersion: bytes[s1 + 13],
      year: readUint(bytes, s1 + 15, 2),
      month: bytes[s1 + 17],
      day: bytes[s1 + 18],
      hour: bytes[s1 + 19],
      minute: bytes[s1 + 20],
    };

    // Seção 2 (opcional, dados locais): só é pulada
    let offset = s1 + s1Length;
    if (hasSection2) offset += readUint(bytes, offset, 3);

    // Seção 3: quantidade de subconjuntos, compressão e descritores
    const s3Length = readUint(bytes, offset, 3);
    const subsetCount = readUint(bytes, offset + 4, 2);
    const compressed = (bytes[offset + 6] & 0x40) !== 0;
    if (compressed) throw new BufrDecodeError('Mensagens BUFR comprimidas não são suportadas.');
    const descriptors = [];
    for (let p = offset + 7; p + 1 < offset + s3Length; p += 2) {
      const f = bytes[p] >> 6;
      const x = bytes[p] & 0x3f;
      const y = bytes[p + 1];
      descriptors.push(`${f}${String(x).padStart(2, '0')}${String(y).padStart(3, '0')}`);
    }
    header.subsetCount = subsetCount;
    header.descriptors = descriptors;
    offset += s3Length;

    // Seção 4: dados (a partir do 5º octeto da seção)
    const s4Length = readUint(bytes, offset, 3);
    const reader = new BitReader(bytes.subarray(offset + 4, offset + s4Length));

    // Sem compressão, os subconjuntos vêm um depois do outro
    const subsets = [];
    for (let s = 0; s < subsetCount; s += 1) {
      const values = [];
      this.#decodeList(descriptors, reader, values);
      subsets.push(values);
    }
    return { header, subsets };
  }

  /**
   * Percorre uma lista de descritores, expandindo sequências e
   * repetições, e acrescenta em "out" cada elemento lido.
   */
  #decodeList(descriptors, reader, out) {
    for (let i = 0; i < descriptors.length; i += 1) {
      const descriptor = descriptors[i];
      const f = descriptor[0];

      if (f === '0') {
        out.push({ descriptor, value: this.#readElement(descriptor, reader) });
      } else if (f === '3') {
        const sequence = this.tableD[descriptor];
        if (!sequence) throw new BufrDecodeError(`Sequência ${descriptor} ausente na Tabela D.`);
        this.#decodeList(sequence, reader, out);
      } else if (f === '1') {
        // 1XXYYY: repete os próximos XX descritores YY vezes; YY = 0 é repetição
        // variável, cujo número de vezes vem no descritor seguinte (classe 031)
        const groupSize = Number(descriptor.slice(1, 3));
        let times = Number(descriptor.slice(3));
        let start = i + 1;
        if (times === 0) {
          const factorDescriptor = descriptors[start];
          times = this.#readElement(factorDescriptor, reader) ?? 0;
          out.push({ descriptor: factorDescriptor, value: times });
          start += 1;
        }
        const group = descriptors.slice(start, start + groupSize);
        for (let r = 0; r < times; r += 1) this.#decodeList(group, reader, out);
        i = start + groupSize - 1; // pula o grupo já processado
      } else {
        throw new BufrDecodeError(`Operador BUFR ${descriptor} não suportado.`);
      }
    }
  }

  /**
   * Lê um elemento da Tabela B e aplica escala e referência.
   * Valor com todos os bits em 1 significa "ausente" (null), exceto
   * nos fatores de repetição (classe 031).
   */
  #readElement(descriptor, reader) {
    const entry = this.tableB[descriptor];
    if (!entry) throw new BufrDecodeError(`Descritor ${descriptor} ausente na Tabela B.`);
    const [, unit, scale, reference, width] = entry;

    // Texto (CCITT IA5): 8 bits por caractere
    if (unit === 'CCITT IA5') {
      const codes = [];
      for (let c = 0; c < width / 8; c += 1) codes.push(reader.readUnsigned(8));
      if (codes.every((code) => code === 0xff)) return null;
      return String.fromCharCode(...codes).replace(/[\0\s]+$/, '');
    }

    const raw = reader.readUnsigned(width);
    const allOnes = raw === 2 ** width - 1;
    if (allOnes && width > 1 && !descriptor.startsWith('031')) return null;
    const value = (raw + reference) / 10 ** scale;
    // Arredonda para a quantidade de casas da escala (evita 306.34999999)
    return scale > 0 ? Number(value.toFixed(scale)) : value;
  }
}
