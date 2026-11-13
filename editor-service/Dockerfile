FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/morph && /opt/morph/bin/pip install --no-cache-dir pymorphy3==2.0.6
ENV PYTHON=/opt/morph/bin/python
WORKDIR /app
COPY editor-service ./editor-service
COPY public/editor/model.mjs ./public/editor/model.mjs
ENV PORT=4181
EXPOSE 4181
CMD ["node", "editor-service/server.mjs"]
