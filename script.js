
/* ==========================================
   POKÉDEX UNIFECAF — JAVASCRIPT FINAL
   PokéAPI + Showdown + TCGdex
========================================== */

// CONFIGURAÇÕES

const API = "https://pokeapi.co/api/v2";
const TCG_API = "https://api.tcgdex.net/v2/en";
const POR_PAGINA = 12;

// ELEMENTOS DO HTML

const container = document.querySelector("#pokemon-container");
const campoBusca = document.querySelector("#pokemon-search");
const filtroTipo = document.querySelector("#type-filter");
const botaoLimpar = document.querySelector("#clear-filters");
const botaoMais = document.querySelector("#load-more");
const contador = document.querySelector("#results-count");
const statusMensagem = document.querySelector("#status-message");
const statTotal = document.querySelector("#stat-total");

const modal = document.querySelector("#pokemon-modal");
const modalBody = document.querySelector("#modal-body");
const fecharModalBotao = document.querySelector("#close-modal");

// TIPOS

const tipos = {
  normal: { nome: "Normal", cor: "#9299a3", fundo: "#f0f1f3" },
  fire: { nome: "Fogo", cor: "#f08030", fundo: "#fff1e6" },
  water: { nome: "Água", cor: "#4299e1", fundo: "#e6f4ff" },
  electric: { nome: "Elétrico", cor: "#e6b800", fundo: "#fff9da" },
  grass: { nome: "Planta", cor: "#54a86b", fundo: "#e7f7ec" },
  ice: { nome: "Gelo", cor: "#68bfc7", fundo: "#e9f9fb" },
  fighting: { nome: "Lutador", cor: "#c85a4e", fundo: "#fcece9" },
  poison: { nome: "Venenoso", cor: "#9b59b6", fundo: "#f4eafa" },
  ground: { nome: "Terra", cor: "#c3a35c", fundo: "#f9f2df" },
  flying: { nome: "Voador", cor: "#859bd6", fundo: "#eef1fa" },
  psychic: { nome: "Psíquico", cor: "#e96a9d", fundo: "#fcebf3" },
  bug: { nome: "Inseto", cor: "#8fa83a", fundo: "#f1f7de" },
  rock: { nome: "Pedra", cor: "#ac9564", fundo: "#f3eee3" },
  ghost: { nome: "Fantasma", cor: "#7564a3", fundo: "#efebf8" },
  dragon: { nome: "Dragão", cor: "#6659cc", fundo: "#edebfc" },
  dark: { nome: "Sombrio", cor: "#56536b", fundo: "#eae9ef" },
  steel: { nome: "Aço", cor: "#7c9db0", fundo: "#eaf1f5" },
  fairy: { nome: "Fada", cor: "#db8fb7", fundo: "#fceef5" }
};

const nomesStats = {
  hp: "HP",
  attack: "Ataque",
  defense: "Defesa",
  "special-attack": "Ataque especial",
  "special-defense": "Defesa especial",
  speed: "Velocidade"
};

// ESTADO

let catalogo = [];
let filtrados = [];
let quantidadeExibida = 0;
let carregando = false;
let versaoBusca = 0;
let timerBusca;
let ultimoFoco = null;

let consultaTCGAtual = 0;
let visorTCG = null;
let focoAntesVisor = null;

const cachePokemon = new Map();
const cacheTipos = new Map();
const cacheCartas = new Map();

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarNome(nome) {
  return String(nome)
    .split("-")
    .map(parte =>
      parte.charAt(0).toUpperCase() + parte.slice(1)
    )
    .join(" ");
}

function formatarNumero(numero) {
  return `#${String(numero).padStart(3, "0")}`;
}

function criarElemento(tag, classe = "", texto) {
  const elemento = document.createElement(tag);

  if (classe) {
    elemento.className = classe;
  }

  if (texto !== undefined) {
    elemento.textContent = texto;
  }

  return elemento;
}

// ==========================================
// COMUNICAÇÃO COM A API
// ==========================================

async function consultarAPI(url) {
  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error(`Erro HTTP: ${resposta.status}`);
  }

  return resposta.json();
}

