# Painel PET Clima

Painel frontend (arquivo único, sem build) que mostra clima, alertas climáticos e riscos à saúde.

> **Versão demonstrativa:** todos os dados são **fictícios**. Nenhuma API é consultada e nenhuma
> regra de limiar é aplicada — o arquivo serve para validar a interface antes de conectar a
> dados reais.

## Como abrir

Não há build nem dependências. Basta abrir o arquivo no navegador:

```bash
# opção 1
xdg-open index.html

# opção 2 (servidor local, útil para testar em dispositivos na rede)
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## O que tem no painel

| Seção | Conteúdo |
|---|---|
| **Agora** | Temperatura, sensação térmica, condição, umidade, vento, rajadas, precipitação, UV, pressão |
| **Índice de risco** | Score 0–100 com medidor em SVG e resumo dos pontos de atenção |
| **Alertas climáticos** | 6 alertas por cidade, com severidade, período e recomendação ("o que fazer") |
| **Riscos à saúde** | 6 riscos por cidade, com grupos vulneráveis e orientação de cuidado |
| **Próximas 24h** | Curva horária de temperatura e chance de precipitação (rolagem horizontal) |
| **Qualidade do ar** | PM2.5, PM10, O₃, NO₂ e índice AQI com escala visual |
| **7 dias** | Mínima/máxima, chance de chuva e nível de risco por dia |

### Cidades incluídas (dados fictícios)

São Paulo · Rio de Janeiro · Belo Horizonte · Curitiba · Recife · Manaus

Busque pelo campo no cabeçalho — o painel inteiro é re-renderizado com os dados da cidade escolhida.
A última cidade usada e o tema ficam salvos no `localStorage`.

## Detalhes técnicos

- **Arquivo único:** `index.html` com CSS e JS inline. Zero dependências, zero build.
- **Tema claro/escuro** alternável, com cores de severidade (`--lvl-*`) que se adaptam ao tema.
- **Ícones:** SVG inline escritos à mão (clima, saúde, UI) — nenhuma biblioteca de ícones.
- **Acessibilidade:** landmarks semânticos, `aria-*` nos controles, foco visível, contraste
  verificado em AA nos dois temas, `prefers-reduced-motion` respeitado.
- **Responsivo:** 1 coluna no mobile, grade 2–3 colunas no desktop, sem rolagem horizontal.

## Onde plugar os dados reais

Todo o conteúdo fica isolado no **Bloco 2** do `<script>` (`const cities = {...}`), com o
formato documentado no comentário do bloco. O resto do arquivo só consome esse objeto via `render()`.

Para conectar uma API real (ex.: Open-Meteo, que aceita CORS e dispensa chave):

1. **Clima** — `https://api.open-meteo.com/v1/forecast`
   `current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,pressure_msl` e
   `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max`
2. **Qualidade do ar** — `https://air-quality-api.open-meteo.com/v1/air-quality`
   `current=pm2_5,pm10,ozone,nitrogen_dioxide`
3. **Geocodificação (busca de cidade)** — `https://geocoding-api.open-meteo.com/v1/search?name=...`
4. **Geolocalização do navegador** — `navigator.geolocation.getCurrentPosition()`

O engine de limiares (transformar medições em alertas) também tem um ponto natural de entrada:
dentro de `render()`, no lugar das constantes fixas de cada cidade — vale criar um módulo
separado `rules.js` com funções puras por limiar, para poder testá-las isoladamente.

## Aviso

O painel **não substitui orientação médica**. Em caso de sintomas intensos, procure um
profissional de saúde. Em emergências: **192** (SAMU) / **193** (Corpo de Bombeiros).
