# Julkaisu (novaservu)

Tuotanto: `https://last-chance.novanet.fi` (P36). Yksi kontti: Node-palvelin tarjoaa
API:n, WebSocketin (`/ws`) ja käännetyn käyttöliittymän. SQLite tiedostossa `./data/saari.db`
sisältää vain pseudonymisoidut jälkipuinnit (P23).

## Rakenne palvelimella

```
~/docker/last-chance/                  git clone https://github.com/pihatonttu/last-chance.git
  docker-compose.yml                   repon yleinen compose
  docker-compose.override.yml          EI gitissä: Traefik-labelit, proxy-verkko, muistiraja
  data/                                SQLite (omistaja uid 1000 = kontin node-käyttäjä)
```

`docker-compose.override.yml` (novaservun konventio, vrt. PrinttiPaja ja telemetria):

```yaml
services:
  last-chance:
    environment:
      TRUST_PROXY: "1"
    networks: [proxy]
    deploy:
      resources:
        limits:
          memory: 384M
    labels:
      - traefik.enable=true
      - traefik.docker.network=proxy
      - traefik.http.routers.last-chance.rule=Host(`last-chance.novanet.fi`)
      - traefik.http.routers.last-chance.entrypoints=websecure
      - traefik.http.routers.last-chance.tls=true
      - traefik.http.routers.last-chance.tls.certresolver=le
      # Oppilaiden IP-osoitteet eivät päädy Traefikin pääsylokiin.
      - traefik.http.routers.last-chance.observability.accesslogs=false
      - traefik.http.services.last-chance.loadbalancer.server.port=8080
networks:
  proxy:
    external: true
```

## Päivitys

```bash
ssh novaservu 'cd ~/docker/last-chance && git pull && docker compose up -d --build'
```

- Käännös kestää muutaman minuutin (pnpm install ja Vite-käännös).
- Uudelleenkäynnistys katkaisee käynnissä olevat pelit, koska pelit ovat vain muistissa.
  Päivitä siis, kun pelejä ei ole käynnissä: `curl -s https://last-chance.novanet.fi/healthz`
  kertoo käynnissä olevien pelien määrän.
- Terveystarkistus: Dockerfilen `HEALTHCHECK` (start-interval 2 s). Traefik ohittaa kontin,
  kunnes se on terve.
- Testaus palvelimelta itseltään, koska LANissa ei ole hairpin-NATia:
  `curl --resolve last-chance.novanet.fi:443:127.0.0.1 https://last-chance.novanet.fi/healthz`

## Tietosuoja käytännössä

- Traefikin pääsyloki on pois tältä reitiltä.
- Palvelin ei kirjaa pyyntöjä, IP-osoitteita eikä nimimerkkejä. Lokissa on vain pelikoodi ja
  pelaajamäärä.
- Jälkipuinnit poistuvat 30 päivän jälkeen automaattisesti (palvelin siivoaa tunnin välein).
