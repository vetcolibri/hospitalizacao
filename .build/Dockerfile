FROM denoland/deno:alpine-1.38.3

WORKDIR /api

COPY . .

RUN deno task initdb

EXPOSE 8000

CMD ["deno", "run", "-A", "./infra/server.ts"]
