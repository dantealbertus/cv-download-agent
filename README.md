# CV Download Agent v2.3 - Browserless.io Edition 🚀

## ✨ Waarom Browserless.io?

**Het probleem:**
- ❌ Puppeteer is te zwaar om te builden
- ❌ Build timeouts op alle hosting platforms
- ❌ Chrome installatie is 300MB+

**De oplossing:**
- ✅ Browserless.io host Chrome voor jou
- ✅ Je verbindt via websocket
- ✅ Geen build issues meer!
- ✅ Deployment werkt op Render FREE tier!

---

## 📋 Setup (15 minuten)

### **Stap 1: Browserless.io Account** (5 min)

1. Ga naar: https://browserless.io
2. Klik **"Sign Up"** (rechtsboven)
3. Kies een plan:
   - **Starter:** $25/maand (500 requests)
   - **Professional:** $75/maand (2500 requests)
4. Na signup, ga naar **Dashboard**
5. Kopieer je **API Key** (bijv: `abc123def456...`)

---

### **Stap 2: GitHub Upload** (3 min)

1. Ga naar `github.com/dantealbertus/cv-download-agent`
2. **DELETE ALLE bestanden** (fresh start)
3. Upload deze nieuwe bestanden:
   - `server.js`
   - `package.json`
   - `README.md`
   - `.gitignore`
4. Commit: "v2.3 with Browserless.io"

---

### **Stap 3: Render Environment Variables** (3 min)

Ga naar Render → cv-download-agent-1 → Environment

**Voeg TOE:**
```
BROWSERLESS_API_KEY = [je Browserless API key]
```

**Bestaande variables (blijven):**
```
OAUTH_CLIENT_ID = 142098602161-712ne2pu96g2f2g75dpu491hh2du0u3r.apps.googleusercontent.com
OAUTH_CLIENT_SECRET = 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
OAUTH_REDIRECT_URI = https://cv-download-agent-1.onrender.com/oauth/callback
GOOGLE_DRIVE_FOLDER_ID = 1IPPnujOOGRaMCUCToRTbEeDnxbRXo5SN
```

---

### **Stap 4: Downgrade Render** (optioneel)

Je kunt nu **terug naar FREE tier!** 🎉

Browserless doet het zware werk, dus Render hoeft alleen maar de API te runnen.

1. Settings → Instance Type
2. Verander van **Standard** naar **Starter** of **Free**
3. Save
4. Manual Deploy

**Bespaar:** $18/maand (van $25 naar $7 Starter, of zelfs FREE!)

---

### **Stap 5: Deploy en Test** (4 min)

Render deployt automatisch.

**Check:**
```
https://cv-download-agent-1.onrender.com
```

Zou moeten tonen:
```json
{
  "status": "ok",
  "version": "2.3.0",
  "browserless": true,
  "authorized": true
}
```

---

## 🧪 Test Download

Via Make.com (URL blijft hetzelfde):
```
POST https://cv-download-agent-1.onrender.com/download-cv
Body: {"url": "YOUR_CV_URL"}
```

Of via curl:
```bash
curl -X POST https://cv-download-agent-1.onrender.com/download-cv \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/cv.pdf"}'
```

---

## 💰 Kosten Breakdown

**v2.1/v2.2 (oude setup):**
- Render Standard: $25/maand
- **Totaal: $25/maand**

**v2.3 (nieuwe setup):**
- Browserless.io Starter: $25/maand
- Render FREE tier: $0/maand
- **Totaal: $25/maand**

**Voordelen:**
- ✅ Zelfde kosten
- ✅ Maar WEL werkend!
- ✅ Professionele browser service
- ✅ Geen build issues meer
- ✅ Automatische Chrome updates

---

## 🔧 Troubleshooting

**"Browserless API key not configured"**
→ Check BROWSERLESS_API_KEY in Render environment variables

**"Connection timeout"**
→ Check Browserless.io dashboard voor API status

**Build fails**
→ Mag niet gebeuren! Puppeteer-core is super licht

---

## 📊 Verschil met vorige versies

**v2.1:** Puppeteer (build timeout)
**v2.2:** Docker + Chrome (detectie problemen)
**v2.3:** Browserless.io (werkt gewoon!) ✅

---

**Versie:** 2.3.0  
**Stack:** Node.js + puppeteer-core + Browserless.io  
**Hosting:** Render (FREE tier mogelijk!)  
**Browser:** Browserless.io ($25/maand)
