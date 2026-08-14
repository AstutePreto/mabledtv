const URL_EPG_XML = "https://raw.githubusercontent.com/limaalef/BrazilTVEPG/main/epg.xml";

let cacheEPG = null;

// Tabela rápida de mapeamento manual (Adicione exceções se algum canal falhar)
const DE_PARA_CANAL = {
  // "nome do canal na sua lista (em minúsculas)": "id_exato_no_xml"
  "sbt sp hd": "SBT.br",
  "globo sp hd": "GloboSP.br",
  "globo rj hd": "GloboRJ.br",
  "record tv hd": "Record.br",
  "band sp hd": "BandSP.br",
  "sportv hd": "SporTV.br",
  "sportv 2 hd": "SporTV2.br"
};

async function carregarDadosEPG() {
  if (cacheEPG) return cacheEPG;

  try {
    const resposta = await fetch(URL_EPG_XML);
    if (!resposta.ok) throw new Error("Falha na rede ao carregar XML");
    
    const textoXML = await resposta.text();
    const parser = new DOMParser();
    cacheEPG = parser.parseFromString(textoXML, "text/xml");
    console.log("EPG XML carregado com sucesso.");
    return cacheEPG;
  } catch (erro) {
    console.error("Erro ao carregar o XML do EPG:", erro);
    return null;
  }
}

async function atualizarEPGPorNome(nomeCanal, tvgId = "") {
  if (!nomeCanal) return;

  // Mostra um estado de carregamento inicial dentro do card
  exibirMensagemEPG("Carregando programação...", "Buscando guia de programação atualizado...", []);

  const xmlDoc = await carregarDadosEPG();
  if (!xmlDoc) {
    exibirMensagemEPG("Transmissão Ao Vivo", "Guia de programação indisponível no momento.", []);
    return;
  }

  const agora = new Date();
  const nomeLimpo = limparNomeParaBusca(nomeCanal);
  const tvgIdLimpo = (tvgId || "").trim().toLowerCase();

  const canaisXml = xmlDoc.querySelectorAll("channel");
  let targetChannelId = null;

  // 1. Tenta bater tvg-id direto
  if (tvgIdLimpo) {
    for (let c of canaisXml) {
      const idXml = (c.getAttribute("id") || "").trim().toLowerCase();
      if (idXml === tvgIdLimpo) {
        targetChannelId = c.getAttribute("id");
        break;
      }
    }
  }

  // 2. Tenta a tabela De-Para
  if (!targetChannelId) {
    for (let chave in DE_PARA_CANAL) {
      if (nomeLimpo.includes(chave) || tvgIdLimpo.includes(chave)) {
        targetChannelId = DE_PARA_CANAL[chave];
        break;
      }
    }
  }

  // 3. Busca por similaridade de nome
  if (!targetChannelId) {
    for (let c of canaisXml) {
      const idXml = c.getAttribute("id") || "";
      const nomeXml = (c.querySelector("display-name")?.textContent || "").trim();
      const nomeXmlLimpo = limparNomeParaBusca(nomeXml);

      if (nomeXmlLimpo && (nomeLimpo.includes(nomeXmlLimpo) || nomeXmlLimpo.includes(nomeLimpo))) {
        targetChannelId = idXml;
        break;
      }
    }
  }

  if (!targetChannelId) {
    console.warn(`EPG: Nenhum canal mapeado no XML para '${nomeCanal}' (tvg-id: '${tvgId}')`);
    exibirMensagemEPG("Transmissão Ao Vivo", "Programação detalhada não disponível para este canal.", []);
    return;
  }

  console.log(`EPG: Canal '${nomeCanal}' vinculado ao id XML '${targetChannelId}'`);

  // 4. Busca programas do canal
  const programas = xmlDoc.querySelectorAll("programme");
  let listaProgramasCanal = [];

  programas.forEach(prog => {
    const channelAttr = prog.getAttribute("channel");
    if (channelAttr && channelAttr.toLowerCase() === targetChannelId.toLowerCase()) {
      const inicioStr = prog.getAttribute("start");
      const fimStr = prog.getAttribute("stop");

      if (inicioStr && fimStr) {
        const inicio = parsearDataXML(inicioStr);
        const fim = parsearDataXML(fimStr);

        // Pega programas que ainda não acabaram
        if (fim >= agora) {
          listaProgramasCanal.push({
            titulo: prog.querySelector("title")?.textContent || "Sem título",
            descricao: prog.querySelector("desc")?.textContent || "",
            inicio: inicio,
            fim: fim
          });
        }
      }
    }
  });

  listaProgramasCanal.sort((a, b) => a.inicio - b.inicio);

  // 5. Exibe os dados sincronizados diretamente no Card Expandido
  if (listaProgramasCanal.length > 0) {
    const atual = listaProgramasCanal[0];
    const proximos = listaProgramasCanal.slice(1, 4);

    const horaInicio = atual.inicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const horaFim = atual.fim.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    exibirMensagemEPG(
      `${horaInicio} - ${horaFim} | ${atual.titulo}`,
      atual.descricao || "Sem descrição informada.",
      proximos
    );
  } else {
    exibirMensagemEPG("Transmissão Ao Vivo", "Sem grade de horários disponível para o momento.", []);
  }
}

