# CV Download Agent 🤖

AI-powered agent die CV's downloadt van leadnotifications.co links en deze doorgeeft aan Make.com.

## Wat doet deze agent?

Deze agent gebruikt Claude API met computer use om:
1. Een leadnotifications.co download link te openen
2. De JavaScript uit te voeren die nodig is voor de download
3. Het CV bestand te downloaden
4. Het bestand als base64 terug te sturen naar Make.com
5. Make.com kan het dan uploaden naar Google Drive

## 🚀 Deployment op Railway.app (GRATIS)

### Stap 1: Maak Railway account
1. Ga naar https://railway.app
2. Sign up met GitHub
3. Klik op "New Project"
4. Kies "Deploy from GitHub repo"

### Stap 2: Upload deze code naar GitHub
1. Maak een nieuwe GitHub repository
2. Upload alle bestanden uit deze map
3. Commit en push

### Stap 3: Deploy op Railway
1. Selecteer je GitHub repo in Railway
2. Railway detecteert automatisch dat het een Node.js project is
3. Ga naar "Variables" tab
4. Voeg toe: `ANTHROPIC_API_KEY` = [je nieuwe API key]
5. Klik "Deploy"

### Stap 4: Verkrijg je API URL
1. Ga naar "Settings" in Railway
2. Scroll naar "Domains"
3. Klik "Generate Domain"
4. Kopieer de URL (bijv. `https://cv-agent-production.up.railway.app`)

## 📡 Gebruik in Make.com

### Module: HTTP > Make a Request

**URL:** `https://jouw-railway-url.up.railway.app/download-cv`

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "url": "{{webhook_cv_url}}"
}
```

**Response:**
```json
{
  "success": true,
  "filename": "CV 2026.pdf",
  "base64": "JVBERi0xLjQKJeLjz9...",
  "mimeType": "application/pdf"
}
```

### Daarna: Google Drive module

1. Voeg "Google Drive > Upload a File" module toe
2. **File Name:** `{{response.filename}}`
3. **File Data:** `{{response.base64}}` (selecteer "Map from response")
4. **Data Encoding:** `base64`

## 🧪 Testen

Test je endpoint met curl:

```bash
curl -X POST https://jouw-url.railway.app/download-cv \
  -H "Content-Type: application/json" \
  -d '{"url": "https://uploads.leadnotifications.co/download/xxx..."}'
```

## 💰 Kosten

- **Railway:** Gratis tier (500 uur/maand, ruim voldoende)
- **Anthropic API:** ~$0.003 per CV download
- **Totaal:** Praktisch gratis voor normaal gebruik

## 🔒 Beveiliging

**BELANGRIJK:** Voeg NOOIT je API key toe aan de code of git repository!

Gebruik altijd environment variables in Railway.

## ❓ Troubleshooting

**Error: "ANTHROPIC_API_KEY not set"**
→ Voeg de environment variable toe in Railway

**Error: "Failed to extract file content"**
→ De URL is mogelijk verlopen of vereist andere authenticatie

**Error: "URL is required"**
→ Check je Make.com request body syntax

## 📞 Support

Voor vragen of problemen, check de Railway logs:
1. Ga naar je Railway project
2. Klik op "Deployments"
3. Klik op de laatste deployment
4. Bekijk de "Logs" tab

