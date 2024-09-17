FROM denoland/deno:alpine-1.40.5

WORKDIR /api

COPY . .


EXPOSE 8000

CMD ["deno", "run", "-A", "./mod.ts"]
