# Hospitalização - API

Backoffice para gestão da hospitalização dos pacientes.

### Requisitos

- [Deno](https://deno.com)
- [Docker](https://docker.com)

## Guia de Implementação

### Ambiente de produção

1. Construção da imagem em Docker

```bash
$ docker build -f ./.build/Dockerfile -t hospitalizacao-api .
```

2. Excução do container

```bash
$ docker run -d -p 3001:8080 hospitalizacao-api

```