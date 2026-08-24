const m3uUrl = "https://raw.githubusercontent.com/AstutePreto/tv6769/refs/heads/main/tv6769.m3u";
const proxyBases = [
  "https://api.allorigins.win/raw?url=",
  "https://cors-anywhere.herokuapp.com/",
  "https://thingproxy.freeboard.io/fetch/",
  "https://corsproxy.org/?",
  "https://proxy.cors.sh/",
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://cors-proxy.htmldriven.com/?url=",
  "https://jsonp.afeld.me/?url=",
  "https://cors.eu.org/",
  "https://scrappy-cors.herokuapp.com/"
];

const knownGroups = [
  "Canais | ABERTO", "Canais | REALITY", "Canais | RECORD TV", "Canais | BAND TV", "Canais | SBT",
  "CANAIS SporTV", "CANAIS ESPN", "CANAIS ESPORTES", "CANAIS LUTAS", "CANAIS PREMIERE",
  "ao vivo | BRASILEIRÃO", "AO VIVO | LIBERTADORES", "ao vivo | COPA DO BRASIL", "Canais | ESPORTES FREE",
  "CANAIS | MAX", "REPRISE", "AO VIVO AGORA", "Canais | Noticias", "Canais | VARIEDADES",
  "Canais | NOVELAS", "Canais | FILMES E SERIES", "CANAIS SOUTH PARK", "CANAIS RUNTIME & PLUTO FILMES",
  "Canais | FILMES", "Canais | SÉRIES", "Canais | ANIMES", "Canais | INFANTIL", "Canais | MÚSICA",
  "RÁDIOS", "Canais | COMÉDIA", "TV ABERTA", "Canais | INTERNACIONAL", "FILMES"
];

const channelsList = document.getElementById('channelsList');
const categoriesSidebar = document.getElementById('categoriesSidebar');
const videoPlayer = document.getElementById('videoPlayer');
const searchInput = document.getElementById('searchInput');
const errorToast = document.getElementById('errorToast');
const errorMessage = document.getElementById('errorMessage');
const loadingIndicator = document.getElementById('loadingIndicator');

let channels = [];
let hls; 
let dashPlayer; 
let activeCategory = "Todos"; 

// --- GERENCIAMENTO DE CONTAS E FAVORITOS ---
let currentAccount = localStorage.getItem('manoTV_currentAccount') || "Conta_Padrao";
let allAccountsFavorites = JSON.parse(localStorage.getItem('manoTV_accounts_favorites')) || {};
if (!allAccountsFavorites[currentAccount]) {
  allAccountsFavorites[currentAccount] = [];
}

let currentAttemptIndex = -1; 
let proxyTimeoutTimer = null;
let currentChannelData = null;

// --- CONFIGURAÇÃO DO PLAYER CUSTOMIZADO ---
let proporcoesDisponiveis = ["auto", "16:9", "3:4", "21:9"];
let indiceProporcaoAtual = 0;

construirPlayerCustomizado();

