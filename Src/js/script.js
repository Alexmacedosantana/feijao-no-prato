/* =========================================================================
   FEIJÃO NO PRATO — CARDÁPIO DIGITAL
   Código organizado em seções:
   1. Configurações gerais
   2. Dados do cardápio
   3. Estado da aplicação
   4. Funções utilitárias
   5. Renderização
   6. Carrinho
   7. Aviso de funcionamento
   8. Inicialização
   ========================================================================= */
//configurações gerais do cardápio, incluindo número do WhatsApp e horários de funcionamento
const CONFIG = {
  numeroWhatsApp: "556899350643",
  horarios: {
    0: { abre: 9, fecha: 14 },
    1: { abre: 9, fecha: 14 },
    2: { abre: 9, fecha: 14 },
    3: { abre: 9, fecha: 14 },
    4: { abre: 9, fecha: 14 },
    5: { abre: 9, fecha: 14 },
    6: { abre: 9, fecha: 14 },
  }
};

const CHAVE_LOCALSTORAGE = "feijaoNoPrato_carrinho";

// Os índices seguem o padrão do JavaScript: 0 é domingo e 1 a 6 são segunda a sábado.
const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const NOMES_DIAS_ABREV = [, "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// O cardápio de pratos está no HTML.
const hoje = new Date();
const diaDeHoje = hoje.getDay();
const diaCardapioAtual = diaDeHoje === 0 ? 1 : diaDeHoje;

let estado = {
  categoriaAtiva: "todos",
  diaSelecionado: diaCardapioAtual,
  termoBusca: "",
  tipoEntrega: "retirada",
  formaPagamento: "pix",
  carrinho: carregarCarrinho(),
};
// Guarda todos os produtos originais antes que a grade seja redesenhada pelos filtros.
let itensCardapio = [];
//função que retorna todos os itens do cardapoio, para que seja possível filtrar e buscar sem precisar ler o DOM novamente
function todosOsItens() {
  return itensCardapio;
}
// Funções utilitárias
function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
// Normaliza o texto para facilitar a busca, removendo acentos e convertendo para minúsculas.
function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
//função que retorna o prato executivo do dia, caso exista, ou undefined caso não exista
function obterExecutivoPorDia(diaIndex) {
  return todosOsItens().find(
    (item) => item.categoria === "executivos" && item.dia === diaIndex,
  );
}
//função que lê os itens do DOM e retorna um array de objetos representando cada prato, com suas propriedades
function lerItensDoDom() {
  const cards = Array.from(document.querySelectorAll(".cartao-prato"));

  return cards.map((card) => ({
    id: card.querySelector("button[data-id]")?.dataset.id || "",
    categoria: card.dataset.categoria || "",

    dia:
      card.dataset.dia !== undefined && card.dataset.dia !== ""
        ? Number(card.dataset.dia)
        : undefined,

    nome: card.querySelector("h4")?.textContent.trim() || "",

    imagem:
      card.querySelector(".imagem-prato")?.getAttribute("src") ||
      "assets/img/placeholder-cardapio.svg",

    desc: card.querySelector(".desc-prato")?.textContent.trim() || "",

    preco: Number(
      (card.querySelector(".preco")?.textContent || "0")
        .replace(/[R$\.\s]/g, "")
        .replace(",", "."),
    ),

    tags: Array.from(card.querySelectorAll(".etiqueta")).map((tag) =>
      tag.textContent.trim(),
    ),

    busca: card.dataset.busca || "",
  }));
}
//função que busca um item pelo id, retornando o objeto do item caso encontrado, ou undefined caso não encontrado
function buscarItemPorId(id) {
  // Busca o item diretamente no DOM. O cardápio está todo declarado no HTML.
  return todosOsItens().find((item) => item.id === id);
}
//função que cria o HTML de um cartão de prato, incluindo selo de destaque e etiquetas, retornando uma string com o HTML completo
function criarHtmlCartaoPrato(item) {
  const seloDestaque =
    item.categoria === "executivos" && typeof item.dia !== "undefined"
      ? `<span class="selo-destaque">${
          item.dia === diaDeHoje ? "Hoje" : NOMES_DIAS_ABREV[item.dia]
        }</span>`
      : "";

  const etiquetas = Array.isArray(item.tags)
    ? item.tags.map((tag) => `<span class="etiqueta">${tag}</span>`).join("")
    : "";

  return `
    <article
      class="cartao-prato"
      data-categoria="${item.categoria}"
      data-dia="${item.dia ?? ""}"
      data-busca="${item.busca || ""}"
      data-preco="${item.preco}"
    >

      <img
        class="imagem-prato"
        src="${item.imagem || "assets/img/placeholder-cardapio.svg"}"
        alt="${item.nome}"
      >

      <div class="cartao-topo">
        <h4>${item.nome}</h4>
        ${seloDestaque}
      </div>

      <p class="desc-prato">${item.desc}</p>

      <div class="etiquetas">
        ${etiquetas}
      </div>

      <div class="cartao-rodape">
        <span class="preco">${formatarPreco(item.preco)}</span>

        <button class="btn-adicionar" data-id="${item.id}">
          Adicionar
        </button>
      </div>

    </article>
  `;
}
//função que renderiza o seletor de dias, mostrando apenas quando a categoria ativa é "executivos", e destacando o dia selecionado
function renderizarSeletorDias() {
  const container = document.getElementById("seletorDias");
  const navCardapio = document.getElementById("cardapio");
  if (estado.categoriaAtiva !== "executivos") {
    navCardapio.style.display = "none";
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }
  navCardapio.style.display = "block";
  container.style.display = "flex";
  const ordemDias = [1, 2, 3, 4, 5, 6];
  container.innerHTML = ordemDias
    .map(
      (dia) => `
    <button class="chip-dia ${estado.diaSelecionado === dia ? "selecionado" : ""}" data-dia="${dia}" role="tab" aria-selected="${estado.diaSelecionado === dia}">
      <span>${NOMES_DIAS_ABREV[dia]}</span>
      ${dia === diaCardapioAtual ? '<span class="rotulo-hoje">Hoje</span>' : ""}
    </button>
  `,
    )
    .join("");
}

//função que renderiza o prato do dia, mostrando o prato executivo do dia atual, ou o primeiro prato executivo encontrado caso não haja prato para o dia atual
function renderizarPratoDoDia() {
  const prato =
    obterExecutivoPorDia(estado.diaSelecionado) ||
    todosOsItens().find((item) => item.categoria === "executivos");
  const container = document.getElementById("cartaoPratoDoDia");
  if (!prato) {
    container.innerHTML = `<p>Prato do dia não encontrado.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="imagem-prato-do-dia">
      <img src="${prato.imagem}" alt="${prato.nome}" />
      <h3>${prato.nome}</h3>
    </div>
    <div class="selo-carimbo">Prato<br>do dia</div>
    <p class="dia-label">${NOMES_DIAS[estado.diaSelecionado]}-feira</p>
    <p class="desc-prato">${prato.desc}</p>
    <div class="linha-preco-add">
      <span class="preco">${formatarPreco(prato.preco)} <small>/ prato</small></span>
      <button class="btn-adicionar" data-id="${prato.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Adicionar
      </button>
    </div>
  `;
  container.querySelector("button[data-id]").addEventListener("click", (e) => {
    adicionarAoCarrinho(prato.id);
    animarBotaoAdicionado(e.currentTarget);
  });
}
//função que retorna os itens a serem exibidos na grade, filtrando por categoria e termo de busca
function itensParaExibir() {
  const todosCards = Array.from(document.querySelectorAll(".cartao-prato"));
  let itens = todosCards.filter((card) => {
    const categoria = card.dataset.categoria || "";
    if (estado.categoriaAtiva === "todos") return true;
    if (estado.categoriaAtiva === "executivos")
      return categoria === "executivos";
    return categoria === estado.categoriaAtiva;
  });

  if (estado.termoBusca.trim() !== "") {
    const termo = normalizarTexto(estado.termoBusca);
    itens = itens.filter((card) => {
      const texto = `${card.dataset.busca || ""} ${card.querySelector("h4")?.textContent || ""} ${card.querySelector(".desc-prato")?.textContent || ""}`;
      return normalizarTexto(texto).includes(termo);
    });
  }

  return itens;
}
//função que renderiza a grade de pratos, incluindo o seletor de dias, o título da seção e a contagem de itens, além de adicionar os event listeners para os botões de adicionar ao carrinho
function renderizarGrade() {
  renderizarSeletorDias();

  const grade = document.getElementById("gradePratos");
  const titulo = document.getElementById("tituloSecao");
  const contagem = document.getElementById("contagemItens");

  const nomesTitulo = {
    todos: "Cardápio completo",
    executivos: "Prato executivo",
    marmitas: "Marmitas",
    bebidas: "Bebidas",
    sobremesas: "Sobremesas",
  };

  let itens = [];

  if (estado.categoriaAtiva === "executivos") {
    // Mostra todos os pratos executivos cadastrados para o dia escolhido.
    itens = todosOsItens().filter(
      (item) =>
        item.categoria === "executivos" && item.dia === estado.diaSelecionado,
    );
  } else if (estado.categoriaAtiva === "todos") {
    // A opção Cardápio mostra todos os produtos, inclusive os executivos de todos os dias.
    itens = todosOsItens();
  } else {
    itens = todosOsItens().filter(
      (item) => item.categoria === estado.categoriaAtiva,
    );
  }

  if (estado.termoBusca.trim() !== "") {
    const termo = normalizarTexto(estado.termoBusca);
    itens = itens.filter((item) => {
      const texto = `${item.busca || ""} ${item.nome} ${item.desc}`;
      return normalizarTexto(texto).includes(termo);
    });
  }

  const tituloAtual =
    estado.categoriaAtiva === "executivos"
      ? `Cardápio de ${NOMES_DIAS[estado.diaSelecionado]} `
      : nomesTitulo[estado.categoriaAtiva] + " ";
  titulo.childNodes[0].textContent = tituloAtual;
  contagem.textContent =
    itens.length > 0
      ? `(${itens.length} ${itens.length === 1 ? "item" : "itens"})`
      : "";

  if (itens.length === 0) {
    grade.innerHTML = `
      <div class="sem-resultados" style="grid-column:1/-1;">
        <div class="emoji">🔍</div>
        <p>Nenhum prato encontrado para "<strong>${estado.termoBusca}</strong>". Tente outra busca.</p>
      </div>
    `;
    return;
  }

  grade.innerHTML = itens.map(criarHtmlCartaoPrato).join("");

  grade.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      adicionarAoCarrinho(btn.dataset.id);
      animarBotaoAdicionado(e.currentTarget);
    });
  });
}