async function buscarPokemon(id) {
  const chave = String(id);

  if (cachePokemon.has(chave)) {
    return cachePokemon.get(chave);
  }

  const pokemon = await consultarAPI(
    `${API}/pokemon/${encodeURIComponent(chave)}`
  );

  cachePokemon.set(chave, pokemon);
  cachePokemon.set(pokemon.name, pokemon);

  return pokemon;
}

// ==========================================
// IMAGENS DOS POKÉMON
// ==========================================

function imagemOficialPokemon(pokemon) {
  return (
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites?.other?.home?.front_default ||
    pokemon.sprites?.front_default ||
    ""
  );
}

function imagemAnimadaPokemon(pokemon) {
  return (
    pokemon.sprites?.other?.showdown?.front_default ||
    null
  );
}

function configurarImagemPokemon(
  imagem,
  pokemon,
  animar = true
) {
  const imagemHD = imagemOficialPokemon(pokemon);
  const gif = animar ? imagemAnimadaPokemon(pokemon) : null;

  imagem.alt = `Imagem de ${formatarNome(pokemon.name)}`;
  imagem.decoding = "async";

  if (gif) {
    imagem.classList.add("pokemon-animado");
    imagem.src = gif;
  } else {
    imagem.classList.add("pokemon-estatico");
    imagem.src = imagemHD;
  }

  // Se o GIF falhar, utiliza a arte oficial.

  imagem.addEventListener("error", () => {
    if (imagem.dataset.fallback === "1") {
      return;
    }

    imagem.dataset.fallback = "1";

    imagem.classList.remove("pokemon-animado");
    imagem.classList.add("pokemon-estatico");

    if (imagemHD && imagem.src !== imagemHD) {
      imagem.src = imagemHD;
    }
  });
}

// ==========================================
// ETIQUETAS DOS TIPOS
// ==========================================

function criarTipos(pokemon) {
  const lista = criarElemento("div", "pokemon-tipos");

  pokemon.types.forEach(item => {
    const tipo = item.type.name;

    const info = tipos[tipo] || {
      nome: tipo,
      cor: "#64748b"
    };

    const etiqueta = criarElemento(
      "span",
      "pokemon-tipo",
      info.nome
    );

    etiqueta.style.setProperty(
      "--tipo-cor",
      info.cor
    );

    lista.appendChild(etiqueta);
  });

  return lista;
}

// ==========================================
// CARDS DINÂMICOS
// ==========================================

function criarCard(pokemon) {
  const card = criarElemento(
    "button",
    "pokemon-card"
  );

  card.type = "button";

  card.setAttribute(
    "aria-label",
    `Ver detalhes de ${formatarNome(pokemon.name)}`
  );

  // TOPO

  const topo = criarElemento("div", "card-top");

  const numero = criarElemento(
    "span",
    "pokemon-numero",
    formatarNumero(pokemon.id)
  );

  const icone = criarElemento(
    "span",
    "card-detail-icon",
    "↗"
  );

  topo.append(numero, icone);

  // ÁREA DA IMAGEM

  const areaImagem = criarElemento(
    "div",
    "image-area"
  );

  const tipoPrincipal =
    pokemon.types[0]?.type.name;

  areaImagem.style.setProperty(
    "--type-bg",
    tipos[tipoPrincipal]?.fundo || "#f3f5f9"
  );

  const imagem = document.createElement("img");

  configurarImagemPokemon(imagem, pokemon, true);

  imagem.loading = "lazy";

  areaImagem.appendChild(imagem);

  // NOME

  const nome = criarElemento(
    "h3",
    "",
    formatarNome(pokemon.name)
  );

  // TIPOS

  const listaTipos = criarTipos(pokemon);

  // ALTURA E PESO

  const informacoesCard = criarElemento(
    "div",
    "pokemon-card-info"
  );

  const altura = (pokemon.height / 10)
    .toLocaleString("pt-BR");

  const peso = (pokemon.weight / 10)
    .toLocaleString("pt-BR");

  const textoAltura = criarElemento(
    "span",
    "",
    `↕ Altura: ${altura} m`
  );

  const textoPeso = criarElemento(
    "span",
    "",
    `⚖ Peso: ${peso} kg`
  );

  informacoesCard.append(
    textoAltura,
    textoPeso
  );

  // RODAPÉ

  const rodape = criarElemento(
    "div",
    "card-bottom"
  );

  rodape.append(
    criarElemento("span", "", "Ver detalhes"),
    criarElemento("strong", "", "EXPLORAR →")
  );

  // MONTAGEM DO CARD PELO DOM

  card.append(
    topo,
    areaImagem,
    nome,
    listaTipos,
    informacoesCard,
    rodape
  );

  // EVENTO DE CLIQUE

  card.addEventListener("click", () => {
    abrirDetalhes(pokemon);
  });

  return card;
}

