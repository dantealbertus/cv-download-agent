# CV Download Agent v2.2 - Render Optimized 🚀

## Wat is nieuw in v2.2?

✅ **Dockerfile** - Gebruikt systeem Chrome (geen build nodig!)  
✅ **Puppeteer-core** - Veel lichter dan volledige Puppeteer  
✅ **Pre-installed Chrome** - Snellere deployment  
✅ **Geoptimaliseerd** - Werkt op Render Starter zonder problemen  

---

## 🚀 Deployment op Render.com

### Stap 1: GitHub Update

1. Ga naar `github.com/dantealbertus/cv-download-agent`
2. **Verwijder alle oude bestanden** (of maak nieuwe repo)
3. Upload deze nieuwe bestanden:
   - `server.js`
   - `package.json`
   - `Dockerfile` ⬅️ **NIEUW!**
4. Commit changes

### Stap 2: Render Service Aanpassen

**BELANGRIJK:** Render moet nu Docker gebruiken in plaats van Node!

1. Ga naar je Render service: `cv-download-agent-1`
2. Ga naar **Settings**
3. Scroll naar **"Build & Deploy"**
4. **Docker**: Selecteer **"Dockerfile"**
5. **Dockerfile Path**: `/Dockerfile` (of laat leeg)
6. Klik **"Save Changes"**

### Stap 3: Environment Variables

(Blijven hetzelfde)

```
OAUTH_CLIENT_ID = 142098602161-712ne2pu96g2f2g75dpu491hh2du0u3r.apps.googleusercontent.com
OAUTH_CLIENT_SECRET = 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
OAUTH_REDIRECT_URI = https://cv-download-agent-1.onrender.com/oauth/callback
GOOGLE_DRIVE_FOLDER_ID = 1IPPnujOOGRaMCUCToRTbEeDnxbRXo5SN
```

### Stap 4: Manual Deploy

1. Klik **"Manual Deploy"** → **"Deploy latest commit"**
2. Wacht ~5-10 minuten (Docker build)
3. Check logs voor: "CV Agent v2.2 on port 3000"

---

## ✨ Waarom werkt dit beter?

**v2.1 (oud):**
- ❌ Puppeteer downloadt en compileert Chrome
- ❌ Build timeout op 512MB RAM
- ❌ 15+ minuten build tijd

**v2.2 (nieuw):**
- ✅ Chrome pre-installed in Docker image
- ✅ Puppeteer-core (geen Chrome download)
- ✅ ~5-8 minuten build tijd
- ✅ Werkt op Render Starter

---

## 🧪 Testen

Na deployment:

1. Check: `https://cv-download-agent-1.onrender.com`
2. Authorize: `https://cv-download-agent-1.onrender.com/auth`
3. Test download via Make.com

---

## 💡 Troubleshooting

**Build fails bij Docker step:**
→ Check of Dockerfile correct is geüpload naar GitHub

**"Chrome not found" error:**
→ Dockerfile heeft Chrome niet goed geïnstalleerd

**Nog steeds timeout:**
→ Upgrade naar Render Standard ($25/maand) voor 2GB RAM

---

**Versie:** 2.2.0  
**Optimized for:** Render.com Starter tier  
**Chrome:** Pre-installed via Dockerfile