function construirPlayerCustomizado() {
  const playerContainer = videoPlayer.parentElement;
  if (!playerContainer) return;

  // Desativa os controles padrão do navegador para usarmos os nossos
  videoPlayer.controls = false;

  // Injeta a estilização necessária para os controles customizados
  const estiloPlayer = document.createElement("style");
  estiloPlayer.textContent = `
    .player-container-custom {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #000;
      overflow: hidden;
    }
    .player-container-custom:fullscreen {
      width: 100vw !important;
      height: 100vh !important;
    }
    /* Barra de controles inferior */
    .custom-controls-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
      display: flex;
      flex-direction: column;
      padding: 5px 20px 12px 20px;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 2147483647;
    }
    .player-container-custom:hover .custom-controls-bar {
      opacity: 1;
    }
    .controls-row-buttons {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-top: 6px;
    }
    .controls-left, .controls-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .control-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.85;
      transition: opacity 0.2s, transform 0.1s;
      padding: 4px;
      filter: grayscale(1) brightness(1.5);
    }
    .control-btn:hover {
      opacity: 1;
      transform: scale(1.1);
    }
    .control-btn.fav-active {
      color: #fff !important;
      filter: grayscale(0) drop-shadow(0 0 2px #eab308) !important;
      opacity: 1;
    }
    /* Menu de opções flutuante */
    .custom-options-menu {
      position: absolute;
      bottom: 75px;
      right: 20px;
      background: #1c1c1e;
      border: 1px solid #2c2c2e;
      border-radius: 8px;
      padding: 6px 0;
      display: none;
      flex-direction: column;
      box-shadow: 0 6px 20px rgba(0,0,0,0.6);
      min-width: 180px;
      z-index: 2147483647;
    }
    .menu-item-custom {
      background: none;
      border: none;
      color: #f2f2f7;
      padding: 10px 16px;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
      filter: grayscale(1) brightness(1.3);
    }
    .menu-item-custom:hover {
      background: #2c2c2e;
    }
    /* Estilização da Barra de Progresso estilo YouTube */
    .timeline-container {
      width: 100%;
      height: 4px;
      display: flex;
      align-items: center;
      cursor: pointer;
      margin-bottom: 4px;
      position: relative;
    }
    .timeline-container:hover {
      height: 6px;
    }
    .timeline-bg {
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.3);
      position: relative;
      border-radius: 2px;
    }
    .timeline-progress {
      height: 100%;
      background: #cc0000; /* Vermelho YouTube */
      width: 0%;
      position: absolute;
      left: 0;
      top: 0;
      border-radius: 2px;
    }
    .timeline-handle {
      width: 12px;
      height: 12px;
      background: #cc0000;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%) scale(0);
      transition: transform 0.1s;
      z-index: 2;
    }
    .timeline-container:hover .timeline-handle {
      transform: translate(-50%, -50%) scale(1);
    }
    .time-display {
      color: #ddd;
      font-size: 12px;
      font-family: sans-serif;
      margin-left: 5px;
      user-select: none;
    }
  `;
  document.head.appendChild(estiloPlayer);

  playerContainer.classList.add("player-container-custom");

  // Estrutura HTML dos novos controles com a Barra de Vídeo (Timeline) incluída
  const contêinerControles = document.createElement("div");
  contêinerControles.className = "custom-controls-bar";

  contêinerControles.innerHTML = `
    <div class="timeline-container" id="custTimelineContainer">
      <div class="timeline-bg">
        <div class="timeline-progress" id="custTimelineProgress"></div>
        <div class="timeline-handle" id="custTimelineHandle"></div>
      </div>
    </div>
    <div class="controls-row-buttons">
      <div class="controls-left">
        <button class="control-btn" id="custPlayBtn">▶</button>
        <button class="control-btn" id="custDisplayFavBtn" title="Adicionar aos favoritos">★</button>
        <button class="control-btn" id="custMuteBtn">🔊</button>
        <span class="time-display" id="custTimeDisplay">00:00 / 00:00</span>
      </div>
      <div class="controls-right">
        <button class="control-btn" id="custOptBtn">⚙️</button>
        <button class="control-btn" id="custFullBtn">⛶</button>
      </div>
    </div>
  `;

  const menuPopup = document.createElement("div");
  menuPopup.className = "custom-options-menu";

  const btnProporcao = document.createElement("button");
  btnProporcao.className = "menu-item-custom";
  btnProporcao.textContent = "📺 Proporção: Padrão";

  const btnPip = document.createElement("button");
  btnPip.className = "menu-item-custom";
  btnPip.textContent = "🖼️ Picture-in-Picture";

  menuPopup.appendChild(btnProporcao);
  menuPopup.appendChild(btnPip);
  playerContainer.appendChild(contêinerControles);
  playerContainer.appendChild(menuPopup);

  // --- LÓGICA DO CONTROLE DE TEMPO (TIMELINE / BARRA DE VÍDEO) ---
  const timelineContainer = contêinerControles.querySelector("#custTimelineContainer");
  const timelineProgress = contêinerControles.querySelector("#custTimelineProgress");
  const timelineHandle = contêinerControles.querySelector("#custTimelineHandle");
  const timeDisplay = contêinerControles.querySelector("#custTimeDisplay");

  function formatarTempo(segundos) {
    if (isNaN(segundos) || !isFinite(segundos)) return "00:00";
    const hrs = Math.floor(segundos / 3600);
    const mins = Math.floor((segundos % 3600) / 60);
    const secs = Math.floor(segundos % 60);
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Atualiza a barra conforme o vídeo avança
  videoPlayer.addEventListener("timeupdate", () => {
    const atual = videoPlayer.currentTime;
    const total = videoPlayer.duration;

    if (total && isFinite(total) && total > 0) {
      const porcentagem = (atual / total) * 100;
      timelineProgress.style.width = `${porcentagem}%`;
      timelineHandle.style.left = `${porcentagem}%`;
      timeDisplay.textContent = `${formatarTempo(atual)} / ${formatarTempo(total)}`;
    } else {
      // Caso seja transmissão ao vivo pura sem buffer retroativo detectado
      timelineProgress.style.width = "100%";
      timelineHandle.style.left = "100%";
      timeDisplay.textContent = `${formatarTempo(atual)}`;
    }
  });

  // Permitir clicar e arrastar na barra para avançar ou voltar (Scrubbing)
  function navegarParaPosicao(e) {
    const total = videoPlayer.duration;
    if (!total || !isFinite(total)) return; // Ignora se for live absoluta sem suporte a retrocesso

    const rect = timelineContainer.getBoundingClientRect();
    const cliqueX = e.clientX - rect.left;
    const larguraTotal = rect.width;
    let novaPorcentagem = cliqueX / larguraTotal;

    if (novaPorcentagem < 0) novaPorcentagem = 0;
    if (novaPorcentagem > 1) novaPorcentagem = 1;

    videoPlayer.currentTime = novaPorcentagem * total;
  }

  let arrastandoBarra = false;
  timelineContainer.addEventListener("mousedown", (e) => {
    arrastandoBarra = true;
    navegarParaPosicao(e);
  });

  window.addEventListener("mousemove", (e) => {
    if (arrastandoBarra) navegarParaPosicao(e);
  });

  window.addEventListener("mouseup", () => {
    arrastandoBarra = false;
  });

  // --- LÓGICA DOS BOTÕES DOS CONTROLES ---

  const playBtn = contêinerControles.querySelector("#custPlayBtn");
  playBtn.addEventListener("click", () => {
    if (videoPlayer.paused) {
      videoPlayer.play().catch(() => {});
      playBtn.textContent = "⏸";
    } else {
      videoPlayer.pause();
      playBtn.textContent = "▶";
    }
  });

  videoPlayer.addEventListener("play", () => playBtn.textContent = "⏸");
  videoPlayer.addEventListener("pause", () => playBtn.textContent = "▶");

  const displayFavBtn = contêinerControles.querySelector("#custDisplayFavBtn");
  displayFavBtn.addEventListener("click", () => {
    if (currentChannelData && currentChannelData.url) {
      toggleFavorite(currentChannelData.url);
      atualizarEstadoBotaoFavoritoDisplay();
    }
  });

  const muteBtn = contêinerControles.querySelector("#custMuteBtn");
  muteBtn.addEventListener("click", () => {
    videoPlayer.muted = !videoPlayer.muted;
    muteBtn.textContent = videoPlayer.muted ? "🔇" : "🔊";
  });

  const optBtn = contêinerControles.querySelector("#custOptBtn");
  optBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const visivel = menuPopup.style.display === "flex";
    menuPopup.style.display = visivel ? "none" : "flex";
  });

  document.addEventListener("click", () => menuPopup.style.display = "none");

  btnProporcao.addEventListener("click", (e) => {
    e.stopPropagation();
    indiceProporcaoAtual = (indiceProporcaoAtual + 1) % proporcoesDisponiveis.length;
    const novaProporcao = proporcoesDisponiveis[indiceProporcaoAtual];
    alterarProporcaoVideo(novaProporcao);

    const labels = {
      "auto": "📺 Proporção: Padrão",
      "16:9": "🎬 Proporção: 16:9",
      "3:4": "📺 Proporção: 3:4",
      "21:9": "🎥 Proporção: 21:9"
    };
    btnProporcao.textContent = labels[novaProporcao];
  });

  btnPip.addEventListener("click", async (e) => {
    e.stopPropagation();
    menuPopup.style.display = "none";
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoPlayer.readyState >= 1) {
        await videoPlayer.requestPictureInPicture();
      }
    } catch (err) {
      console.error(err);
    }
  });

  const fullBtn = contêinerControles.querySelector("#custFullBtn");
  fullBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  });

  let temporizadorControles;
  playerContainer.addEventListener("mousemove", () => {
    contêinerControles.style.opacity = "1";
    document.body.style.cursor = "default";
    clearTimeout(temporizadorControles);
    temporizadorControles = setTimeout(() => {
      if (!videoPlayer.paused && document.fullscreenElement) {
        contêinerControles.style.opacity = "0";
        document.body.style.cursor = "none";
      }
    }, 3000);
  });
}