// ==========================================
// CARREGAR CATÁLOGO
// ==========================================

async function carregarCatalogo() {
  statusMensagem.textContent =
    "Carregando catálogo Pokémon...";

  try {
    const dados = await consultarAPI(
      `${API}/pokemon?limit=1025&offset=0`
    );

    catalogo = dados.results.map(
      (item, indice) => ({
        id: indice + 1,
        name: item.name
      })
    );

    statTotal.textContent = catalogo.length;

    await aplicarFiltros();

  } catch (erro) {
    console.error("Erro no catálogo:", erro);

    statusMensagem.textContent =
      "Não foi possível carregar a Pokédex. Atualize a página.";

    contador.textContent =
      "Erro ao consultar API";
  }
}

// ==========================================
// BUSCAR POKÉMON POR TIPO
// ==========================================

async function buscarIdsPorTipo(tipo) {
  if (cacheTipos.has(tipo)) {
    return cacheTipos.get(tipo);
  }

  const dados = await consultarAPI(
    `${API}/type/${encodeURIComponent(tipo)}`
  );

  const ids = new Set(
    dados.pokemon.map(item => {
      const partes = item.pokemon.url
        .split("/")
        .filter(Boolean);

      return Number(
        partes[partes.length - 1]
      );
    })
  );

  cacheTipos.set(tipo, ids);

  return ids;
}

// ==========================================
// PESQUISA E FILTROS
// ==========================================

