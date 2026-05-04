const state = {
  products: [],
  affiliate: null,
  activeFilter: "all",
};

const serviceLabels = {
  "fotos": "Fotos con Immich",
  "archivos": "Archivos / Nextcloud",
  "jellyfin": "Media server Jellyfin",
  "arr-stack": "Jellyseerr/Sonarr/Radarr/qBittorrent",
  "adguard": "AdGuard Home",
  "homeassistant": "Home Assistant",
  "vaultwarden": "Vaultwarden",
  "paperless": "Paperless-ngx",
  "servidores-juegos": "Servidores de juegos",
  "monitorizacion": "Monitorización",
  "backups": "Backups",
  "k3s": "k3s / Proxmox",
};

const categoryLabels = {
  nas: "NAS",
  minipc: "MiniPC",
  cluster: "Cluster",
  accessory: "Accesorio",
};

const levelLabels = {
  "cero-tecnico": "Cero técnico",
  "algo-tecnico": "Algo técnico",
  experto: "Experto",
};

const budgetLabels = {
  basico: "Básico",
  medio: "Medio",
  scalable: "Escalable",
  escalable: "Escalable",
};

const architectureCopy = {
  nas: {
    title: "NAS privado",
    text: "La opción más sencilla: almacenamiento centralizado, fotos, archivos, backups y acceso remoto. Ideal si quieres cero líos y mantenimiento bajo.",
    setup: "NAS + discos NAS + UPS básico + backups externos + acceso remoto seguro.",
  },
  minipc: {
    title: "Mini servidor self-hosted",
    text: "Más flexible que un NAS cerrado. Buena opción para Docker, Jellyfin, AdGuard Home, Home Assistant, Vaultwarden o servicios personalizados.",
    setup: "MiniPC + almacenamiento externo/NAS + Docker + VPN/Tailscale + backups + monitorización.",
  },
  cluster: {
    title: "Homelab escalable / cluster k3s",
    text: "La opción avanzada para devs, makers y entusiastas: varios nodos, GitOps, monitorización y posibilidad de separar cargas.",
    setup: "2–3 miniPCs + k3s/Proxmox + NAS/backups + switch + UPS + dominio + monitorización.",
  },
};

function encode(value) {
  return encodeURIComponent(value);
}

function addAmazonTag(url, tag) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("amazon.")) {
      parsed.searchParams.set("tag", tag);
    }
    return parsed.toString();
  } catch (error) {
    return url;
  }
}

function buildAffiliateUrl(product) {
  if (!state.affiliate || !product.productUrl) return product.productUrl || "#";
  const network = state.affiliate.networks?.[product.network] || state.affiliate.networks?.manual;
  if (!network) return product.productUrl;

  if (network.type === "amazon") {
    return addAmazonTag(product.productUrl, network.tag || state.affiliate.site?.amazonStoreId || "");
  }

  if (network.type === "awin") {
    const template = network.template || `${network.baseUrl}&ued={encodedUrl}`;
    return template.replace("{encodedUrl}", encode(product.productUrl));
  }

  return product.productUrl;
}

function getSelections() {
  const level = document.querySelector('input[name="level"]:checked')?.value || "cero-tecnico";
  const budget = document.querySelector('input[name="budget"]:checked')?.value || "basico";
  const services = [...document.querySelectorAll('#service-picker input[type="checkbox"]:checked')].map((el) => el.value);
  return { level, budget, services };
}

function chooseArchitecture({ level, budget, services }) {
  const heavy = services.includes("k3s") || services.includes("servidores-juegos") || budget === "escalable" || level === "experto";
  const dockerish = services.some((s) => ["arr-stack", "adguard", "homeassistant", "vaultwarden", "paperless", "monitorizacion"].includes(s));
  const media = services.includes("jellyfin") || services.includes("arr-stack");

  if (heavy) return "cluster";
  if (level === "algo-tecnico" || dockerish || media) return "minipc";
  return "nas";
}

function scoreProduct(product, selections, architecture) {
  let score = 0;
  if (product.category === architecture) score += 8;
  if (architecture === "nas" && product.category === "accessory") score += 2;
  if (architecture === "minipc" && product.category === "accessory") score += 2;
  if (architecture === "cluster" && ["minipc", "cluster", "accessory"].includes(product.category)) score += 4;
  if (product.level === selections.level) score += 4;
  if (product.budget === selections.budget) score += 3;

  const productFit = new Set(product.fit || []);
  selections.services.forEach((service) => {
    if (productFit.has(service)) score += 2;
    if (service === "arr-stack" && productFit.has("jellyfin")) score += 1;
    if (service === "archivos" && productFit.has("nextcloud")) score += 1;
    if (service === "fotos" && productFit.has("fotos")) score += 1;
  });

  if (product.category === "accessory") score = Math.min(score, 8);
  return score;
}

