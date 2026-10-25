# Step 1: Build the Go optimizer binary
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY optimizer-engine-server/go.mod ./
COPY optimizer-engine-server/*.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server .

# Step 2: Runtime image with Python analytics
FROM python:3.11-slim AS runner

ENV PORT=8002 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHON_BIN=python3

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies needed by analytics engine
COPY utho-infra-server/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /app

# Copy utho-infra-server helper modules for relative analytics imports
COPY utho-infra-server/catalog.py /app/utho-infra-server/
COPY utho-infra-server/generator.py /app/utho-infra-server/

# Copy compiled Go server and analytics scripts
WORKDIR /app/optimizer-engine-server
COPY --from=builder /app/server ./server
COPY optimizer-engine-server/analytics ./analytics
COPY optimizer-engine-server/cache ./cache

EXPOSE 8002

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8002/api/overview || exit 1

CMD ["./server"]