async function aplicarFiltros() {
  const minhaVersao = ++versaoBusca;

  const pesquisa = normalizar(campoBusca.value);
  const tipoSelecionado = filtroTipo.value;

  botaoMais.hidden = true;

  statusMensagem.textContent =
    "Buscando Pokémon...";

  try {
    let resultado = catalogo.filter(pokemon => {
      const nome = normalizar(pokemon.name);
      const numero = String(pokemon.id);

      return (
        pesquisa === "" ||
        nome.includes(pesquisa) ||
        numero === pesquisa.replace(/^#/, "")
      );
    });

    // FILTRAR POR TIPO

    if (tipoSelecionado !== "all") {
      const ids = await buscarIdsPorTipo(
        tipoSelecionado
      );

      resultado = resultado.filter(
        pokemon => ids.has(pokemon.id)
      );
    }

    // IGNORA RESULTADOS ANTIGOS

    if (minhaVersao !== versaoBusca) {
      return;
    }

    filtrados = resultado;
    quantidadeExibida = 0;

    container.replaceChildren();

    contador.textContent =
      `${filtrados.length} Pokémon encontrados`;

    if (filtrados.length === 0) {
      statusMensagem.textContent =
        "Nenhum Pokémon encontrado. Tente outra busca.";

      return;
    }

    statusMensagem.textContent = "";

    if (!carregando) {
      await carregarMais();
    }

  } catch (erro) {
    if (minhaVersao !== versaoBusca) {
      return;
    }

    console.error("Erro ao filtrar:", erro);

    statusMensagem.textContent =
      "Erro ao consultar a API. Tente novamente.";
  }
}

// ==========================================
// CARREGAR MAIS POKÉMON
// ==========================================

async function carregarMais() {
  if (carregando) {
    return;
  }

  const minhaVersao = versaoBusca;

  const proximoLote = filtrados.slice(
    quantidadeExibida,
    quantidadeExibida + POR_PAGINA
  );

  if (proximoLote.length === 0) {
    return;
  }

  carregando = true;

  botaoMais.disabled = true;
  botaoMais.hidden = true;

  statusMensagem.textContent =
    "Carregando Pokémon...";

  try {
    const resultados = await Promise.allSettled(
      proximoLote.map(
        item => buscarPokemon(item.id)
      )
    );

    if (minhaVersao !== versaoBusca) {
      return;
    }

    const fragmento =
      document.createDocumentFragment();

    let sucesso = 0;

    resultados.forEach(resultado => {
      if (resultado.status === "fulfilled") {
        fragmento.appendChild(
          criarCard(resultado.value)
        );

        sucesso++;
      } else {
        console.error(
          "Falha ao buscar Pokémon:",
          resultado.reason
        );
      }
    });

    container.appendChild(fragmento);

    quantidadeExibida += proximoLote.length;

    contador.textContent =
      `Exibindo ${quantidadeExibida} de ${filtrados.length} Pokémon`;

    statusMensagem.textContent =
      sucesso === 0
        ? "Não foi possível carregar este grupo de Pokémon."
        : "";

  } catch (erro) {
    console.error("Erro ao carregar cards:", erro);

    if (minhaVersao === versaoBusca) {
      statusMensagem.textContent =
        "Falha ao carregar Pokémon.";
    }

  } finally {
    carregando = false;
    botaoMais.disabled = false;

    // RETOMA BUSCA NOVA SE NECESSÁRIO

    if (minhaVersao !== versaoBusca) {
      if (filtrados.length > quantidadeExibida) {
        carregarMais();
      }

      return;
    }

    botaoMais.hidden =
      quantidadeExibida >= filtrados.length;
  }
}

// ==========================================
// CAIXAS DE INFORMAÇÕES
// ==========================================

function criarInfo(titulo, valor) {
  const caixa = criarElemento(
    "div",
    "info-box"
  );

  caixa.append(
    criarElemento("span", "", titulo),
    criarElemento(
      "strong",
      "",
      String(valor)
    )
  );

  return caixa;
}

// ==========================================
// ABRIR DETALHES DO POKÉMON
// ==========================================

function abrirDetalhes(pokemon) {
  fecharCartaAmpliada();

  consultaTCGAtual++;

  ultimoFoco = document.activeElement;

  modalBody.replaceChildren();

  // CABEÇALHO

  const cabecalho = criarElemento(
    "div",
    "modal-heading"
  );

  const imagem = document.createElement("img");

  configurarImagemPokemon(
    imagem,
    pokemon,
    false
  );

  const numero = criarElemento(
    "span",
    "pokemon-numero",
    formatarNumero(pokemon.id)
  );

  const nome = criarElemento(
    "h2",
    "",
    formatarNome(pokemon.name)
  );

  nome.id = "modal-title";

  cabecalho.append(
    imagem,
    numero,
    nome,
    criarTipos(pokemon)
  );

  // INFORMAÇÕES GERAIS

  const informacoes = criarElemento(
    "div",
    "modal-info"
  );

  const habilidades = pokemon.abilities
    .map(item =>
      formatarNome(item.ability.name)
    )
    .join(", ");

  informacoes.append(
    criarInfo(
      "Altura",
      `${(pokemon.height / 10).toLocaleString("pt-BR")} m`
    ),
    criarInfo(
      "Peso",
      `${(pokemon.weight / 10).toLocaleString("pt-BR")} kg`
    ),
    criarInfo("Habilidades", habilidades),
    criarInfo(
      "Experiência base",
      pokemon.base_experience ?? "Não disponível"
    )
  );

  // ESTATÍSTICAS

  const secaoStats = criarElemento(
    "div",
    "modal-stats"
  );

  secaoStats.appendChild(
    criarElemento(
      "h3",
      "",
      "Estatísticas"
    )
  );

  pokemon.stats.forEach(item => {
    const linha = criarElemento(
      "div",
      "stat-row"
    );

    const rotulo = criarElemento(
      "div",
      "stat-label"
    );

    const nomeStat =
      nomesStats[item.stat.name] ||
      item.stat.name;

    rotulo.append(
      criarElemento(
        "strong",
        "",
        nomeStat
      ),
      criarElemento(
        "span",
        "",
        String(item.base_stat)
      )
    );

    const trilho = criarElemento(
      "div",
      "stat-track"
    );

    const barra = criarElemento(
      "div",
      "stat-fill"
    );

    barra.style.width =
      `${Math.min(item.base_stat / 255 * 100, 100)}%`;

    trilho.appendChild(barra);

    linha.append(
      rotulo,
      trilho
    );

    secaoStats.appendChild(linha);
  });

  modalBody.append(
    cabecalho,
    informacoes,
    secaoStats
  );

  // GALERIA DE CARTAS TCG

  adicionarGaleriaTCG(pokemon);

  modal.hidden = false;

  document.body.style.overflow = "hidden";

  fecharModalBotao.focus();
}

// ==========================================
// FECHAR DETALHES
// ==========================================

function fecharModal() {
  fecharCartaAmpliada();

  consultaTCGAtual++;

  modal.hidden = true;

  document.body.style.overflow = "";

  if (ultimoFoco?.isConnected) {
    ultimoFoco.focus();
  }
}

// ==========================================
// CARTAS POKÉMON TCG
// ==========================================

function imagemCarta(carta, qualidade = "low") {
  if (!carta.image) {
    return "";
  }

  return `${carta.image}/${qualidade}.webp`;
}

// ==========================================
// BUSCAR CARTAS TCG
// ==========================================

async function buscarCartasTCG(nomePokemon) {
  const chave = nomePokemon.toLowerCase();

  if (cacheCartas.has(chave)) {
    return cacheCartas.get(chave);
  }

  const parametros = new URLSearchParams({
    name: `eq:${formatarNome(nomePokemon)}`
  });

  const resultado = await consultarAPI(
    `${TCG_API}/cards?${parametros.toString()}`
  );

  const disponiveis = resultado.filter(
    carta => carta.image
  );

  // DISTRIBUI CARTAS ENTRE OS RESULTADOS

  const limite = 24;

  let candidatas = disponiveis;

  if (disponiveis.length > limite) {
    candidatas = [];

    for (let i = 0; i < limite; i++) {
      const indice = Math.round(
        i * (disponiveis.length - 1) /
        (limite - 1)
      );

      candidatas.push(
        disponiveis[indice]
      );
    }
  }

  // CONSULTA RARIDADES

  const cartasDetalhadas = [];

  for (
    let i = 0;
    i < candidatas.length;
    i += 4
  ) {
    const lote = candidatas.slice(
      i,
      i + 4
    );

    const resultados = await Promise.allSettled(
      lote.map(async carta => {
        const dados = await consultarAPI(
          `${TCG_API}/cards/${encodeURIComponent(carta.id)}`
        );

        return {
          ...carta,
          rarity:
            dados.rarity ||
            "Raridade não informada"
        };
      })
    );

    resultados.forEach((resultado, indice) => {
      if (resultado.status === "fulfilled") {
        cartasDetalhadas.push(
          resultado.value
        );
      } else {
        cartasDetalhadas.push({
          ...lote[indice],
          rarity: "Raridade não informada"
        });
      }
    });
  }

  // PRIORIZA CARTAS RARAS

  function pontuacao(carta) {
    const raridade = (
      carta.rarity || ""
    ).toLowerCase();

    if (
      /special illustration|hyper rare/.test(raridade)
    ) {
      return 100;
    }

    if (
      /illustration rare|secret rare/.test(raridade)
    ) {
      return 90;
    }

    if (
      /ultra rare|rainbow|shiny/.test(raridade)
    ) {
      return 80;
    }

    if (
      /rare holo|holo rare/.test(raridade)
    ) {
      return 65;
    }

    if (/rare/.test(raridade)) {
      return 50;
    }

    return 10;
  }

  cartasDetalhadas.sort(
    (a, b) =>
      pontuacao(b) - pontuacao(a)
  );

  const cartasFinais = cartasDetalhadas.slice(
    0,
    18
  );

  cacheCartas.set(
    chave,
    cartasFinais
  );

  return cartasFinais;
}

// ==========================================
// GALERIA TCG NO MODAL
// ==========================================

function adicionarGaleriaTCG(pokemon) {
  const secao = criarElemento(
    "section",
    "tcg-section"
  );

  const titulo = criarElemento(
    "h3",
    "tcg-heading",
    "✦ Cartas colecionáveis"
  );

  const descricao = criarElemento(
    "p",
    "tcg-description",
    "Explore cartas reais do Pokémon TCG e descubra artes especiais."
  );

  const botao = criarElemento(
    "button",
    "tcg-button",
    "✦ Ver cartas colecionáveis"
  );

  botao.type = "button";

  const galeria = criarElemento(
    "div",
    "tcg-gallery"
  );

  secao.append(
    titulo,
    descricao,
    botao,
    galeria
  );

  modalBody.appendChild(secao);

  botao.addEventListener("click", async () => {
    const minhaConsulta = ++consultaTCGAtual;

    botao.disabled = true;
    botao.textContent = "Buscando cartas...";

    galeria.replaceChildren();

    galeria.appendChild(
      criarElemento(
        "p",
        "tcg-status",
        "Consultando a coleção Pokémon TCG..."
      )
    );

    try {
      const cartas = await buscarCartasTCG(
        pokemon.name
      );

      // IGNORA REQUISIÇÕES ANTIGAS

      if (
        minhaConsulta !== consultaTCGAtual ||
        !secao.isConnected
      ) {
        return;
      }

      galeria.replaceChildren();

      if (cartas.length === 0) {
        galeria.appendChild(
          criarElemento(
            "p",
            "tcg-status",
            "Nenhuma carta com imagem encontrada."
          )
        );

        return;
      }

      galeria.appendChild(
        criarElemento(
          "p",
          "tcg-status",
          `${cartas.length} cartas selecionadas. Clique para ampliar.`
        )
      );

      const grade = criarElemento(
        "div",
        "tcg-gallery-grid"
      );

      cartas.forEach(carta => {
        const botaoCarta = criarElemento(
          "button",
          "tcg-card"
        );

        botaoCarta.type = "button";

        botaoCarta.setAttribute(
          "aria-label",
          `Ampliar carta ${carta.name}`
        );

        const imagem = document.createElement(
          "img"
        );

        imagem.src = imagemCarta(
          carta,
          "low"
        );

        imagem.alt =
          `Carta Pokémon TCG ${carta.name}`;

        imagem.loading = "lazy";

        const nome = criarElemento(
          "span",
          "tcg-card-name",
          carta.name
        );

        const raridade = criarElemento(
          "span",
          "tcg-card-rarity",
          carta.rarity
        );

        botaoCarta.append(
          imagem,
          nome,
          raridade
        );

        botaoCarta.addEventListener(
          "click",
          () => {
            abrirCartaAmpliada(carta);
          }
        );

        grade.appendChild(botaoCarta);
      });

      galeria.appendChild(grade);

    } catch (erro) {
      console.error(
        "Erro na TCGdex:",
        erro
      );

      if (minhaConsulta === consultaTCGAtual) {
        galeria.replaceChildren(
          criarElemento(
            "p",
            "tcg-status",
            "Não foi possível carregar as cartas. Tente novamente."
          )
        );

        botao.textContent = "Tentar novamente";
      }

    } finally {
      if (minhaConsulta === consultaTCGAtual) {
        botao.disabled = false;

        if (
          botao.textContent !== "Tentar novamente"
        ) {
          botao.textContent = "↻ Atualizar galeria";
        }
      }
    }
  });
}

// ==========================================
// VISUALIZADOR DE CARTAS TCG
// ==========================================

function abrirCartaAmpliada(carta) {
  fecharCartaAmpliada();

  focoAntesVisor = document.activeElement;

  const visor = criarElemento(
    "div",
    "tcg-viewer"
  );

  visor.setAttribute(
    "role",
    "dialog"
  );

  visor.setAttribute(
    "aria-modal",
    "true"
  );

  visor.setAttribute(
    "aria-label",
    `Carta ${carta.name}`
  );

  const conteudo = criarElemento(
    "div",
    "tcg-viewer-content"
  );

  const fechar = criarElemento(
    "button",
    "tcg-viewer-close",
    "×"
  );

  fechar.type = "button";

  fechar.setAttribute(
    "aria-label",
    "Fechar carta"
  );

  const cartaVisual = criarElemento(
    "div",
    "tcg-holo-card"
  );

  const imagem = document.createElement(
    "img"
  );

  imagem.src = imagemCarta(
    carta,
    "high"
  );

  imagem.alt =
    `Carta colecionável ${carta.name}`;

  // IMAGEM ALTERNATIVA

  imagem.onerror = () => {
    const alternativa = imagemCarta(
      carta,
      "low"
    );

    if (
      imagem.dataset.fallback !== "1" &&
      alternativa
    ) {
      imagem.dataset.fallback = "1";
      imagem.src = alternativa;
    }
  };

  cartaVisual.appendChild(imagem);

  const titulo = criarElemento(
    "h3",
    "",
    carta.name
  );

  const raridade = criarElemento(
    "p",
    "",
    carta.rarity
  );

  conteudo.append(
    cartaVisual,
    titulo,
    raridade
  );

  visor.append(
    fechar,
    conteudo
  );

  document.body.appendChild(visor);

  visorTCG = visor;

  fechar.addEventListener(
    "click",
    fecharCartaAmpliada
  );

  visor.addEventListener("click", evento => {
    if (evento.target === visor) {
      fecharCartaAmpliada();
    }
  });

  // EFEITO HOLOGRÁFICO 3D

  cartaVisual.addEventListener(
    "pointermove",
    evento => {
      if (evento.pointerType !== "mouse") {
        return;
      }

      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        return;
      }

      const rect =
        cartaVisual.getBoundingClientRect();

      const x =
        (evento.clientX - rect.left) /
        rect.width;

      const y =
        (evento.clientY - rect.top) /
        rect.height;

      cartaVisual.style.transform =
        `perspective(900px) ` +
        `rotateY(${(x - 0.5) * 18}deg) ` +
        `rotateX(${(0.5 - y) * 18}deg)`;

      cartaVisual.style.setProperty(
        "--shine-x",
        `${x * 100}%`
      );
    }
  );

  cartaVisual.addEventListener(
    "pointerleave",
    () => {
      cartaVisual.style.transform = "";

      cartaVisual.style.setProperty(
        "--shine-x",
        "50%"
      );
    }
  );

  fechar.focus();
}

