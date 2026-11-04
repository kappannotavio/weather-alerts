/**
 * dom.js
 * Utilitários de interface. A função h() cria elementos usando
 * textContent, nunca innerHTML com dados variáveis, o que impede
 * injeção de HTML/JavaScript (XSS) a partir de textos cadastrados.
 */

/**
 * Cria um elemento HTML.
 * @param {string} tag - nome da tag
 * @param {object} props - className, text, attrs, dataset, on (eventos)
 * @param {...(Node|string|null)} children - filhos (strings viram nós de texto)
 */
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  const { className, text, attrs = {}, dataset = {}, on = {}, style = {} } = props;

  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  Object.entries(attrs).forEach(([name, value]) => {
    if (value === false || value === null || value === undefined) return;
    element.setAttribute(name, value === true ? '' : String(value));
  });
  Object.entries(dataset).forEach(([key, value]) => { element.dataset[key] = String(value); });
  Object.entries(style).forEach(([property, value]) => element.style.setProperty(property, value));
  Object.entries(on).forEach(([event, handler]) => element.addEventListener(event, handler));

  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return element;
}

/** Substitui todo o conteúdo de um elemento pelos novos filhos. */
export function replaceChildren(element, ...children) {
  element.replaceChildren(...children.flat().filter(Boolean));
}

/**
 * Escolhe texto claro ou escuro para ter contraste sobre a cor de fundo
 * (luminância relativa da WCAG). Necessário porque a cor do nível de
 * risco vem do catálogo e pode ser alterada no código sem revisar o texto.
 * @param {string} hexColor - cor no formato #RRGGBB
 */
export function readableTextColor(hexColor) {
  const channels = [1, 3, 5].map((start) => parseInt(hexColor.slice(start, start + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithInk = (luminance + 0.05) / 0.0661; // tinta #16242C (luminância 0,0161 + 0,05)
  return contrastWithWhite >= contrastWithInk ? '#FFFFFF' : '#16242C';
}