function atualizarEstadoBotaoFavoritoDisplay() {
  const displayFavBtn = document.getElementById("custDisplayFavBtn");
  if (!displayFavBtn || !currentChannelData) return;

  const currentFavs = allAccountsFavorites[currentAccount] || [];
  if (currentFavs.includes(currentChannelData.url)) {
    displayFavBtn.classList.add("fav-active");
  } else {
    displayFavBtn.classList.remove("fav-active");
  }
}

function alterarProporcaoVideo(proporcao) {
  videoPlayer.style.setProperty("object-fit", "contain", "important");
  videoPlayer.style.setProperty("width", "100%", "important");
  videoPlayer.style.setProperty("height", "100%", "important");

  if (proporcao === "auto") return;

  videoPlayer.style.setProperty("object-fit", "fill", "important");

  if (proporcao === "16:9") {
    videoPlayer.style.setProperty("width", "100%", "important");
    videoPlayer.style.setProperty("height", "100%", "important");
  } else if (proporcao === "3:4") {
    videoPlayer.style.setProperty("width", "75%", "important"); 
    videoPlayer.style.setProperty("height", "100%", "important");
  } else if (proporcao === "21:9") {
    videoPlayer.style.setProperty("width", "100%", "important");
    videoPlayer.style.setProperty("height", "75%", "important");
  }
}