// ==========================================
// FECHAR CARTA TCG
// ==========================================

function fecharCartaAmpliada() {
  if (!visorTCG) {
    return;
  }

  visorTCG.remove();
  visorTCG = null;

  if (focoAntesVisor?.isConnected) {
    focoAntesVisor.focus();
  }
}

// ==========================================
// EVENTOS DO CATÁLOGO
// ==========================================

// PESQUISAR POKÉMON

campoBusca.addEventListener("input", () => {
  clearTimeout(timerBusca);

  timerBusca = setTimeout(() => {
    aplicarFiltros();
  }, 350);
});

// FILTRAR POR TIPO

filtroTipo.addEventListener("change", () => {
  clearTimeout(timerBusca);
  aplicarFiltros();
});

// LIMPAR FILTROS

botaoLimpar.addEventListener("click", () => {
  clearTimeout(timerBusca);

  campoBusca.value = "";
  filtroTipo.value = "all";

  aplicarFiltros();
});

// CARREGAR MAIS

botaoMais.addEventListener(
  "click",
  carregarMais
);

// ==========================================
// EVENTOS DO MODAL
// ==========================================

fecharModalBotao.addEventListener(
  "click",
  fecharModal
);

modal.addEventListener("click", evento => {
  if (
    evento.target.dataset.close === "true"
  ) {
    fecharModal();
  }
});

// ==========================================
// TECLADO — ESCAPE E TAB
// ==========================================

document.addEventListener(
  "keydown",
  evento => {
    if (evento.key === "Escape") {
      if (visorTCG) {
        fecharCartaAmpliada();
      } else if (!modal.hidden) {
        fecharModal();
      }

      return;
    }

    if (evento.key !== "Tab") {
      return;
    }

    const janelaAtiva =
      visorTCG ||
      (
        !modal.hidden
          ? modal.querySelector(".modal-content")
          : null
      );

    if (!janelaAtiva) {
      return;
    }

    const focaveis = [
      ...janelaAtiva.querySelectorAll(
        'button:not(:disabled):not([hidden]), a[href], input:not(:disabled)'
      )
    ].filter(
      elemento =>
        elemento.getClientRects().length > 0
    );

    if (focaveis.length === 0) {
      return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[
      focaveis.length - 1
    ];

    if (
      evento.shiftKey &&
      document.activeElement === primeiro
    ) {
      evento.preventDefault();
      ultimo.focus();

    } else if (
      !evento.shiftKey &&
      document.activeElement === ultimo
    ) {
      evento.preventDefault();
      primeiro.focus();
    }
  }
);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

carregarCatalogo();
