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

  exibirMensagemEPG(nomeCanal, "Carregando programação...", []);

  const xmlDoc = await carregarDadosEPG();
  if (!xmlDoc) {
    exibirMensagemEPG(nomeCanal, "Transmissão Ao Vivo • Guia indisponível.", []);
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
    exibirMensagemEPG(nomeCanal, "Transmissão Ao Vivo • Programação não disponível.", []);
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

  // 5. Exibe os dados
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
    exibirMensagemEPG(nomeCanal, "Transmissão Ao Vivo • Sem grade para este horário.", []);
  }
}

function exibirMensagemEPG(titulo, descricao, proximosProgramas = []) {
  const elemTitulo = document.getElementById('epg-title');
  const elemDesc = document.getElementById('epg-desc');
  const elemUpcoming = document.getElementById('epg-upcoming');

  if (elemTitulo) elemTitulo.innerText = titulo;
  if (elemDesc) elemDesc.innerText = descricao;

  if (elemUpcoming) {
    if (proximosProgramas.length > 0) {
      let html = `<div class="epg-upcoming-title">A Seguir:</div>`;
      
      proximosProgramas.forEach(prog => {
        const hInicio = prog.inicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        html += `
          <div class="epg-upcoming-item">
            <span class="epg-upcoming-time">${hInicio}</span>
            <span class="epg-upcoming-name">${prog.titulo}</span>
          </div>
        `;
      });

      elemUpcoming.innerHTML = html;
      elemUpcoming.style.display = "block";
    } else {
      elemUpcoming.style.display = "none";
    }
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