// 📌 FUNÇÃO CORRIGIDA: Limpa os canais fechados, restaura o nome original e evita texto laranja vazado
function exibirMensagemEPG(titulo, descricao, proximosProgramas = []) {
  
  // 1. Antes de tudo, limpa QUALQUER card que não deveria estar ativo e restaura o nome original dele
  document.querySelectorAll(".channel-item").forEach(card => {
    // Se o card NÃO tem a classe active, mas por algum motivo ainda tem o bloco expandido, removemos e restauramos
    if (!card.classList.contains("active")) {
      const infoBlock = card.querySelector('.channel-info-block');
      if (infoBlock) {
        const nameElem = infoBlock.querySelector('.channel-item-name');
        if (nameElem) {
          // Se o texto ficou como "Carregando...", recupera o nome real armazenado ou limpa modificações estranhas
          if (nameElem.innerText.includes("Carregando programação...")) {
            // Tenta pegar o nome correto se você tiver um atributo (ex: data-name), ou deixa o texto limpo
            if (card.dataset.originalName) {
              nameElem.innerText = card.dataset.originalName;
            }
          }
          card.appendChild(nameElem); // Devolve o nome para a raiz do card quadrado
        }
        infoBlock.remove(); // Deleta o bloco de informações estendido
      }
    }
  });

  // 2. Pega o canal que está ativo de fato agora
  const cardAtivo = document.querySelector(".channel-item.active");
  if (!cardAtivo) return;

  // Guarda o nome original do canal em um atributo "data" para podermos restaurar depois sem perder o título real
  const nameElemOriginal = cardAtivo.querySelector('.channel-item-name');
  if (nameElemOriginal && !cardAtivo.dataset.originalName) {
    if (!nameElemOriginal.innerText.includes("Carregando programação...")) {
      cardAtivo.dataset.originalName = nameElemOriginal.innerText;
    }
  }

  let infoBlock = cardAtivo.querySelector('.channel-info-block');
  if (!infoBlock) {
    infoBlock = document.createElement('div');
    infoBlock.className = 'channel-info-block';
    
    // Mudamos overflow: hidden para overflow-y: auto e adicionamos uma altura máxima interna
    infoBlock.style.cssText = "display: flex; flex-direction: column; align-items: flex-start; text-align: left; flex: 1; max-height: 75px; overflow-y: auto; padding-right: 4px;";
    
    if (nameElemOriginal) {
      infoBlock.appendChild(nameElemOriginal);
    }
    cardAtivo.appendChild(infoBlock);
  }

  // Se o texto do título diz "Carregando programação...", atualiza apenas o texto dentro do bloco para o usuário ver o status
  const currentNameElem = infoBlock.querySelector('.channel-item-name');
  if (titulo === "Carregando programação..." || titulo === "Transmissão Ao Vivo") {
    // Se ainda está carregando, coloca o status no lugar da descrição para não estragar o título do canal
    if (currentNameElem && cardAtivo.dataset.originalName) {
      currentNameElem.innerText = cardAtivo.dataset.originalName; 
    }
  }

  // 4. Procura ou cria a caixinha interna do EPG
  let epgBox = infoBlock.querySelector('.epg-info-box');
  if (!epgBox) {
    epgBox = document.createElement('div');
    epgBox.className = 'epg-info-box';
    epgBox.style.cssText = "display: block; width: 100%; margin-top: 2px;";
    
    const tElem = document.createElement('div');
    tElem.className = 'epg-title';
    tElem.style.cssText = "font-size: 11px; font-weight: 700; color: #ff9800; margin-bottom: 1px;";
    
    const dElem = document.createElement('div');
    dElem.className = 'epg-desc';
    dElem.style.cssText = "font-size: 11px; color: #9ca3af; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;";
    
    epgBox.appendChild(tElem);
    epgBox.appendChild(dElem);
    infoBlock.appendChild(epgBox);
  }

  // 5. Injeta os textos corretos vindos do XML
  const elemTitulo = epgBox.querySelector('.epg-title');
  const elemDesc = epgBox.querySelector('.epg-desc');

  if (elemTitulo) elemTitulo.innerText = titulo;
  if (elemDesc) elemDesc.innerText = descricao;

  // 6. Gerencia os próximos programas ("A Seguir")
  let blocoUpcoming = infoBlock.querySelector('.epg-upcoming-container');
  
  if (proximosProgramas.length > 0) {
    if (!blocoUpcoming) {
      blocoUpcoming = document.createElement('div');
      blocoUpcoming.className = 'epg-upcoming-container';
      blocoUpcoming.style.cssText = "margin-top: 4px; border-top: 1px solid #2c2c2e; padding-top: 4px; width: 100%;";
      infoBlock.appendChild(blocoUpcoming);
    }

    let html = `<div style="font-size: 9px; font-weight: bold; color: #eab308; margin-bottom: 1px;">A SEGUIR:</div>`;
    proximosProgramas.forEach(prog => {
      const hInicio = prog.inicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      html += `
        <div style="font-size: 10px; color: #a1a1aa; display: flex; gap: 6px;">
          <span style="color: #fff; font-weight: 500;">${hInicio}</span>
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${prog.titulo}</span>
        </div>
      `;
    });
    blocoUpcoming.innerHTML = html;
    blocoUpcoming.style.display = "block";
  } else if (blocoUpcoming) {
    blocoUpcoming.style.display = "none";
  }
}

function limparNomeParaBusca(nome) {
  return (nome || "").toLowerCase()
    .replace(/\b(fhd|hd|sd|4k|2k|1080p|720p|alt|opt)\b/gi, "")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Converte a string "YYYYMMDDHHMMSS +HHMM" do XML em um objeto Date do JS corrigido
function parsearDataXML(strData) {
  if (!strData) return new Date();
  
  try {
    const ano = strData.substring(0, 4);
    const mes = strData.substring(4, 6);
    const dia = strData.substring(6, 8);
    const hora = strData.substring(8, 10);
    const min = strData.substring(10, 12);
    const seg = strData.substring(12, 14);

    // Formato ISO 8601 legível nativamente pelo navegador: YYYY-MM-DDTHH:mm:ss
    return new Date(`${ano}-${mes}-${dia}T${hora}:${min}:${seg}`);
  } catch (e) {
    return new Date();
  }
}
