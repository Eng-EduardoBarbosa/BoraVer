// Chave v3 da API do TMDb (https://www.themoviedb.org/settings/api)
const API_KEY = 'f71685c012f8caf6fd050476576cea5b';

(() => {
  'use strict';

  const API_URL = 'https://api.themoviedb.org/3';
  const IMG_URL = 'https://image.tmdb.org/t/p/w500';
  const AREAS = ['humor', 'escrever', 'generos', 'busca'];

  const estado = {
    tipo: 'movie',      // 'movie' ou 'tv'
    generos: new Map(), // opções marcadas na aba Gêneros
    consultas: {},      // última consulta de cada área, usada no "Ver mais"
    paginas: {},
    versao: {},         // permite descartar respostas que chegam depois de uma busca mais nova
    pedido: 0           // o mesmo, para a aba Descrever
  };

  /* ---------- Dados ---------- */

  const nomesGeneros = {
    28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
    99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia', 36: 'História',
    27: 'Terror', 10402: 'Música', 9648: 'Mistério', 10749: 'Romance',
    878: 'Ficção científica', 10770: 'Filme para TV', 53: 'Suspense',
    10752: 'Guerra', 37: 'Faroeste',
    // Só existem em séries
    10759: 'Ação e aventura', 10762: 'Infantil', 10763: 'Notícias',
    10764: 'Reality show', 10765: 'Ficção e fantasia', 10766: 'Novela',
    10767: 'Talk show', 10768: 'Guerra e política'
  };

  // O TMDb usa outros gêneros para séries. null = não existe equivalente.
  const generosTV = {
    28: 10759, 12: 10759, 16: 16, 18: 18, 35: 35, 37: 37, 80: 80, 99: 99,
    878: 10765, 14: 10765, 9648: 9648, 10751: 10751, 10752: 10768,
    27: null, 53: null, 10402: null, 10749: null, 36: null
  };

  const humores = [
    {
      texto: 'Quero rir e relaxar', emoji: '😂', generos: [35, 10751], excluir: [27, 53],
      reacoes: ['Boa, hora de desligar a cabeça.', 'Bora aliviar o dia com algo leve.']
    },
    {
      texto: 'Quero sentir adrenalina', emoji: '⚡', generos: [28, 12, 53], excluir: [],
      reacoes: ['Opa, segura a emoção!', 'Já sinto o coração acelerando.']
    },
    {
      texto: 'Quero algo emocionante', emoji: '🥹', generos: [18, 10749], excluir: [],
      reacoes: ['Prepara o lencinho.', 'Daqueles que ficam na cabeça depois.']
    },
    {
      texto: 'Quero um mistério', emoji: '🕵️', generos: [9648, 53, 80], excluir: [],
      reacoes: ['Hora de virar detetive.', 'Daqueles que fazem a gente teorizar.']
    },
    {
      texto: 'Quero viajar para outro mundo', emoji: '🚀', generos: [878, 14, 12], excluir: [],
      reacoes: ['Vamos sair do planeta por umas horas.', 'Bora fugir da realidade um pouquinho.']
    },
    {
      texto: 'Quero levar susto', emoji: '👻', generos: [27, 53], excluir: [],
      reacoes: ['Ótimo, apaga a luz!', 'Corajoso(a), hein? Vamos nessa.']
    },
    {
      texto: 'Quero ver algo inteligente', emoji: '🧠', generos: [9648, 18, 878], excluir: [10751],
      reacoes: ['Gosto disso: algo pra pensar depois.', 'Daqueles que rendem conversa.']
    },
    {
      texto: 'Surpreenda-me', emoji: '🎲', generos: [], excluir: [],
      reacoes: ['Desafio aceito!', 'Fechado, confia que eu escolho.']
    }
  ];

  /*
   * Opções que não existem como gênero no TMDb.
   * "palavras" busca por tema, "ids" soma gêneros e "params" filtra por origem.
   */
  const generosExtras = {
    movie: [
      { nome: 'Anime', ids: [16], params: { with_original_language: 'ja' } },
      { nome: 'Filmes brasileiros', params: { with_original_language: 'pt' } }
    ],
    tv: [
      { nome: 'Terror', palavras: ['horror'] },
      { nome: 'Suspense', palavras: ['thriller'] },
      { nome: 'Romance', palavras: ['romance'] },
      { nome: 'Música', palavras: ['music'] },
      { nome: 'Anime', ids: [16], params: { with_original_language: 'ja' } },
      { nome: 'Doramas', ids: [18], params: { with_origin_country: 'KR' } },
      { nome: 'Séries brasileiras', params: { with_origin_country: 'BR' } }
    ]
  };

  /* Vocabulário da aba Descrever: palavras sem acento, comparadas pelo começo */

  const pistas = [
    { nome: 'ação',              id: 28,    chaves: ['acao', 'luta', 'adrenalina', 'heroi', 'perseguic', 'explosa'] },
    { nome: 'aventura',          id: 12,    chaves: ['aventura', 'jornada', 'explorar', 'viagem'] },
    { nome: 'animação',          id: 16,    chaves: ['animacao', 'desenho', 'anime', 'pixar'] },
    { nome: 'comédia',           id: 35,    chaves: ['comedia', 'engracad', 'divertid', 'piada', 'humor'] },
    { nome: 'crime',             id: 80,    chaves: ['crime', 'mafia', 'detetive', 'policial', 'assalto', 'gangue'] },
    { nome: 'documentário',      id: 99,    chaves: ['documentario', 'biografia'] },
    { nome: 'drama',             id: 18,    chaves: ['drama', 'emocion', 'chorar', 'superac', 'profund'] },
    { nome: 'família',           id: 10751, chaves: ['familia', 'infantil', 'crianca'] },
    { nome: 'fantasia',          id: 14,    chaves: ['fantasia', 'magia', 'magico', 'bruxo', 'dragao'] },
    { nome: 'terror',            id: 27,    chaves: ['terror', 'assustad', 'susto', 'medo', 'sobrenatural', 'monstro'] },
    { nome: 'música',            id: 10402, chaves: ['musica', 'musical', 'cantor', 'banda'] },
    { nome: 'mistério',          id: 9648,  chaves: ['misterio', 'enigma', 'investiga', 'reviravolta', 'twist'] },
    { nome: 'romance',           id: 10749, chaves: ['romanc', 'amor', 'casal', 'paixao', 'apaixon'] },
    { nome: 'ficção científica', id: 878,   chaves: ['ficcao', 'cientifica', 'espaco', 'futuro', 'alien', 'robo'] },
    { nome: 'suspense',          id: 53,    chaves: ['suspense', 'tenso', 'tensao', 'thriller', 'psicologic'] },
    { nome: 'guerra',            id: 10752, chaves: ['guerra', 'soldado', 'batalha'] },
    { nome: 'faroeste',          id: 37,    chaves: ['faroeste', 'western', 'cowboy'] },
    { nome: 'história',          id: 36,    chaves: ['historic', 'epoca', 'antiguidade'] }
  ];

  /*
   * Como a pessoa está. Não escolhe gênero, só afasta o que não combina.
   * "animar" e "acompanhar" são os rumos oferecidos quando ela só diz o sentimento.
   * "padrao" vale quando o clima já diz o que ela quer ("algo leve").
   */
  const climas = [
    { nome: 'triste',     chaves: ['triste', 'deprimid', 'chatead', 'desanimad'], evitar: [27, 53, 10752],     acompanhar: [18, 10749], animar: [35, 10751, 12] },
    { nome: 'estressado', chaves: ['estress', 'ansios', 'nervos', 'agitad'],      evitar: [27, 53, 80, 10752], acompanhar: [16, 10751], animar: [35, 16] },
    { nome: 'cansado',    chaves: ['cansad', 'exaust'],                           evitar: [27, 53],            acompanhar: [10751, 16], animar: [35, 10751] },
    { nome: 'leve',       chaves: ['leve', 'relax', 'tranquil', 'descontra'],     evitar: [27, 53, 10752],     padrao: [35, 10751, 16], rotulo: 'algo leve' }
  ];

  // Época, duração, nota e origem
  const filtros = [
    { nome: 'clássicos',             chaves: ['classico', 'antigo', 'velho'],               aplicar: (p, data) => { p[`${data}.lte`] = '1995-12-31'; } },
    { nome: 'lançamentos recentes',  chaves: ['recente', 'novinh', 'lancamento', 'atual'],  aplicar: (p, data) => { p[`${data}.gte`] = `${new Date().getFullYear() - 2}-01-01`; } },
    { nome: 'filmes curtos',         chaves: ['curto', 'curtinh', 'rapidinh'],              soFilmes: true, aplicar: (p) => { p['with_runtime.lte'] = 100; } },
    { nome: 'filmes longos',         chaves: ['longo', 'epico'],                            soFilmes: true, aplicar: (p) => { p['with_runtime.gte'] = 140; } },
    { nome: 'bem avaliados',         chaves: ['avaliad', 'aclamad', 'premiad', 'melhores'], aplicar: (p) => { p['vote_average.gte'] = 7.2; p['vote_count.gte'] = 500; } },
    { nome: 'produções brasileiras', chaves: ['brasileir', 'nacional'],                     aplicar: (p) => { p.with_original_language = 'pt'; } },
    { nome: 'produções coreanas',    chaves: ['coreano', 'coreana'],                        aplicar: (p) => { p.with_original_language = 'ko'; } },
    { nome: 'produções japonesas',   chaves: ['japones'],                                   aplicar: (p) => { p.with_original_language = 'ja'; } },
    { nome: 'produções francesas',   chaves: ['frances'],                                   aplicar: (p) => { p.with_original_language = 'fr'; } },
    { nome: 'produções espanholas',  chaves: ['espanhol'],                                  aplicar: (p) => { p.with_original_language = 'es'; } }
  ];

  const negacoes = ['sem', 'nao', 'nada'];
  const conectores = ['e', 'mas', 'ou', 'com']; // encerram o alcance de uma negação
  const aberturas = ['Pelo que entendi,', 'Beleza,', 'Anotado:', 'Então tá,'];

  const exemplos = [
    'Algo engraçado e leve, sem terror',
    'Algo tipo Shrek',
    'Comédia brasileira dos anos 90',
    'Um suspense curto e bem avaliado'
  ];

  // "algo tipo Shrek", "parecido com Interestelar"...
  const REFERENCIA = /\b(?:tipo|parecid[oa]s? com|similar(?:es)? a|igual a|no estilo de|na vibe de)\s+(.+?)(?=\s+(?:mas|so que|porem|sem)\b|[,.;!?]|$)/;

  /* ---------- Utilidades ---------- */

  const $ = (seletor) => document.querySelector(seletor);
  const $$ = (seletor) => [...document.querySelectorAll(seletor)];
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const nomeTipo = (tipo = estado.tipo) => (tipo === 'tv' ? 'séries' : 'filmes');
  const encurtar = (texto, limite) => (texto.length > limite ? `${texto.slice(0, limite - 3)}…` : texto);

  // ["a", "b", "c"] vira "a, b e c"
  function juntar(itens) {
    if (itens.length < 2) return itens.join('');
    return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
  }

  // Minúsculas e sem acento, para comparar palavras sem depender de como foram escritas
  function normalizar(texto) {
    return texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function adaptarGeneros(ids, tipo = estado.tipo) {
    if (tipo === 'movie') return ids;
    return [...new Set(ids.map((id) => generosTV[id]).filter((id) => id != null))];
  }

  // Todo texto vindo da API entra na página por textContent, nunca como HTML
  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function criarChip(texto, aoClicar) {
    const chip = elemento('button', 'chip', texto);
    chip.type = 'button';
    chip.addEventListener('click', aoClicar);
    return chip;
  }

  /* ---------- API ---------- */

  async function consultarTMDb(endpoint, params = {}) {
    if (API_KEY === 'COLE_SUA_CHAVE_AQUI') {
      throw new Error('Falta colocar a chave do TMDb no script.js.');
    }

    const url = new URL(API_URL + endpoint);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('include_adult', 'false');

    Object.entries(params).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        url.searchParams.set(chave, valor);
      }
    });

    let resposta;
    try {
      resposta = await fetch(url);
    } catch {
      throw new Error('Sem conexão com o TMDb. Confira sua internet.');
    }

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      throw new Error(corpo.status_message || `A consulta falhou (${resposta.status}).`);
    }

    return resposta.json();
  }

  /* ---------- Cards e listas ---------- */

  function criarPoster(caminho, titulo) {
    const semPoster = () => elemento('div', 'card__sem-poster', 'Pôster indisponível');
    if (!/^\/[\w-]+\.(jpg|png|webp)$/i.test(caminho || '')) return semPoster();

    const img = elemento('img', 'card__poster');
    img.src = IMG_URL + caminho;
    img.alt = `Pôster de ${titulo}`;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.replaceWith(semPoster()), { once: true });
    return img;
  }

  function criarCard(item, tipo) {
    const titulo = item.title || item.name || 'Título indisponível';
    const data = tipo === 'tv' ? item.first_air_date : item.release_date;
    const nota = Number(item.vote_average) || 0;

    const card = elemento('a', 'card');
    card.href = `https://www.themoviedb.org/${tipo}/${encodeURIComponent(item.id)}`;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', `Ver ${titulo} no TMDB`);

    const info = elemento('div', 'card__info');
    info.append(
      elemento('span', 'card__titulo', titulo),
      elemento('span', 'card__meta', data ? data.slice(0, 4) : 'Ano desconhecido'),
      elemento('span', 'card__nota', nota ? `★ ${nota.toFixed(1)}` : '★ —'),
      elemento('span', 'card__meta', encurtar(item.overview || 'Sinopse indisponível.', 145))
    );

    card.append(criarPoster(item.poster_path, titulo), info);
    return card;
  }

  function mostrarFilmes(grade, itens, tipo, substituir) {
    if (substituir) grade.replaceChildren();

    if (!itens.length) {
      if (substituir) {
        grade.append(elemento('div', 'vazio',
          `Não encontramos ${nomeTipo(tipo)} com essa combinação. Tente mudar um pouco os filtros.`));
      }
      return;
    }

    grade.append(...itens.map((item) => criarCard(item, tipo)));
  }

  const definirStatus = (area, mensagem) => { $(`#status-${area}`).textContent = mensagem; };

  function novaVersao(area) {
    estado.versao[area] = (estado.versao[area] || 0) + 1;
    return estado.versao[area];
  }

  function limparResultados(area) {
    novaVersao(area); // invalida qualquer busca ainda em andamento
    $(`#resultados-${area}`).replaceChildren();
    $(`#mais-${area}`).hidden = true;
    definirStatus(area, '');
    delete estado.consultas[area];
  }

  /*
   * Executa uma consulta paginada e desenha o resultado.
   * Devolve quantos itens chegaram, ou null se falhou ou foi descartada.
   */
  async function carregar(area, consulta, pagina = 1) {
    const { tipo } = consulta;
    const versao = novaVersao(area);
    const atual = () => versao === estado.versao[area];
    const botaoMais = $(`#mais-${area}`);

    botaoMais.disabled = true;
    botaoMais.textContent = 'Carregando…';
    definirStatus(area, `Procurando ${nomeTipo(tipo)} para você…`);

    try {
      const dados = await consultarTMDb(consulta.endpoint, { ...consulta.params, page: pagina });
      if (!atual()) return null;

      const resultados = dados.results || [];
      mostrarFilmes($(`#resultados-${area}`), resultados, tipo, pagina === 1);

      estado.consultas[area] = consulta;
      estado.paginas[area] = pagina;

      const total = Number(dados.total_results) || 0;
      definirStatus(area, resultados.length
        ? `${total.toLocaleString('pt-BR')} ${nomeTipo(tipo)} encontrados. Página ${pagina}.`
        : `Nenhum resultado encontrado para ${nomeTipo(tipo)}.`);

      botaoMais.hidden = pagina >= Math.min(dados.total_pages || 1, 500);
      return resultados.length;
    } catch (erro) {
      if (atual()) definirStatus(area, `Não foi possível carregar ${nomeTipo(tipo)}. ${erro.message}`);
      return null;
    } finally {
      if (atual()) {
        botaoMais.disabled = false;
        botaoMais.textContent = `Ver mais ${nomeTipo(tipo)} ↓`;
      }
    }
  }

  function descobrir(area, params, tipo = estado.tipo) {
    return carregar(area, {
      endpoint: `/discover/${tipo}`,
      params: { sort_by: 'popularity.desc', 'vote_count.gte': 80, ...params },
      tipo
    });
  }

  AREAS.forEach((area) => {
    $(`#mais-${area}`).addEventListener('click', () => {
      const consulta = estado.consultas[area];
      if (consulta) carregar(area, consulta, estado.paginas[area] + 1);
    });
  });

  /* ---------- Filmes ou séries ---------- */

  function trocarTipo(tipo) {
    if (estado.tipo === tipo) return;
    estado.tipo = tipo;
    estado.pedido += 1;
    estado.generos.clear();

    $$('.tipo-conteudo__botao').forEach((botao) => {
      const ativo = botao.dataset.tipo === tipo;
      botao.classList.toggle('tipo-conteudo__botao--ativo', ativo);
      botao.setAttribute('aria-pressed', String(ativo));
    });

    AREAS.forEach(limparResultados);
    limparRumos();
    boasVindas();
    montarOpcoesHumor();
    carregarGeneros();
  }

  $$('.tipo-conteudo__botao').forEach((botao) => {
    botao.addEventListener('click', () => trocarTipo(botao.dataset.tipo));
  });

  /* ---------- Abas ---------- */

  function trocarAba(nome) {
    $$('.aba').forEach((aba) => {
      const ativa = aba.dataset.aba === nome;
      aba.classList.toggle('aba--ativa', ativa);
      aba.setAttribute('aria-selected', String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
    });

    $$('.painel').forEach((painel) => { painel.hidden = painel.id !== `painel-${nome}`; });
  }

  $$('.aba').forEach((aba) => {
    aba.addEventListener('click', () => trocarAba(aba.dataset.aba));
  });

  // Setas do teclado alternam entre as abas
  $('.abas').addEventListener('keydown', (evento) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    const abas = $$('.aba');
    const atual = abas.indexOf(document.activeElement);
    if (!passo || atual < 0) return;

    const proxima = abas[(atual + passo + abas.length) % abas.length];
    trocarAba(proxima.dataset.aba);
    proxima.focus();
  });

  /* ---------- Meu momento ---------- */

  function adicionarBalao(texto, autor = 'bot') {
    $('#conversa').append(elemento('div', `balao balao--${autor}`, texto));
  }

  function boasVindas(recomecando = false) {
    const hora = new Date().getHours();
    const saudacao = hora < 5 ? 'Madrugada, hein' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

    $('#conversa').replaceChildren();
    adicionarBalao(recomecando
      ? 'Bora de novo! Qual é a sua vibe agora?'
      : `${saudacao}! Qual é a sua vibe agora?`);
  }

  function montarOpcoesHumor() {
    $('#opcoes').replaceChildren(...humores.map((humor) => {
      const chip = criarChip(`${humor.emoji} ${humor.texto}`, () => escolherHumor(humor, chip));
      return chip;
    }));
  }

  async function escolherHumor(humor, botao) {
    const botoes = $$('#opcoes .chip');
    botoes.forEach((chip) => {
      chip.disabled = true;
      chip.classList.toggle('chip--ativo', chip === botao);
    });

    const generos = adaptarGeneros(humor.generos);
    const excluir = adaptarGeneros(humor.excluir);

    // Séries sem equivalente para o gênero pedido caem na lista popular; avisamos
    const complemento = humor.generos.length && !generos.length
      ? 'Séries não têm essa categoria no TMDb, então separei as mais populares.'
      : `Separei ${nomeTipo()} com esse clima.`;

    adicionarBalao(`${humor.emoji} ${humor.texto}`, 'voce');
    adicionarBalao(`${sortear(humor.reacoes)} ${complemento}`);

    const params = {};
    if (generos.length) params.with_genres = generos.join('|'); // "|" = qualquer um deles
    if (excluir.length) params.without_genres = excluir.join(',');
    if (!humor.generos.length) params['vote_count.gte'] = 250; // "Surpreenda-me"

    limparResultados('humor');
    await descobrir('humor', params);

    botoes.forEach((chip) => { chip.disabled = false; });
  }

  $('#reiniciar').addEventListener('click', () => {
    limparResultados('humor');
    boasVindas(true);
    montarOpcoesHumor();
  });

  /* ---------- Descrever ---------- */

  // Procura "sem", "não" ou "nada" logo antes da palavra
  function estaNegada(palavras, posicao) {
    for (let i = posicao - 1; i >= Math.max(0, posicao - 3); i--) {
      if (conectores.includes(palavras[i])) return false;
      if (negacoes.includes(palavras[i])) return true;
    }
    return false;
  }

  // "anos 90", "anos 2000"... viram um intervalo de datas
  function extrairDecada(texto) {
    const achou = texto.match(/\banos\s+(\d{2}|\d{4})\b/);
    if (!achou) return null;

    let ano = Number(achou[1]);
    if (ano < 100) ano += ano < 30 ? 2000 : 1900;
    if (ano < 1920 || ano > 2020) return null;

    return { rotulo: `dos anos ${achou[1]}`, inicio: ano - (ano % 10) };
  }

  // Título citado depois de "tipo", "parecido com"... ou null
  function extrairReferencia(texto) {
    const limpo = normalizar(texto);
    const achou = limpo.match(REFERENCIA);
    if (!achou) return null;

    // O texto normalizado costuma ter o mesmo tamanho do original, o que permite recortar o título
    const origem = limpo.length === texto.length ? texto : limpo;
    const inicio = achou.index + achou[0].length - achou[1].length;
    const titulo = origem.slice(inicio, inicio + achou[1].length).trim();

    // "tipo ação" e "que tipo de filme" não citam um título
    const primeira = achou[1].split(' ')[0];
    const ehGenero = pistas.some((pista) => pista.chaves.some((chave) => primeira.startsWith(chave)));
    const ehConversa = /^(de|do|da|um|uma|filme|serie)\b/.test(achou[1]);

    return titulo && !ehGenero && !ehConversa ? titulo : null;
  }

  function interpretarTexto(texto) {
    const limpo = normalizar(texto);
    const palavras = limpo.split(/[^a-z0-9]+/).filter(Boolean);
    const campoData = estado.tipo === 'tv' ? 'first_air_date' : 'primary_release_date';

    const generos = new Set();
    const evitar = new Set();
    const entendi = [];
    const fora = [];
    const avisos = [];
    const params = {};
    let sentimento = null;
    let padrao = [];

    const anotar = (lista, item) => { if (!lista.includes(item)) lista.push(item); };

    palavras.forEach((palavra, posicao) => {
      const comeca = (regra) => regra.chaves.some((chave) => palavra.startsWith(chave));
      const negada = estaNegada(palavras, posicao);

      pistas.filter(comeca).forEach((pista) => {
        if (negada) {
          evitar.add(pista.id);
          anotar(fora, pista.nome);
        } else {
          generos.add(pista.id);
          anotar(entendi, pista.nome);
        }
      });

      climas.filter(comeca).forEach((clima) => {
        clima.evitar.forEach((id) => evitar.add(id));

        if (clima.padrao) {
          padrao = clima.padrao;
          anotar(entendi, clima.rotulo);
        } else {
          sentimento ||= clima;
        }
      });

      filtros.filter(comeca).forEach((filtro) => {
        if (entendi.includes(filtro.nome)) return;

        if (filtro.soFilmes && estado.tipo === 'tv') {
          anotar(avisos, 'A duração só dá pra filtrar em filmes, então ignorei isso.');
          return;
        }

        filtro.aplicar(params, campoData);
        entendi.push(filtro.nome);
      });
    });

    const decada = extrairDecada(limpo);
    if (decada) {
      params[`${campoData}.gte`] = `${decada.inicio}-01-01`;
      params[`${campoData}.lte`] = `${decada.inicio + 9}-12-31`;
      entendi.push(decada.rotulo);
    }

    // Sem gênero citado, mas com algo como "leve", vale o gênero padrão desse clima
    const usouPadrao = !generos.size && padrao.length > 0;
    const ids = usouPadrao ? padrao : [...generos];

    // Se a pessoa pediu um gênero, o pedido vence qualquer "evitar"
    ids.forEach((id) => evitar.delete(id));

    const adaptados = adaptarGeneros(ids);
    const semEquivalente = estado.tipo === 'tv' ? ids.filter((id) => generosTV[id] === null) : [];

    if (semEquivalente.length) {
      const nomes = semEquivalente.map((id) => nomesGeneros[id].toLowerCase());
      anotar(avisos, `Em séries não existe a categoria ${juntar(nomes)}, então ignorei isso.`);
    }

    // Até 2 gêneros precisam aparecer juntos ("comédia romântica"); com 3 ou mais, basta um
    if (adaptados.length) {
      params.with_genres = adaptados.join(adaptados.length <= 2 && !usouPadrao ? ',' : '|');
    }

    const excluir = adaptarGeneros([...evitar]);
    if (excluir.length) params.without_genres = excluir.join(',');

    const temFiltro = Object.keys(params).some((chave) => chave !== 'without_genres');

    return {
      params,
      entendi,
      fora,
      avisos,
      sentimento,
      evitar: [...evitar],
      // Só o sentimento, sem gênero nem filtro: vale perguntar pra onde ir
      perguntar: Boolean(sentimento) && !ids.length && !temFiltro,
      entendeuAlgo: Object.keys(params).length > 0
    };
  }

  // Frase que mostra o que foi entendido do pedido
  function descreverPedido({ entendi, fora, avisos }) {
    const querendo = entendi.length
      ? `você quer ${juntar(entendi)}`
      : 'vou escolher algo popular que combine com o seu momento';

    let frase = `${sortear(aberturas)} ${querendo}`;
    if (fora.length) frase += `, sem ${juntar(fora)}`;

    return [`${frase}. Olha o que separei:`, ...avisos].join(' ');
  }

  const limparRumos = () => $('#rumos-escrever').replaceChildren();

  // Quando a pessoa só diz como se sente, pergunta o rumo em vez de chutar um gênero
  function perguntarRumo({ sentimento, evitar }) {
    definirStatus('escrever',
      `Parece que você tá ${sentimento.nome}. Quer algo pra levantar o astral ou prefere algo que combine com esse momento?`);

    const rumos = [
      { texto: 'Levantar o astral', generos: sentimento.animar },
      { texto: 'Combinar com o momento', generos: sentimento.acompanhar }
    ];

    $('#rumos-escrever').replaceChildren(...rumos.map((rumo) => criarChip(rumo.texto, async () => {
      limparRumos();

      const params = {};
      const ids = adaptarGeneros(rumo.generos);
      const excluir = adaptarGeneros(evitar.filter((id) => !rumo.generos.includes(id)));

      if (ids.length) params.with_genres = ids.join('|');
      if (excluir.length) params.without_genres = excluir.join(',');

      if (await descobrir('escrever', params)) {
        definirStatus('escrever', `Boa! Separei ${nomeTipo()} pra ${rumo.texto.toLowerCase()}:`);
      }
    })));
  }

  // "algo tipo Shrek": acha o título e busca algo com gêneros e temas parecidos
  async function recomendarParecidos(titulo, sessao) {
    const tipo = estado.tipo;
    const desatualizado = () => sessao !== estado.pedido || tipo !== estado.tipo;

    definirStatus('escrever', `Procurando “${titulo}”…`);

    try {
      const busca = await consultarTMDb(`/search/${tipo}`, { query: titulo });
      if (desatualizado()) return;

      const base = busca.results?.[0];
      if (!base) {
        definirStatus('escrever', `Não achei nenhum título chamado “${titulo}”. Confere o nome?`);
        return;
      }

      const [detalhes, temas] = await Promise.all([
        consultarTMDb(`/${tipo}/${base.id}`),
        consultarTMDb(`/${tipo}/${base.id}/keywords`)
      ]);
      if (desatualizado()) return;

      const params = {};
      const generos = (detalhes.genres || []).slice(0, 2).map((g) => g.id);
      const palavras = (temas.keywords || temas.results || []).slice(0, 4).map((k) => k.id);

      if (generos.length) params.with_genres = generos.join(',');
      if (palavras.length) params.with_keywords = palavras.join('|');

      let achou = await descobrir('escrever', params);

      // Temas demais podem deixar a busca estreita; tenta só com os gêneros
      if (!achou && params.with_keywords) {
        delete params.with_keywords;
        achou = await descobrir('escrever', params);
      }

      if (achou) {
        definirStatus('escrever',
          `Se você curte “${base.title || base.name}”, olha o que tem um clima parecido:`);
      }
    } catch (erro) {
      if (!desatualizado()) definirStatus('escrever', `Não foi possível buscar agora. ${erro.message}`);
    }
  }

  async function pedirPorTexto(texto) {
    estado.pedido += 1;
    const sessao = estado.pedido;

    limparResultados('escrever');
    limparRumos();

    const titulo = extrairReferencia(texto);
    if (titulo) {
      await recomendarParecidos(titulo, sessao);
      return;
    }

    const leitura = interpretarTexto(texto);

    if (leitura.perguntar) {
      perguntarRumo(leitura);
      return;
    }

    if (!leitura.entendeuAlgo) {
      definirStatus('escrever', leitura.avisos.join(' ') ||
        'Hmm, não peguei o clima. Tenta falar um gênero ("comédia", "suspense"), como você tá ("triste", "cansado") ou um título que você curtiu ("tipo Shrek").');
      return;
    }

    // Sem gênero definido, exige um mínimo de qualidade pra não vir coisa aleatória
    if (!leitura.params.with_genres) {
      leitura.params['vote_average.gte'] ||= 6.2;
      leitura.params['vote_count.gte'] ||= 150;
    }

    if (await descobrir('escrever', leitura.params)) {
      definirStatus('escrever', descreverPedido(leitura));
    }
  }

  const atualizarContador = () => {
    $('#contador-texto').textContent = `${$('#campo-escrever').value.length}/400`;
  };

  $('#campo-escrever').addEventListener('input', atualizarContador);

  $('#form-escrever').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const texto = $('#campo-escrever').value.trim();
    if (texto) pedirPorTexto(texto);
  });

  $('#exemplos').replaceChildren(...exemplos.map((texto) => criarChip(texto, () => {
    $('#campo-escrever').value = texto;
    atualizarContador();
    pedirPorTexto(texto);
  })));

  /* ---------- Gêneros ---------- */

  const cacheTemas = new Map();

  // Converte uma palavra-chave (em inglês) nos IDs do TMDb, guardando para não repetir a consulta
  async function idsDeTema(palavra) {
    if (cacheTemas.has(palavra)) return cacheTemas.get(palavra);

    const dados = await consultarTMDb('/search/keyword', { query: palavra });
    const lista = dados.results || [];
    const exata = lista.find((k) => k.name.toLowerCase() === palavra);

    const ids = [exata, ...lista.filter((k) => k !== exata)]
      .filter(Boolean)
      .slice(0, 3)
      .map((k) => k.id);

    cacheTemas.set(palavra, ids);
    return ids;
  }

  // Junta tudo o que foi marcado em parâmetros de busca
  async function montarParametrosGeneros() {
    const ids = new Set();
    const temas = new Set();
    const params = {};

    estado.generos.forEach((opcao) => {
      (opcao.ids || []).forEach((id) => ids.add(id));
      (opcao.palavras || []).forEach((palavra) => temas.add(palavra));
      Object.assign(params, opcao.params);
    });

    // Os gêneros marcados precisam aparecer juntos; dos temas, basta um
    if (ids.size) params.with_genres = [...ids].join(',');

    if (temas.size) {
      const grupos = await Promise.all([...temas].map(idsDeTema));
      const todos = [...new Set(grupos.flat())];
      if (todos.length) params.with_keywords = todos.join('|');
    }

    return params;
  }

  async function carregarGeneros() {
    const tipo = estado.tipo;
    const lista = $('#lista-generos');

    lista.replaceChildren(elemento('p', 'status', 'Carregando gêneros…'));

    try {
      const dados = await consultarTMDb(`/genre/${tipo}/list`);
      if (tipo !== estado.tipo) return;

      const opcoes = [
        ...dados.genres.map((g) => ({ chave: `g${g.id}`, nome: nomesGeneros[g.id] || g.name, ids: [g.id] })),
        ...(generosExtras[tipo] || []).map((extra) => ({ chave: `x-${extra.nome}`, ...extra }))
      ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      lista.replaceChildren(...opcoes.map((opcao) => {
        const chip = criarChip(opcao.nome, () => {
          const marcado = !estado.generos.has(opcao.chave);

          if (marcado) estado.generos.set(opcao.chave, opcao);
          else estado.generos.delete(opcao.chave);

          chip.classList.toggle('chip--ativo', marcado);
          chip.setAttribute('aria-pressed', String(marcado));
        });

        chip.setAttribute('aria-pressed', 'false');
        return chip;
      }));
    } catch (erro) {
      if (tipo !== estado.tipo) return;
      lista.replaceChildren(elemento('p', 'status',
        `Não foi possível carregar os gêneros. ${erro.message}`));
    }
  }

  $('#buscar-generos').addEventListener('click', async () => {
    if (!estado.generos.size) {
      definirStatus('generos', 'Escolha pelo menos um gênero para continuar.');
      return;
    }

    const tipo = estado.tipo;
    limparResultados('generos');
    definirStatus('generos', `Procurando ${nomeTipo(tipo)} para você…`);

    try {
      const params = await montarParametrosGeneros();
      if (tipo !== estado.tipo) return;

      if ($('#genero-bem-avaliados').checked) {
        params['vote_average.gte'] = 6.8;
        params['vote_count.gte'] = 150;
        params.sort_by = 'vote_average.desc';
      }

      await descobrir('generos', params, tipo);
    } catch (erro) {
      definirStatus('generos', `Não foi possível montar a busca. ${erro.message}`);
    }
  });

  /* ---------- Buscar por título ---------- */

  $('#form-busca').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const termo = $('#campo-busca').value.trim();
    if (!termo) return;

    const tipo = estado.tipo;
    limparResultados('busca');

    const total = await carregar('busca', { endpoint: `/search/${tipo}`, params: { query: termo }, tipo });
    if (total === 0) definirStatus('busca', `Não encontramos resultados para “${termo}”. Tente outro título.`);
  });

  /* ---------- Início ---------- */

  boasVindas();
  montarOpcoesHumor();
  carregarGeneros();
})();