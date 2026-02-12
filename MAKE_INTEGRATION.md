# Make.com Integratie Handleiding 🔧

## Volledige Workflow Setup

### Scenario Overzicht:
```
Webhook (LeadNotifications) 
    ↓
HTTP Request (naar jouw AI Agent)
    ↓
Google Drive Upload
    ↓
Email notificatie (optioneel)
```

---

## Module 1: Webhook Trigger

1. **Add module:** Webhooks > Custom webhook
2. **Create a webhook** (kopieer de webhook URL naar LeadNotifications)
3. **Data structure:** Automatisch bepaald na eerste webhook

---

## Module 2: HTTP Request (AI Agent)

### Configuratie:

**URL:** 
```
https://jouw-railway-url.up.railway.app/download-cv
```

**Method:** 
```
POST
```

**Headers:**
| Key | Value |
|-----|-------|
| Content-Type | application/json |

**Body type:**
```
Raw
```

**Request content:**
```json
{
  "url": "{{1.cv_download_url}}"
}
```
*Vervang `1.cv_download_url` met het juiste veld uit je webhook*

**Parse response:**
```
Yes
```

**Timeout:**
```
60 seconds
```
*(CV downloads kunnen soms even duren)*

---

## Module 3: Google Drive Upload

1. **Add module:** Google Drive > Upload a File

### Configuratie:

**Select Method:**
```
Upload a File
```

**Drive:**
```
My Drive
```

**Folder:** 
```
/CV's van kandidaten
```
*(Of maak een nieuwe folder)*

**File Name:**
```
{{2.filename}}
```

**Data:**
```
{{2.base64}}
```

**Convert to:**
```
Leave as is (PDF blijft PDF)
```

**Map:**
```
Enable mapping
```

**Source:**
```
base64
```

---

## Module 4: Email Notificatie (Optioneel)

1. **Add module:** Email > Send an Email

### Configuratie:

**To:**
```
jouw@email.nl
```

**Subject:**
```
Nieuw CV ontvangen: {{2.filename}}
```

**Content:**
```
Er is een nieuw CV binnen gekomen!

Bestandsnaam: {{2.filename}}
Google Drive link: {{3.url}}

Bekijk het CV: {{3.webViewLink}}
```

---

## Error Handling (Belangrijk!)

### Add Error Handler op HTTP Request module:

1. Klik op de route tussen Module 1 en Module 2
2. Selecteer "Add error handler"
3. Kies "Resume"

**Filter:**
```
Status Code: not equal to: 200
```

**Action:**
- Send email met error notificatie
- Of sla error op in Google Sheets

---

## Testen

### Test met voorbeelddata:

1. Klik "Run once"
2. Trigger je webhook handmatig (of wacht op echte lead)
3. Check de logs:
   - Module 1: Webhook data ontvangen?
   - Module 2: Response met `success: true`?
   - Module 3: Bestand in Google Drive?

### Veelvoorkomende problemen:

**❌ "URL is required"**
→ Check of je het juiste veld uit de webhook mapped

**❌ "Failed to extract file content"**
→ De download URL is waarschijnlijk verlopen

**❌ "Timeout"**
→ Verhoog timeout naar 90 seconden

**❌ "base64 decode error"**
→ Check of je de juiste source hebt geselecteerd (base64)

---

## Pro Tips 💡

### 1. Voeg bestandsnaam variatie toe:
```
CV_{{now}}_{{2.filename}}
```
Voorkomt duplicaten

### 2. Organiseer per datum:
```
Folder: /CV's/{{formatDate(now; "YYYY-MM")}}
```
Automatisch per maand sorteren

### 3. Voeg metadata toe aan Google Sheets:
Na Module 3, voeg toe:
- Datum ontvangen
- Bestandsnaam  
- Google Drive link
- Kandidaat info uit webhook

---

## Monitoring

Check regelmatig:
1. **Make.com Execution History:** Errors?
2. **Railway Logs:** API errors?
3. **Google Drive:** Bestanden correct opgeslagen?

---

## Kosten Indicatie

**Voor 100 CV's per maand:**
- Railway: €0 (gratis tier)
- Anthropic API: ~€0.30
- Make.com: Afhankelijk van je plan
- **Totaal: ~€0.30/maand** 🎉