// ----------------------------------------------------------------------------------

function normalizeGroup(group) {
  if (!group) return "Geral";
  group = group.trim();
  if (group.includes("|")) {
    const parts = group.split("|").map(p => p.trim());
    if (parts[0] === "Canais") {
      return "Canais | " + parts[1];
    } else if (["Dorama", "Série", "Anime", "Reality"].includes(parts[0])) {
      return parts[1];
    }
  }
  const matched = knownGroups.find(kg => kg.toLowerCase() === group.toLowerCase());
  return matched || group;
}

async function loadM3U() {
  try {
    const res = await fetch(m3uUrl);
    if (res.ok) {
      const content = await res.text();
      parseM3U(content);
      return;
    }
  } catch (err) {
    console.log("Carregamento direto da lista falhou:", err.message);
  }

  for (let proxyBase of proxyBases) {
    try {
      const proxyUrl = proxyBase + encodeURIComponent(m3uUrl);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const content = await res.text();
        parseM3U(content);
        return;
      }
    } catch (err) {
      console.log("Proxy falhou ao baixar M3U:", proxyBase, err.message);
    }
  }
  showError("Erro ao baixar lista IPTV: Todos os métodos falharam");
}

loadM3U();

function parseM3U(content) {
  const lines = content.split("\n");
  channels = [];
  let currentGroup = "Geral";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && line.startsWith("#") && line.includes("############################################################################") && !line.startsWith("#EXTINF")) {
      const parts = line.split("############################################################################");
      if (parts.length > 1) {
        currentGroup = parts[1].trim();
      }
    } else if (line.startsWith("#EXTINF:")) {
      const info = parseExtinf(line);
      const url = lines[i + 1] ? lines[i + 1].trim() : null;
      if (url) {
        let group = info.groupTitle ? info.groupTitle : currentGroup;
        group = normalizeGroup(group);

        channels.push({
          name: info.name || `Canal ${channels.length + 1}`,
          url: url,
          logo: info["tvg-logo"] || info.tvgLogo || "",
          tvgId: info["tvg-id"] || info.tvgId || "",
          group: group
        });
      }
    }
  }

  if (channels.length === 0) {
    showError("Nenhum canal válido encontrado.");
  } else {
    generateSidebarCategories();
    displayChannels(channels);
    
    if (channels[0]) {
      playChannel(channels[0].url, channels[0].name, channels[0].tvgId);
      setTimeout(() => {
        document.querySelector(".channel-item")?.classList.add("active");
      }, 400);
    }
  }
}

function parseExtinf(line) {
  const info = {};
  const tvgRegex = /([a-zA-Z0-9-][a-zA-Z0-9_-]*)="([^"]*)"/g;
  let match;
  while ((match = tvgRegex.exec(line)) !== null) {
    info[match[1]] = match[2];
  }
  const lastComma = line.lastIndexOf(",");
  if (lastComma > 0) {
    info.name = line.substring(lastComma + 1).trim();
  }
  return info;
}

