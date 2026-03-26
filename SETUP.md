# FlowSend — Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Chatwoot account at chatwoot.n8nsandro.site

## 1. Configure Environment

Edit `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/sellflux"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"
ADMIN_EMAIL="sandro@admin.com"
ADMIN_PASSWORD="your-admin-password"
```

Generate a secret: `openssl rand -base64 32`

## 2. Create Database & Run Migrations

```bash
npx prisma db push
```

## 3. Create Admin User

```bash
npm run seed
```

## 4. Run Development Server

```bash
npm run dev
```

## 5. Run Worker (in separate terminal)

The worker processes scheduled messages:

```bash
npm run worker
```

---

## Production (VPS Docker)

### Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3000"
    env_file:
      - .env.local
    restart: unless-stopped
  worker:
    build: .
    command: npm run worker
    env_file:
      - .env.local
    restart: unless-stopped
    depends_on:
      - app
```

### nginx config (app.n8nsandro.site)

```nginx
server {
    listen 80;
    server_name app.n8nsandro.site;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Testing Flow

1. Login as admin (sandro@admin.com)
2. Go to **Admin** → create a client (Dr. Sebastião)
3. Login as client
4. Go to **Configurações** → add Chatwoot credentials
5. Go to **Tags** → create "retorno-7-dias"
6. Go to **Workflows** → create new → edit in builder:
   - Trigger node: select tag "retorno-7-dias"
   - Wait node: 2 minutes (for testing)
   - Message node: "Olá {{first_name}}, sua consulta foi há 7 dias!"
7. Go to **Contatos** → create contact with phone
8. Apply tag to contact → execution is created
9. Worker sends message at scheduled time
10. Check **Execuções** for status

## Variables Available in Messages

| Variable | Description |
|----------|-------------|
| `{{name}}` | Full contact name |
| `{{first_name}}` | First name only |
| `{{phone}}` | Phone number |
| `{{email}}` | Email |
| `{{date}}` | Today's date (DD/MM/YYYY) |
| `{{now}}` | Current date and time |
| `{{doctor_name}}` | Client/doctor name |
| `{{custom.field}}` | Custom field (e.g., `{{custom.data_consulta}}`) |
