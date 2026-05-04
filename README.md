# HostYourself — web con recomendador y afiliados

Web estática para `hostyourself.khazadlab.es`, pensada para estar en un repo de GitHub y desplegarse en tu cluster k3s.

La web gira en torno a recomendaciones de compra para montar una nube privada/homelab:

- Perfil cero técnico: NAS sencillo.
- Perfil algo técnico: miniPC + Docker/self-hosting.
- Perfil experto: cluster k3s/Proxmox.
- Servicios opcionales: Immich, Jellyfin, Jellyseerr, Sonarr, Radarr, qBittorrent, Nextcloud, AdGuard Home, Home Assistant, Vaultwarden, Paperless-ngx, monitorización, backups y servidores de juegos.
- Links de afiliado editables sin tocar la lógica de la web.

## Estructura

```txt
site/
  index.html
  styles.css
  app.js
  aviso-legal.html
  privacidad.html
  data/
    affiliate-links.json
    products.json
Dockerfile
nginx.conf
deploy/k8s/
clusters/khazadlab/
.github/workflows/release-web.yml
```

## Dónde cambiar tus afiliados

### Amazon

Archivo:

```txt
site/data/affiliate-links.json
```

Ya está configurado con:

```json
"amazonStoreId": "andreto12-21"
```

La web añade automáticamente `tag=andreto12-21` a los enlaces de `amazon.es`.

Ejemplo en `products.json`:

```json
{
  "network": "amazon-es",
  "productUrl": "https://www.amazon.es/s?k=BMAX+B8+A+Pro+mini+pc"
}
```

No pongas precios fijos de Amazon en la web salvo que uses la API oficial de Amazon y mantengas precio/disponibilidad actualizados.

### UGREEN con Awin

Está configurado con tu enlace base:

```txt
https://www.awin1.com/cread.php?awinmid=90851&awinaffid=2880015
```

En `products.json`, usa:

```json
{
  "network": "ugreen-awin",
  "productUrl": "https://nas-eu.ugreen.com/en-es/products/ugreen-nasync-dxp4800-plus-nas-storage"
}
```

La web construye automáticamente:

```txt
https://www.awin1.com/cread.php?awinmid=90851&awinaffid=2880015&ued=URL_DEL_PRODUCTO_ENCODED
```

## Cómo cambiar productos recomendados

Edita:

```txt
site/data/products.json
```

Cada producto tiene:

```json
{
  "id": "bmax-b8a-pro",
  "name": "BMAX B8 A Pro",
  "brand": "BMAX",
  "category": "minipc",
  "level": "algo-tecnico",
  "budget": "basico",
  "fit": ["docker", "jellyfin", "adguard"],
  "recommendedFor": "...",
  "why": "...",
  "caveat": "...",
  "network": "amazon-es",
  "productUrl": "https://www.amazon.es/s?k=BMAX+B8+A+Pro+mini+pc"
}
```

Categorías válidas:

```txt
nas
minipc
cluster
accessory
```

Niveles válidos:

```txt
cero-tecnico
algo-tecnico
experto
```

Presupuestos válidos:

```txt
basico
medio
escalable
```

## Probar en local

```bash
cd site
python3 -m http.server 8080
```

Abre:

```txt
http://localhost:8080
```

## Build Docker

```bash
docker build -t hostyourself:local .
docker run --rm -p 8080:8080 hostyourself:local
```

## Despliegue k3s manual

```bash
kubectl apply -k deploy/k8s
```

## Flujo recomendado con GitHub + FluxCD

1. Haces cambios en `site/` o `site/data/*.json`.
2. Commit + push a `main`.
3. Lanzas manualmente la GitHub Action `Release web to k3s`.
4. La Action construye imagen, la sube a GHCR y actualiza el manifiesto.
5. FluxCD en k3s sincroniza y despliega.

## DNS

Dominio final:

```txt
hostyourself.khazadlab.es
```

Opciones:

- DNS directo a tu IP pública + Traefik + cert-manager.
- Cloudflare Tunnel hacia el servicio interno de k3s.

Para una web comercial en casa, Cloudflare Tunnel suele ser la opción más cómoda y limpia.

## Aviso legal

Antes de captar clientes reales, revisa:

```txt
site/aviso-legal.html
site/privacidad.html
```

Especialmente si vas a prestar mantenimiento con acceso remoto a sistemas con datos personales.
