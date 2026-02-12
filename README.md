# CV Download Agent v2.1 - OAuth Setup Guide 🚀

## ✅ Je hebt al klaar:
- OAuth Client ID en Secret
- Google Drive Folder ID
- Railway deployment

---

## 🔧 Railway Environment Variables Instellen

Ga naar je Railway project en voeg deze 4 variables toe:

### 1. OAUTH_CLIENT_ID
```
142098602161-712ne2pu96g2f2g75dpu491hh2du0u3r.apps.googleusercontent.com
```

### 2. OAUTH_CLIENT_SECRET
```
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
```

### 3. OAUTH_REDIRECT_URI
```
https://cv-download-agent-production.up.railway.app/oauth/callback
```

### 4. GOOGLE_DRIVE_FOLDER_ID
```
1IPPnujOOGRaMCUCToRTbEeDnxbRXo5SN
```

---

## 📤 GitHub Update

1. Ga naar `github.com/dantealbertus/cv-download-agent`
2. Upload deze nieuwe bestanden (overschrijf de oude):
   - `server.js` (nieuwe OAuth versie)
   - `package.json`
   - `README.md`
3. Commit changes
4. Railway deployt automatisch opnieuw

---

## 🔑 Eenmalige Autorisatie

**NA de Railway deployment:**

1. Ga naar: `https://cv-download-agent-production.up.railway.app/auth`
2. Je wordt doorgestuurd naar Google
3. Kies je Google account
4. Klik "Allow" om toegang te geven
5. Je wordt teruggestuurd met "✅ Authorization Successful!"

**Klaar!** Je hoeft dit maar één keer te doen.

---

## 🧪 Testen

### Test 1: Check status
```bash
curl https://cv-download-agent-production.up.railway.app
```

Verwacht:
```json
{
  "status": "ok",
  "authorized": true
}
```

### Test 2: Download CV
Gebruik je Make.com scenario zoals voorheen!

---

## 🔄 Flow

```
Webhook → Make.com → Railway Agent
    ↓
Puppeteer opent pagina
    ↓
Klikt "Download file now"
    ↓
Download PDF
    ↓
Upload naar Google Drive (met OAuth)
    ↓
Return: base64 + Drive link
    ↓
Make.com verwerkt verder
```

---

## 💡 Voordelen OAuth vs Service Account

✅ **Geen organization policies** - werkt altijd  
✅ **Makkelijkere setup** - geen Cloud admin rechten  
✅ **Jouw Drive** - bestanden in je eigen account  
✅ **Eenmalige auth** - refresh tokens blijven werken  

---

## ⚠️ Let op

**Tokens blijven in memory**

Dit betekent:
- ✅ Werkt perfect zolang Railway draait
- ⚠️ Bij Railway restart: opnieuw /auth bezoeken

**Oplossing:** Later kunnen we tokens opslaan in een database of Redis.

Voor nu: als de agent niet meer werkt, bezoek gewoon `/auth` opnieuw!

---

## 🆘 Troubleshooting

### "Not authorized" error
→ Bezoek `/auth` om opnieuw te authoriseren

### "Download timeout"
→ URL is verlopen of pagina structuur veranderd

### Files niet in Drive
→ Check of GOOGLE_DRIVE_FOLDER_ID correct is
→ Check Railway logs voor errors

---

## 📊 Railway Logs Checken

1. Railway project → Deployments
2. Klik laatste deployment
3. Logs tab

Zoek naar:
- "OAuth configured: Yes"
- "Tokens stored: Yes/No"
- "Uploading to Google Drive..."

---

**Klaar om te deployen!** Upload de code naar GitHub en wacht op Railway deployment. 🎉
