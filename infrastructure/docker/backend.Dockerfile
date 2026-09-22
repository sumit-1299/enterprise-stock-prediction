# ==============================================================================
# Production Dockerfile for Django ASGI, Celery Worker, and Celery Beat
# ==============================================================================

FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend:/app \
    DJANGO_SETTINGS_MODULE=config.settings

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged application user
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application directories
COPY backend/ /app/backend/
COPY ml/ /app/ml/
COPY infrastructure/docker/entrypoint.sh /app/infrastructure/docker/entrypoint.sh

# Ensure proper permissions for application and static directories
RUN chmod +x /app/infrastructure/docker/entrypoint.sh && \
    mkdir -p /app/backend/staticfiles /app/ml/models/artifacts && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose Daphne ASGI port
EXPOSE 8000

# Set entrypoint and default command
ENTRYPOINT ["/app/infrastructure/docker/entrypoint.sh"]
CMD ["backend"]

