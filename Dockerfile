FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files (including pre-built frontend)
COPY . .

# Hugging Face Spaces runs on port 7860 by default
ENV PORT=7860
ENV HOST=0.0.0.0
EXPOSE 7860

CMD ["python", "backend/run_server.py"]
