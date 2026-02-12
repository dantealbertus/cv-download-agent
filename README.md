# CV Download Agent v2.1 - Standard Tier

Clean version voor Render Standard (2GB RAM).

## ✅ Je hebt al gedaan:
- Render Standard tier
- Environment variables ingesteld
- OAuth geauthoriseerd

## 📤 Deployment

### Stap 1: GitHub Upload
1. Ga naar `github.com/dantealbertus/cv-download-agent`
2. **DELETE ALLE bestanden** (inclusief Dockerfile en package.json.disabled)
3. Upload deze nieuwe bestanden:
   - `server.js`
   - `package.json`
   - `README.md`
4. Commit

### Stap 2: Render Deploy
Render detecteert automatisch de wijziging en deployt opnieuw.

Wacht ~3-5 minuten voor de build.

### Stap 3: Test
```
https://cv-download-agent-1.onrender.com
```

Zou moeten tonen:
```json
{
  "status": "ok",
  "authorized": true
}
```

### Stap 4: Test Download
Via Make.com of direct:
```bash
curl -X POST https://cv-download-agent-1.onrender.com/download-cv \
  -H "Content-Type: application/json" \
  -d '{"url": "YOUR_CV_URL"}'
```

---

## Environment Variables (al ingesteld)

```
OAUTH_CLIENT_ID = [je hebt dit al]
OAUTH_CLIENT_SECRET = [je hebt dit al]
OAUTH_REDIRECT_URI = https://cv-download-agent-1.onrender.com/oauth/callback
GOOGLE_DRIVE_FOLDER_ID = 1IPPnujOOGRaMCUCToRTbEeDnxbRXo5SN
```

---

## Verschil met v2.2

**v2.2:** Docker met pre-installed Chrome (voor Starter tier)
**v2.1:** Regular Puppeteer (voor Standard tier met 2GB RAM)

Standard heeft genoeg RAM om Puppeteer gewoon te laten werken! 💪

---

**Versie:** 2.1.0  
**Tier:** Render Standard (2GB RAM)  
**Kosten:** $25/maand