//função que anima o botão de adicionar ao carrinho, mostrando um ícone de check e a palavra "Adicionado" por 1,1 segundos antes de voltar ao estado original
function animarBotaoAdicionado(botao) {
  const textoOriginal = botao.innerHTML;
  botao.classList.add("adicionado");
  botao.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Adicionado`;
  setTimeout(() => {
    botao.classList.remove("adicionado");
    botao.innerHTML = textoOriginal;
  }, 1100);
}

function renderizarTudo() {
  renderizarGrade();
}


//função que carrega o carrinho do localStorage, retornando um array de itens ou um array vazio caso não haja dados salvos
function carregarCarrinho() {
  try {
    const dados = localStorage.getItem(CHAVE_LOCALSTORAGE);
    return dados ? JSON.parse(dados) : [];
  } catch (e) {
    console.error("Erro ao carregar carrinho do localStorage:", e);
    return [];
  }
}
//função que salva o carrinho no localStorage, convertendo o array de itens em JSON e tratando possíveis erros
function salvarCarrinho() {
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(estado.carrinho));
  } catch (e) {
    console.error("Erro ao salvar carrinho no localStorage:", e);
  }
}
//função que adiciona um item ao carrinho, verificando se o item já existe e incrementando a quantidade, ou adicionando um novo item com quantidade 1 caso não exista
function adicionarAoCarrinho(id) {
  const itemExistente = estado.carrinho.find((i) => i.id === id);
  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    const itemBase = buscarItemPorId(id);
    estado.carrinho.push({
      id: itemBase.id,
      nome: itemBase.nome,
      preco: itemBase.preco,
      quantidade: 1,
    });
  }
  salvarCarrinho();
  atualizarContadorCarrinho(true);
  renderizarCarrinho();
}
//função que altera a quantidade de um item no carrinho, recebendo o id do item e o delta (positivo ou negativo), removendo o item caso a quantidade chegue a zero ou menos
function alterarQuantidade(id, delta) {
  const item = estado.carrinho.find((i) => i.id === id);
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) {
    estado.carrinho = estado.carrinho.filter((i) => i.id !== id);
  }
  salvarCarrinho();
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

function removerDoCarrinho(id) {
  estado.carrinho = estado.carrinho.filter((i) => i.id !== id);
  salvarCarrinho();
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

function totalCarrinho() {
  return estado.carrinho.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0,
  );
}

function quantidadeTotalCarrinho() {
  return estado.carrinho.reduce((soma, item) => soma + item.quantidade, 0);
}

function atualizarContadorCarrinho(comAnimacao) {
  const contador = document.getElementById("contadorCarrinho");
  contador.textContent = quantidadeTotalCarrinho();
  if (comAnimacao) {
    contador.classList.remove("pulsar");
    void contador.offsetWidth;
    contador.classList.add("pulsar");
  }
}
//função que renderiza o conteúdo do carrinho, mostrando os itens adicionados, suas quantidades, subtotais e o total geral, além de permitir alterar a quantidade ou remover itens
function renderizarCarrinho() {
  const corpo = document.getElementById("corpoCarrinho");
  const opcoes = document.getElementById("opcoesPedido");
  const rodape = document.getElementById("rodapeCarrinho");

  if (estado.carrinho.length === 0) {
    corpo.innerHTML = `
      <div class="carrinho-vazio">
        <div class="emoji">🍽️</div>
        <h5>Seu carrinho está vazio</h5>
        <p>Adicione um prato delicioso do nosso cardápio para começar seu pedido.</p>
      </div>
    `;
    opcoes.style.display = "none";
    rodape.style.display = "none";
    return;
  }

  opcoes.style.display = "block";
  rodape.style.display = "block";

  corpo.innerHTML = estado.carrinho
    .map(
      (item) => `
    <div class="item-carrinho">
      <div class="item-carrinho-info">
        <h5>${item.nome}</h5>
        <span class="preco-unit">${formatarPreco(item.preco)} cada</span>
        <div class="controles-qtd">
          <button data-acao="menos" data-id="${item.id}" aria-label="Diminuir quantidade">−</button>
          <span class="qtd">${item.quantidade}</span>
          <button data-acao="mais" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
        </div>
      </div>
      <div class="item-carrinho-lado">
        <span class="subtotal-item">${formatarPreco(item.preco * item.quantidade)}</span>
        <button class="remover-item" data-acao="remover" data-id="${item.id}" aria-label="Remover item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z"/></svg>
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  corpo.querySelectorAll("button[data-acao]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.acao === "mais") alterarQuantidade(id, 1);
      if (btn.dataset.acao === "menos") alterarQuantidade(id, -1);
      if (btn.dataset.acao === "remover") removerDoCarrinho(id);
    });
  });

  document.getElementById("valorTotal").textContent =
    formatarPreco(totalCarrinho());
  atualizarLinkWhatsApp();
}
//função que atualiza o link do botão de finalizar pedido no WhatsApp, incluindo os dados do cliente, itens do carrinho, forma de entrega e pagamento, e observações
function atualizarLinkWhatsApp() {
  const nome = document.getElementById("campoNome").value.trim();
  const telefone = document.getElementById("campoTelefone").value.trim();
  const endereco = document.getElementById("campoEndereco").value.trim();
  const troco = document.getElementById("campoTroco").value.trim();
  const observacoes = document.getElementById("campoObservacoes").value.trim();
  const btnFinalizar = document.getElementById("btnFinalizarPedido");

  if (estado.carrinho.length === 0) {
    btnFinalizar.removeAttribute("href");
    return;
  }
// Define as formas de pagamento disponíveis e seus nomes legíveis.
  const formasPagamento = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    debito: "Cartão de Débito",
    credito: "Cartão de Crédito",
  };
  const formaEntrega = estado.tipoEntrega === "entrega" ? "Entrega" : "Retirada no local";
  const divisoria = "────────────────────────";
  const itens = estado.carrinho.map(
    (item) => `• ${item.quantidade}x ${item.nome} — ${formatarPreco(item.preco * item.quantidade)}`,
  );
  const mensagem = [
    "🍽️ *NOVO PEDIDO - FEIJÃO NO PRATO*",
    "",
    "👤 *CLIENTE*",
    nome || "Não informado",
    `📞 *Telefone:* ${telefone || "Não informado"}`,
    `🚚 *Forma de entrega:* ${formaEntrega}`,
    ...(estado.tipoEntrega === "entrega" ? [`📍 *Endereço:* ${endereco || "Não informado"}`] : []),
    `💳 *Forma de pagamento:* ${formasPagamento[estado.formaPagamento]}`,
    ...(estado.formaPagamento === "dinheiro" && troco ? [`💵 *Troco para:* R$ ${troco}`] : []),
    "",
    divisoria,
    "📦 *ITENS DO PEDIDO*",
    ...itens,
    "",
    divisoria,
    "💰 *TOTAL DO PEDIDO*",
    formatarPreco(totalCarrinho()),
    "",
    divisoria,
    "📝 *OBSERVAÇÕES*",
    observacoes || "Nenhuma observação.",
    ...(estado.formaPagamento === "pix" ? ["", "Pagamento será realizado via Pix."] : []),
  ].join("\n");

  btnFinalizar.href = `https://wa.me/${CONFIG.numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
}

function atualizarAvisoFuncionamento() {
  const agora = new Date();
  const horarioHoje = CONFIG.horarios[agora.getDay()];
  const horaAtual = agora.getHours() + agora.getMinutes() / 60;

  const aberto =
    horarioHoje &&
    horaAtual >= horarioHoje.abre &&
    horaAtual < horarioHoje.fecha;

  const ponto = document.getElementById("pontoStatus");
  const texto = document.getElementById("textoStatus");

  if (aberto) {
    ponto.className = "status-ponto aberto";
    texto.textContent = `Estamos abertos agora — atendimento até às ${String(horarioHoje.fecha).padStart(2, "0")}h`;
  } else {
    ponto.className = "status-ponto fechado";
    const proximaAbertura = horarioHoje
      ? `Abrimos às ${String(horarioHoje.abre).padStart(2, "0")}h`
      : "";
    texto.textContent =
      horaAtual < (horarioHoje ? horarioHoje.abre : 99)
        ? `Fechado no momento — ${proximaAbertura} hoje`
        : `Fechado no momento — voltamos amanhã`;
  }
}
//função que configura os indicadores de rolagem para elementos com overflow horizontal, mostrando uma seta quando há mais conteúdo à direita, e escondendo quando chega ao final
// =========================================================
// INDICADORES DE ROLAGEM HORIZONTAL
// =========================================================

// =========================================================
// INDICADORES DE ROLAGEM HORIZONTAL
// =========================================================

function configurarIndicadoresDeRolagem() {
  if (window.innerWidth > 600) return;

  const elementos = [
    document.getElementById("navMenu"),
    document.getElementById("seletorDias"),
  ];

  elementos.forEach((elemento) => {
    if (!elemento) return;

    const container = elemento.parentElement;

    let indicador = container.querySelector(".indicador-rolagem");

    // Cria a seta caso ela ainda não exista
    if (!indicador) {
      indicador = document.createElement("span");

      indicador.className = "indicador-rolagem";
      indicador.setAttribute("aria-hidden", "true");
      indicador.textContent = "→";

      container.appendChild(indicador);
    }

    const atualizar = () => {
      const temRolagem =
        elemento.scrollWidth > elemento.clientWidth + 5;

      const chegouAoFinal =
        elemento.scrollLeft + elemento.clientWidth >=
        elemento.scrollWidth - 5;

      if (temRolagem && !chegouAoFinal) {
        indicador.classList.remove("oculto");
      } else {
        indicador.classList.add("oculto");
      }
    };

    // Adiciona o evento de rolagem apenas uma vez
    if (!elemento.dataset.indicadorConfigurado) {
      elemento.addEventListener("scroll", atualizar, {
        passive: true,
      });

      elemento.dataset.indicadorConfigurado = "true";
    }

    atualizar();
  });
}



// Função de inicialização, chamada quando o DOM estiver pronto
// =========================================================
// INICIALIZAÇÃO DO CARDÁPIO
// =========================================================

function inicializar() {
  document.getElementById("anoAtual").textContent =
    new Date().getFullYear();

  // Lê todos os pratos do HTML uma única vez.
  itensCardapio = lerItensDoDom();

  // Configura o botão do WhatsApp.
  document.getElementById("whatsappFlutuante").href =
    `https://wa.me/${CONFIG.numeroWhatsApp}?text=${encodeURIComponent(
      "Olá! Vi o cardápio do Feijão no Prato e gostaria de mais informações."
    )}`;

  // Primeiro renderiza todo o conteúdo.
  renderizarPratoDoDia();
  renderizarTudo();

  // Depois que o navegador montar o conteúdo,
  // configura os indicadores de rolagem.
  requestAnimationFrame(() => {
    configurarIndicadoresDeRolagem();

    // Segunda verificação, depois que o navegador
    // terminar de calcular as larguras.
    requestAnimationFrame(() => {
      configurarIndicadoresDeRolagem();

      // Terceira verificação para garantir que a seta
      // apareça logo ao carregar a página.
      setTimeout(() => {
        configurarIndicadoresDeRolagem();
      }, 100);
    });
  });

  // Carrinho.
  renderizarCarrinho();
  atualizarContadorCarrinho();

  // Status de funcionamento.
  atualizarAvisoFuncionamento();

  setInterval(atualizarAvisoFuncionamento, 60000);

  // Campo de busca.
  const campoBusca = document.getElementById("campoBusca");

  let timeoutBusca;

  campoBusca.addEventListener("input", () => {
    clearTimeout(timeoutBusca);

    timeoutBusca = setTimeout(() => {
      estado.termoBusca = campoBusca.value;

      renderizarGrade();

      // Depois que a grade for redesenhada,
      // verifica novamente os indicadores.
      requestAnimationFrame(() => {
        configurarIndicadoresDeRolagem();
      });
    }, 180);
  });
}

  document.querySelectorAll("[data-categoria-menu]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    estado.categoriaAtiva = link.dataset.categoriaMenu;

    // Renderiza novamente o conteúdo.
    renderizarTudo();

    // Espera o navegador atualizar a tela
    // e então recalcula a seta.
    requestAnimationFrame(() => {
      configurarIndicadoresDeRolagem();

      requestAnimationFrame(() => {
        configurarIndicadoresDeRolagem();
      });
    });

    const destino =
      estado.categoriaAtiva === "executivos"
        ? document.getElementById("cardapio")
        : document.querySelector("main");

    destino.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});
  document.getElementById("seletorDias").addEventListener("click", (event) => {
    const botaoDia = event.target.closest("button[data-dia]");
    if (!botaoDia) return;
    estado.diaSelecionado = Number(botaoDia.dataset.dia);
    renderizarGrade();
    renderizarPratoDoDia();
  });

  const painel = document.getElementById("painelCarrinho");
  const fundo = document.getElementById("fundoCarrinho");
  function abrirCarrinho() {
    painel.classList.add("aberto");
    fundo.classList.add("aberto");
    document.body.style.overflow = "hidden";
  }
  function fecharCarrinho() {
    painel.classList.remove("aberto");
    fundo.classList.remove("aberto");
    document.body.style.overflow = "";
  }
  document
    .getElementById("btnAbrirCarrinho")
    .addEventListener("click", abrirCarrinho);
  document
    .getElementById("btnFecharCarrinho")
    .addEventListener("click", fecharCarrinho);
  fundo.addEventListener("click", fecharCarrinho);

  const btnRetirada = document.getElementById("btnRetirada");
  const btnEntrega = document.getElementById("btnEntrega");
  const grupoEndereco = document.getElementById("grupoEndereco");
  const grupoTroco = document.getElementById("grupoTroco");
  const avisoPix = document.getElementById("avisoPix");
  btnRetirada.addEventListener("click", () => {
    estado.tipoEntrega = "retirada";
    btnRetirada.classList.add("ativo");
    btnEntrega.classList.remove("ativo");
    grupoEndereco.style.display = "none";
    atualizarLinkWhatsApp();
  });
  btnEntrega.addEventListener("click", () => {
    estado.tipoEntrega = "entrega";
    btnEntrega.classList.add("ativo");
    btnRetirada.classList.remove("ativo");
    grupoEndereco.style.display = "block";
    atualizarLinkWhatsApp();
  });

  // Mostra somente os campos complementares da forma de pagamento escolhida.
  document.querySelectorAll('input[name="formaPagamento"]').forEach((opcao) => {
    opcao.addEventListener("change", () => {
      estado.formaPagamento = opcao.value;
      avisoPix.style.display = opcao.value === "pix" ? "block" : "none";
      grupoTroco.style.display = opcao.value === "dinheiro" ? "block" : "none";
      atualizarLinkWhatsApp();
    });
  });

  // Atualiza o link do WhatsApp conforme o cliente preenche os dados do pedido.
  ["campoNome", "campoTelefone", "campoEndereco", "campoTroco", "campoObservacoes"].forEach(
    (id) => document.getElementById(id).addEventListener("input", atualizarLinkWhatsApp),
  );


document.addEventListener("DOMContentLoaded", inicializar);


// GARANTE QUE AS SETAS SEJAM CALCULADAS APÓS O CARREGAMENTO
window.addEventListener("load", () => {
  configurarIndicadoresDeRolagem();

  setTimeout(() => {
    configurarIndicadoresDeRolagem();
  }, 100);

  setTimeout(() => {
    configurarIndicadoresDeRolagem();
  }, 500);
});

window.addEventListener("resize", () => {
  configurarIndicadoresDeRolagem();
});