function getRecommendedProducts(selections, architecture, limit = 5) {
  return [...state.products]
    .map((product) => ({ product, score: scoreProduct(product, selections, architecture) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.product);
}

function serviceSummary(services) {
  return services.map((service) => serviceLabels[service] || service).join(", ");
}

function estimateCopy(architecture, selections) {
  if (architecture === "nas") {
    return selections.budget === "basico"
      ? "Compra orientativa: NAS 2 bahías + 2 discos NAS + UPS básico. Servicio de montaje: desde 499 €."
      : "Compra orientativa: NAS 4 bahías + 2/4 discos NAS + UPS + backup externo. Servicio de montaje: desde 699 €.";
  }
  if (architecture === "minipc") {
    return selections.budget === "basico"
      ? "Compra orientativa: miniPC + SSD/RAM suficiente + almacenamiento externo/NAS + UPS. Servicio de montaje: desde 799 €."
      : "Compra orientativa: miniPC potente + NAS o discos dedicados + UPS + dominio/VPN. Servicio de montaje: desde 999 €.";
  }
  return "Compra orientativa: 2–3 miniPCs + almacenamiento dedicado + UPS + switch + dominio. Servicio de montaje: desde 1.499 €.";
}

function maintenanceCopy(architecture, services) {
  const wantsMonitoring = services.includes("monitorizacion") || architecture === "cluster";
  if (architecture === "cluster") return "Mantenimiento recomendado: Plus o Pro, desde 79–149 €/mes según criticidad y número de servicios.";
  if (wantsMonitoring) return "Mantenimiento recomendado: Plus, desde 79 €/mes con monitorización básica y 1 hora mensual.";
  return "Mantenimiento opcional: Básico desde 39 €/mes para revisión mensual, backups y actualizaciones menores.";
}

function productCard(product) {
  const url = buildAffiliateUrl(product);
  const fit = (product.fit || []).slice(0, 5).map((item) => `<span>${serviceLabels[item] || item}</span>`).join("");
  return `
    <article class="product-card" data-category="${product.category}">
      <div class="product-meta">
        <span>${categoryLabels[product.category] || product.category}</span>
        <span>${budgetLabels[product.budget] || product.budget}</span>
      </div>
      <h3>${product.name}</h3>
      <p class="brand-name">${product.brand}</p>
      <p>${product.recommendedFor}</p>
      <div class="tags">${fit}</div>
      <details>
        <summary>Por qué lo recomiendo</summary>
        <p>${product.why}</p>
        <p><strong>Ojo:</strong> ${product.caveat}</p>
      </details>
      <div class="card-actions">
        <a class="button small primary" href="${url}" target="_blank" rel="nofollow sponsored noopener">Ver equipo</a>
        <a class="button small ghost" href="${quoteLink(product.name)}">Pedir montaje</a>
      </div>
    </article>
  `;
}

function quoteLink(context = "") {
  const email = state.affiliate?.site?.contactEmail || "andres.cardosoc12@gmail.com";
  const subject = state.affiliate?.defaults?.quoteSubject || "Presupuesto HostYourself";
  const body = `Hola, quiero un presupuesto para montar mi nube privada/homelab.\n\nEquipo o idea: ${context}\nNivel técnico:\nPresupuesto:\nServicios que quiero:\nHardware que ya tengo:\nComentarios:`;
  return `mailto:${email}?subject=${encode(subject)}&body=${encode(body)}`;
}

function renderRecommendation() {
  if (!state.products.length) return;
  const selections = getSelections();
  const architecture = chooseArchitecture(selections);
  const copy = architectureCopy[architecture];
  const products = getRecommendedProducts(selections, architecture, 5);
  const result = document.getElementById("recommendation-result");
  if (!result) return;

  result.innerHTML = `
    <div class="result-main">
      <p class="eyebrow">Resultado recomendado</p>
      <h3>${copy.title}</h3>
      <p>${copy.text}</p>
      <p><strong>Arquitectura base:</strong> ${copy.setup}</p>
      <p><strong>Servicios elegidos:</strong> ${serviceSummary(selections.services) || "Sin servicios seleccionados"}</p>
      <p><strong>Estimación:</strong> ${estimateCopy(architecture, selections)}</p>
      <p><strong>Soporte:</strong> ${maintenanceCopy(architecture, selections.services)}</p>
      <a class="button primary" href="${quoteLink(copy.title)}">Pedir presupuesto con esta idea</a>
    </div>
    <div class="result-products">
      <h4>Compra recomendada</h4>
      ${products.map((product) => `
        <a class="mini-product" href="${buildAffiliateUrl(product)}" target="_blank" rel="nofollow sponsored noopener">
          <strong>${product.name}</strong>
          <span>${product.brand} · ${categoryLabels[product.category] || product.category}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function renderProducts(filter = state.activeFilter) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const products = filter === "all" ? state.products : state.products.filter((product) => product.category === filter);
  grid.innerHTML = products.map(productCard).join("");
}

function bindEvents() {
  document.querySelectorAll('input[name="level"], input[name="budget"], #service-picker input').forEach((input) => {
    input.addEventListener("change", renderRecommendation);
  });

  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      state.activeFilter = button.dataset.filter || "all";
      renderProducts(state.activeFilter);
    });
  });
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`No se pudo cargar ${path}`, error);
    return fallback;
  }
}

async function init() {
  const [affiliate, products] = await Promise.all([
    loadJson("data/affiliate-links.json", null),
    loadJson("data/products.json", { products: [] }),
  ]);

  state.affiliate = affiliate;
  state.products = products.products || [];

  const disclosure = document.getElementById("affiliate-disclosure");
  if (disclosure && affiliate?.site?.disclosure) disclosure.textContent = affiliate.site.disclosure;

  const contactButton = document.getElementById("contact-button");
  if (contactButton) contactButton.href = quoteLink("Consulta general");

  bindEvents();
  renderRecommendation();
  renderProducts();
}

document.addEventListener("DOMContentLoaded", init);
