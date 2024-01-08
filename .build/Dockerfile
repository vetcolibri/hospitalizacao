FROM denoland/deno:alpine-1.38.3

WORKDIR /api

COPY . .

EXPOSE 8000

CMD ["deno", "run", "-A", "./mod.ts"]
