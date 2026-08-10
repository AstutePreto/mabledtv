// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = "https://jamidjsminkwcadkrfok.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x9YHne7dy2BKf2UNq_2pyw__WSWph0W";

// Inicializa o cliente se ele ainda não existir globalmente
let supabaseClient;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error("O script do Supabase não foi carregado antes do auth-guard.js");
}

// Salva a página atual no armazenamento para retornar após o login
function salvarPaginaOrigem() {
  const paginaAtual = window.location.pathname.split('/').pop();
  // Só salva se não for as próprias páginas de autenticação
  if (paginaAtual !== 'login.html' && paginaAtual !== 'cadastro.html') {
    sessionStorage.setItem('pagina_origem', window.location.href);
  }
}

// Função executada automaticamente ao carregar a página
async function gerenciarSessaoGlobal() {
  if (!supabaseClient) return;

  const { data: { user }, error } = await supabaseClient.auth.getUser();

  // Procura em qual container do seu topo/navbar o menu de login deve entrar
  const containerLogin = document.querySelector('.container-login');
  if (!containerLogin) return;

  if (user) {
    // 1. Pega os dados do usuário (Nome e foto de perfil nos metadados)
    const nomeUsuario = user.user_metadata.user_name || user.user_metadata.full_name || "Usuário";
    const fotoUsuario = user.user_metadata.avatar_url || "https://www.w3schools.com/howto/img_avatar.png";
    const planoConta = user.user_metadata.plano || "Grátis";

    // 2. Injeta o Menu Pílula e Dropdown TOTALMENTE COMPACTOS
    containerLogin.innerHTML = `
      <div id="user-menu-wrapper" style="position: relative; display: flex; justify-content: center; align-items: center; width: 100%;">
        
        <div onclick="toggleMenuGlobal()" style="display: flex; align-items: center; gap: 4px; background-color: #2b1c1c; padding: 2px 8px 2px 2px; border-radius: 50px; color: #fff; cursor: pointer; border: 1px solid #3d2b2b; user-select: none;">
          <img src="${fotoUsuario}" alt="Perfil" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; background-color: #fff;">
          <span style="font-family: 'Segoe UI', sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 0.3px; color: #ffffff;">@${nomeUsuario}</span>
        </div>

        <div id="dropdown-menu-global" class="hidden animate-fade-in" style="display: none; position: absolute; top: 100%; left: 50% !important; transform: translateX(-50%) !important; margin-top: 4px; width: 150px; background-color: #0f0f0f; border: 1px solid #1f2937; border-radius: 8px; padding: 4px; z-index: 9999; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);">
          
          <div style="padding: 3px 6px; border-bottom: 1px solid #111827; margin-bottom: 2px;">
            <p style="font-size: 9px; color: #6b7280; margin: 0; font-family: sans-serif;">Plano Atual</p>
            <p style="font-size: 10px; font-weight: bold; color: #e2b041; text-transform: uppercase; margin: 0; font-family: sans-serif;">${planoConta}</p>
          </div>

          <!-- Perfil (Emoji Preto) -->
          <a href="perfil.html" style="display: flex; align-items: center; gap: 5px; padding: 4px 6px; font-size: 11px; color: #d1d5db; text-decoration: none; border-radius: 5px; font-family: sans-serif;">
            <span style="filter: grayscale(100%) brightness(1); margin-right: 2px; display: inline-block;">👤</span> Perfil
          </a>
          
          <!-- Favoritos -->
          <a href="favoritos.html" style="display: flex; align-items: center; gap: 5px; padding: 4px 6px; font-size: 11px; color: #d1d5db; text-decoration: none; border-radius: 5px; font-family: sans-serif;">
            <span style="filter: grayscale(100%) brightness(0.5); margin-right: 2px; display: inline-block;">⭐</span> Favoritos
          </a>
          
          <!-- Configurações -->
          <a href="configuracoes.html" style="display: flex; align-items: center; gap: 5px; padding: 4px 6px; font-size: 11px; color: #d1d5db; text-decoration: none; border-radius: 5px; font-family: sans-serif;">
            <span style="filter: grayscale(100%) brightness(0.5); margin-right: 2px; display: inline-block;">⚙️</span> Configurações
          </a>

          <!-- Sair -->
          <button onclick="deslogarGlobal()" style="display: flex; align-items: center; gap: 5px; width: 100%; background: none; border: none; border-top: 1px solid #111827; padding: 5px 6px; font-size: 11px; color: #ef4444; text-align: left; cursor: pointer; margin-top: 2px; padding-top: 5px; font-family: sans-serif; font-weight: bold;">
            <span style="filter: grayscale(100%) brightness(0.5); margin-right: 2px; display: inline-block;">🚪</span> Sair
          </button>
        </div>
      </div>
    `;

  } else {
    // Se não tiver logado, garante o clique com salvamento de origem no botão de login
    containerLogin.innerHTML = `
      <a href="login.html" onclick="salvarPaginaOrigem()" class="link-login">Login</a>
    `;
  }
}

// Controla abrir/fechar o menu ao clicar
function toggleMenuGlobal() {
  const menu = document.getElementById('dropdown-menu-global');
  if (menu) {
    if (menu.style.display === 'none' || menu.classList.contains('hidden')) {
      menu.style.setProperty('display', 'block', 'important');
      menu.classList.remove('hidden');
    } else {
      menu.style.setProperty('display', 'none', 'important');
      menu.classList.add('hidden');
    }
  }
}

// Fecha o menu caso clique fora dele
window.addEventListener('click', function(e) {
  const menu = document.getElementById('dropdown-menu-global');
  const wrapper = document.getElementById('user-menu-wrapper');
  if (menu && menu.style.display === 'block' && wrapper && !wrapper.contains(e.target)) {
    menu.style.setProperty('display', 'none', 'important');
    menu.classList.add('hidden');
  }
});

// Faz logoff e recarrega a página atual
async function deslogarGlobal() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  alert("Você saiu da conta!");
  window.location.reload(); 
}

// Salva a origem atual assim que a página carregar
salvarPaginaOrigem();

// Bloqueio de ferramentas de desenvolvedor (Ctrl+Shift+I, F12 e Botão Direito)
window.addEventListener('keydown', function (e) {
  if (e.key === 'F12') {
    e.preventDefault();
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
    e.preventDefault();
  }
  if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
    e.preventDefault();
  }
});

window.addEventListener('contextmenu', function (e) {
  e.preventDefault();
});

// Dispara a verificação assim que o DOM estiver pronto
document.addEventListener('DOMContentLoaded', gerenciarSessaoGlobal);