function generateSidebarCategories() {
  if (!categoriesSidebar) return;
  
  const btnTodos = document.getElementById('btnTodos');
  categoriesSidebar.innerHTML = "";
  if (btnTodos) categoriesSidebar.appendChild(btnTodos);

  const favBtn = document.createElement("button");
  favBtn.className = "category-btn " + (activeCategory === "Favoritos" ? "active" : "");
  favBtn.innerHTML = "⭐ Favoritos";
  favBtn.id = "btnFavoritos";
  favBtn.addEventListener("click", () => {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    favBtn.classList.add("active");
    activeCategory = "Favoritos";
    filtrarGradeCanais();
  });
  categoriesSidebar.appendChild(favBtn);

  const uniqueGroups = [...new Set(channels.map(c => c.group))];
  
  knownGroups.forEach(groupName => {
    if (uniqueGroups.includes(groupName)) {
      createCategoryButton(groupName);
    }
  });

  uniqueGroups.forEach(groupName => {
    if (!knownGroups.includes(groupName) && groupName !== "Geral") {
      createCategoryButton(groupName);
    }
  });
}

function createCategoryButton(groupName) {
  const btn = document.createElement("button");
  btn.className = "category-btn " + (activeCategory === groupName ? "active" : "");
  btn.innerHTML = ` ${groupName}`;
  btn.addEventListener("click", () => {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = groupName;
    filtrarGradeCanais();
  });
  categoriesSidebar.appendChild(btn);
}

document.getElementById('btnTodos')?.addEventListener('click', () => {
  document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
  document.getElementById('btnTodos').classList.add('active');
  activeCategory = "Todos";
  filtrarGradeCanais();
});

function filtrarGradeCanais() {
  const term = searchInput ? searchInput.value.toLowerCase() : "";
  let filtered = channels;

  if (activeCategory === "Favoritos") {
    const currentFavs = allAccountsFavorites[currentAccount] || [];
    filtered = filtered.filter(c => currentFavs.includes(c.url));
  } else if (activeCategory !== "Todos") {
    filtered = filtered.filter(c => c.group === activeCategory);
  }

  if (term) {
    filtered = filtered.filter(c => c.name.toLowerCase().includes(term));
  }

  displayChannels(filtered);
}

function displayChannels(channelsToDisplay) {
  channelsList.innerHTML = "";

  if (channelsToDisplay.length === 0) {
    channelsList.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><p>Nenhum canal encontrado.</p></div>';
    return;
  }

  const currentFavs = allAccountsFavorites[currentAccount] || [];

  channelsToDisplay.forEach(channel => {
    const item = document.createElement("div");
    item.className = "channel-item";
    
    const isFav = currentFavs.includes(channel.url);
    const logoUrl = channel.logo ? channel.logo : "https://via.placeholder.com/44x44/8b7d73/ffffff?text=TV";
    
    item.innerHTML = `
      <img src="${logoUrl}" crossorigin="anonymous" onerror="this.src='https://via.placeholder.com/44x44/73675e/ffffff?text=TV'">
      <div class="channel-item-name">${channel.name}</div>
      <button class="btn-fav ${isFav ? 'active' : ''}" title="Adicionar aos favoritos">★</button>
    `;
    
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains('btn-fav')) return; 
      playChannel(channel.url, channel.name, channel.tvgId);
      document.querySelectorAll(".channel-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
    });

    const btnFav = item.querySelector('.btn-fav');
    btnFav.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(channel.url);
      atualizarEstadoBotaoFavoritoDisplay();
    });

    channelsList.appendChild(item);
  });
}

function toggleFavorite(url) {
  if (!allAccountsFavorites[currentAccount]) {
    allAccountsFavorites[currentAccount] = [];
  }

  let currentFavs = allAccountsFavorites[currentAccount];

  if (currentFavs.includes(url)) {
    allAccountsFavorites[currentAccount] = currentFavs.filter(favUrl => favUrl !== url);
  } else {
    allAccountsFavorites[currentAccount].push(url);
  }

  localStorage.setItem('manoTV_accounts_favorites', JSON.stringify(allAccountsFavorites));
  filtrarGradeCanais();
}

function mudarDeConta(nomeNovaConta) {
  currentAccount = nomeNovaConta;
  localStorage.setItem('manoTV_currentAccount', nomeNovaConta);
  if (!allAccountsFavorites[currentAccount]) {
    allAccountsFavorites[currentAccount] = [];
  }
  filtrarGradeCanais();
  atualizarEstadoBotaoFavoritoDisplay();
}

