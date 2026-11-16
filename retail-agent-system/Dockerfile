FROM python:3.11-slim

# uv, pinned to the version that wrote uv.lock
COPY --from=ghcr.io/astral-sh/uv:0.7.13 /uv /uvx /bin/

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*
 
# Install exactly the versions in uv.lock (--frozen fails the build if the lock
# is out of date with pyproject.toml); dev tools like pytest are left out.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
ENV PATH="/app/.venv/bin:$PATH"

# Bake the FAQ embedding model into the image, so containers never download it
# at runtime (Render's disk is reset on every deploy). Keep the model name in
# sync with EMBEDDING_MODEL in backend/rag/pipeline.py.
ENV FASTEMBED_CACHE_PATH=/app/.fastembed_cache
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5', cache_dir='/app/.fastembed_cache')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
