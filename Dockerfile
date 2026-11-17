# Pipeline image: runs the ETL (`jobs-radar run`) against DATABASE_URL.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install .

RUN useradd --create-home radar
USER radar

ENTRYPOINT ["jobs-radar"]
CMD ["run", "--export-dir", "/app/web/public/data"]