function playChannel(url, channelName = "", tvgId = "") {
  if (channelName && typeof atualizarEPGPorNome === 'function') {
    atualizarEPGPorNome(channelName, tvgId);
  }

  currentChannelData = { url, channelName, tvgId };
  currentAttemptIndex = -1; 
  tentarReproduzir();
  atualizarEstadoBotaoFavoritoDisplay();
}

function atualizarStatusLoading(mensagem) {
  if (loadingIndicator) {
    let statusText = loadingIndicator.querySelector('.loading-text-status');
    if (!statusText) {
      statusText = document.createElement('p');
      statusText.className = 'loading-text-status text-xs text-amber-400 mt-2 font-medium text-center';
      loadingIndicator.appendChild(statusText);
    }
    statusText.textContent = mensagem;
  }
}

function tentarReproduzir() {
  if (!currentChannelData) return;

  const { url } = currentChannelData;
  limparPlayers();

  loadingIndicator.classList.remove("hidden");
  videoPlayer.style.display = "none";

  let targetUrl = url;

  if (currentAttemptIndex >= 0 && currentAttemptIndex < proxyBases.length) {
    targetUrl = proxyBases[currentAttemptIndex] + encodeURIComponent(url);
  }

  proxyTimeoutTimer = setTimeout(() => {
    showError("Tempo esgotado (7s). Alternando método...");
    irParaProximoMetodo();
  }, 7000);

  const urlLower = url.toLowerCase();
  const isDASH = urlLower.includes(".mpd") || urlLower.includes("dash");

  try {
    if (currentAttemptIndex === -1 && !isDASH) {
      videoPlayer.removeAttribute("crossorigin");
      videoPlayer.src = targetUrl;
      videoPlayer.load();

      videoPlayer.onloadeddata = sucessoPlay;
      videoPlayer.onplaying = sucessoPlay;
      
      videoPlayer.onerror = () => {
        setTimeout(() => {
          if (videoPlayer.paused && videoPlayer.readyState === 0) {
            irParaProximoMetodo();
          }
        }, 1000);
      };
      return;
    }

    if (isDASH && typeof dashjs !== "undefined") {
      dashPlayer = dashjs.MediaPlayer().create();
      dashPlayer.initialize(videoPlayer, targetUrl, false);
      
      dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, sucessoPlay);
      dashPlayer.on(dashjs.MediaPlayer.events.ERROR, irParaProximoMetodo);
      return;
    }

    if (typeof Hls !== "undefined" && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 5000,
        levelLoadingTimeOut: 5000,
        fragLoadingTimeOut: 5000,
        autoStartLoad: true,
        capLevelToPlayerSize: false,
        xhrSetup: function(xhr) {
          xhr.withCredentials = false;
        }
      });

      hls.loadSource(targetUrl);
      hls.attachMedia(videoPlayer);

      hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
        if (data.levels && data.levels.length > 0) {
          hls.currentLevel = data.levels.length - 1;
        }
        sucessoPlay();
      });

      hls.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
          irParaProximoMetodo();
        }
      });
    } else {
      videoPlayer.src = targetUrl;
      videoPlayer.load();
      videoPlayer.onloadeddata = sucessoPlay;
      videoPlayer.onerror = irParaProximoMetodo;
    }
  } catch (err) {
    irParaProximoMetodo();
  }
}

function sucessoPlay() {
  clearTimeout(proxyTimeoutTimer);
  loadingIndicator.classList.add("hidden");
  videoPlayer.style.display = "block";
  videoPlayer.play().catch(() => {});
}

function irParaProximoMetodo() {
  clearTimeout(proxyTimeoutTimer);
  limparPlayers();

  currentAttemptIndex++;

  if (currentAttemptIndex < proxyBases.length) {
    tentarReproduzir();
  } else {
    loadingIndicator.classList.add("hidden");
    videoPlayer.style.display = "block";
    showError("Não foi possível carregar o canal. Todos os proxies falharam.");
  }
}

function limparPlayers() {
  if (proxyTimeoutTimer) clearTimeout(proxyTimeoutTimer);
  
  videoPlayer.onloadeddata = null;
  videoPlayer.onplaying = null;
  videoPlayer.onerror = null;

  if (hls) { hls.destroy(); hls = null; }
  if (dashPlayer) { dashPlayer.reset(); dashPlayer = null; }
  videoPlayer.src = "";
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorToast.classList.remove("hidden");
  setTimeout(() => errorToast.classList.add("hidden"), 4000);
}

if (searchInput) {
  searchInput.addEventListener("input", filtrarGradeCanais);
}
