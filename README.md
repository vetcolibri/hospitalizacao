# Hospitalização - API

Backoffice para gestão da hospitalização dos pacientes.

## Requisitos

- [Deno](https://deno.com)
- [Docker](https://docker.com)

## Guia de Implementação

### Ambiente de produção

- Construção da imagem em Docker

```bash
docker build -f ./.build/Dockerfile -t hospitalizacao-api .
```

- Execução do container

```bash
docker run -d -p 3001:8080 -e DATABASE_URL="db-url" hospitalizacao-api
```

### Ambiente de desenvolvimento

Execute o servidor com o seguinte comando:

```bash
deno run -A mod.ts
```
