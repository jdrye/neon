FROM python:3.11-slim

WORKDIR /app
COPY . /app

ENV PORT=8000
EXPOSE 8000

CMD ["python3", "server.py"]
