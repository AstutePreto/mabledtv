// Lista com os caminhos dos seus banners
const listaBanners = [
  "banners/banner1.png",
  "banners/banner2.png",
  "banners/banner3.png"
];

let indiceAtual = 0;
let voltaAcumulada = 0; // Guarda a quantidade total de voltas para o giro ser infinito e contínuo
let tempoAutoSlide;
const anguloPasso = 360 / listaBanners.length; // Para 3 banners = 120°

// Inicializa a forma geométrica 3D
function montarPrisma3D() {
  const prisma = document.getElementById("prisma3D");
  const containerDots = document.getElementById("carrosselDots");
  if (!prisma || !containerDots) return;

  prisma.innerHTML = "";
  containerDots.innerHTML = "";

  // Calcula o raio de afastamento 3D baseado na largura da tela
  const larguraTela = window.innerWidth;
  const raioAtravessado = Math.round((larguraTela / 2) / Math.tan(Math.PI / listaBanners.length));

  // Cria as faces do prisma
  listaBanners.forEach((src, index) => {
    const face = document.createElement("div");
    face.className = "face-banner";
    const anguloFace = anguloPasso * index;
    
    face.style.transform = `rotateY(${anguloFace}deg) translateZ(${raioAtravessado}px)`;
    
    const img = document.createElement("img");
    img.src = src;
    img.alt = `Banner ${index + 1}`;
    
    face.appendChild(img);
    prisma.appendChild(face);

    // Cria os indicadores (dots)
    const dot = document.createElement("span");
    dot.className = `dot ${index === 0 ? 'ativo' : ''}`;
    dot.onclick = () => irParaBanner(index);
    containerDots.appendChild(dot);
  });

  prisma.dataset.raio = raioAtravessado;
  atualizarCarrossel();
}

function atualizarCarrossel() {
  const prisma = document.getElementById("prisma3D");
  const dots = document.querySelectorAll(".dot");
  if (!prisma) return;

  const raioAtravessado = prisma.dataset.raio || 0;
  
  // O segredo do giro contínuo está aqui: usa a volta acumulada para nunca "voltar para trás"
  const anguloGiro = -voltaAcumulada * anguloPasso;

  // Aplica o giro 3D no prisma
  prisma.style.transform = `translateZ(-${raioAtravessado}px) rotateY(${anguloGiro}deg)`;

  // Atualiza as bolinhas indicadoras
  dots.forEach((dot, index) => {
    if (index === indiceAtual) {
      dot.classList.add("ativo");
    } else {
      dot.classList.remove("ativo");
    }
  });

  reiniciarAutoSlide();
}

function proximaFoto() {
  indiceAtual = (indiceAtual + 1) % listaBanners.length;
  voltaAcumulada++; // Incrementa sempre para frente
  atualizarCarrossel();
}

function fotoAnterior() {
  indiceAtual = (indiceAtual - 1 + listaBanners.length) % listaBanners.length;
  voltaAcumulada--; // Decrementa para girar para o outro lado se clicar na seta esquerda
  atualizarCarrossel();
}

function irParaBanner(index) {
  // Ajusta a volta acumulada para ir direto ao banner correto no menor ou próximo caminho
  const diferenca = index - indiceAtual;
  voltaAcumulada += diferenca;
  indiceAtual = index;
  atualizarCarrossel();
}

function reiniciarAutoSlide() {
  clearInterval(tempoAutoSlide);
  tempoAutoSlide = setInterval(proximaFoto, 6000); // 6 segundos
}

// Recalcula a forma 3D ao redimensionar a janela
window.addEventListener("resize", montarPrisma3D);

// Inicia o prisma ao carregar a página
document.addEventListener("DOMContentLoaded", montarPrisma3D);