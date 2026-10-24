FROM node:20-bookworm-slim

ENV PORT=8002 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHON_BIN=python3

# Install Python 3, pip, venv, and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python-is-python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies needed by analytics engine
COPY utho-infra-server/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /app

# Copy utho-infra-server helper modules for relative analytics imports
COPY utho-infra-server/catalog.py /app/utho-infra-server/
COPY utho-infra-server/generator.py /app/utho-infra-server/

# Copy and install Node.js dependencies
WORKDIR /app/optimizer-engine-server
COPY optimizer-engine-server/package*.json ./
RUN npm ci

# Copy optimizer engine server source code
COPY optimizer-engine-server/ ./

EXPOSE 8002

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8002/api/overview || exit 1

CMD ["npx", "tsx", "src/server.ts"]

