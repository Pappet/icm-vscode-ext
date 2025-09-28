# ICM DSL Support

Willkommen bei der VS-Code-Erweiterung für die Dräger ICM Query Language! Diese Erweiterung ist Ihr täglicher Begleiter bei der Arbeit mit ICM-Skripten und erleichtert Ihnen das Schreiben, Verstehen und Überprüfen Ihrer Abfragen und Konfigurationsdateien. 🚀

Egal, ob Sie `.txt`-Abfragen, `.jcf`-Exportjobs oder `.template`-Dateien bearbeiten, dieses Tool unterstützt Sie mit nützlichen Helfern direkt in Ihrem Editor.

---

## Features im Detail

Unsere Extension bringt eine Reihe von intelligenten Funktionen mit, die Ihnen die Arbeit erleichtern.

### 1. Syntaxhervorhebung

Verabschieden Sie sich von eintönigem Text! Die Extension erkennt die ICM-Sprache automatisch in Dateien mit den Endungen `.txt`, `.jcf`, und `.template`. Schlüsselwörter, Parameter, Kommentare und Werte werden farblich hervorgehoben, was die Lesbarkeit Ihrer Skripte enorm verbessert.

* **Keywords** (`Orders`, `Reports`, `Codes`) werden hervorgehoben.
* **Parameter** (`Format=`, `Range=`) und deren **Werte** (`All`, `CTX-1h...CTX`) sind klar unterscheidbar.
* **Kommentare**, die mit `;` beginnen, werden ausgegraut, um sie vom aktiven Code abzuheben.
* **Formatierungs-Blöcke** und **Makros** (`!({Begin})`, `\CR`) erhalten ebenfalls eine eigene Farbgebung.

### 2. Autovervollständigung (IntelliSense)

Während Sie tippen, schlägt Ihnen die Extension passende Begriffe vor. Das spart nicht nur Zeit, sondern hilft auch, Tippfehler zu vermeiden. Die Vorschläge basieren auf einer zentralen Schema-Datei.

* **Keywords**: Tippen Sie `[` und die Extension schlägt Ihnen alle verfügbaren Keywords wie `Orders` oder `Codes` vor.
* **Parameter/Felder**: Sobald Sie ein Keyword und einen Doppelpunkt `:` geschrieben haben, erhalten Sie eine Liste aller für dieses Keyword gültigen Parameter, z.B. `TreatmentName=` oder `Range=`.
* **Werte**: Für viele Parameter wie `Records` oder `WorkFlowStatus` werden die erlaubten Werte (`All`, `Last`, `Confirmed`, etc.) direkt zur Auswahl angeboten.
* **Funktionen**: Mathematische und logische Funktionen (`Sum()`, `Greater()`) werden ebenfalls mit einer kleinen Erklärung und den erwarteten Argumenten vorgeschlagen.

### 3. Hover-Hilfen

Fahren Sie einfach mit der Maus über ein Keyword, einen Parameter oder eine Funktion, um sofort eine kontextbezogene Hilfe zu erhalten.

* **Keyword-Hilfe**: Zeigt eine Beschreibung des Keywords und listet eventuell empfohlene Parameter auf.
* **Parameter-Hilfe**: Erklärt, was der Parameter bewirkt und welche Werte er erwartet. Bei vordefinierten Werten (Enums) werden diese direkt angezeigt.

### 4. Fehlerprüfung und Diagnose

Die Extension prüft Ihren Code live auf häufige Fehler und unterstreicht problematische Stellen rot. Das hilft, Fehler frühzeitig zu erkennen und zu beheben.

* **Klammer-Prüfung**: Findet fehlende oder überzählige `[` `]` Klammern.
* **Keyword-Validierung**: Warnt Sie, wenn ein unbekanntes Keyword verwendet wird.
* **Parameter-Validierung**: Meldet unbekannte oder für das Keyword ungültige Parameter.
* **Werte-Validierung**: Prüft, ob der Wert eines Parameters gültig ist.
* **Empfehlungen**: Gibt eine Warnung aus, wenn ein für ein Keyword dringend empfohlener Parameter (wie `Format`) fehlt.

### 5. Code-Formatierung

Mit einem Klick (normalerweise über `Shift+Alt+F`) können Sie Ihr gesamtes Dokument automatisch formatieren lassen. Das sorgt für ein einheitliches und sauberes Erscheinungsbild Ihrer Skripte. Die Formatierung wendet dabei folgende Regeln an:

* **Leerzeichen um das Gleichheitszeichen (`=`)**: Es wird immer genau ein Leerzeichen vor und nach einem Gleichheitszeichen sichergestellt.
    * **Vorher:** `Format=HL7`
    * **Nachher:** `Format = HL7`

* **Leerzeichen nach Trennzeichen (`,` und `;`)**: Nach einem Komma oder Semikolon wird immer genau ein Leerzeichen eingefügt. Leerzeichen *vor* diesen Zeichen werden entfernt.
    * **Vorher:** `Fields=Value ,Date;Comment`
    * **Nachher:** `Fields = Value, Date; Comment`

* **Keine Leerzeichen innerhalb von Klammern (`[]`)**: Alle Leerzeichen direkt nach einer öffnenden `[` und vor einer schließenden `]` Klammer werden entfernt.
    * **Vorher:** `[ Orders ]`
    * **Nachher:** `[Orders]`

* **Reduzierung von mehrfachen Leerzeichen**: Mehrere aufeinanderfolgende Leerzeichen werden zu einem einzigen zusammengefasst. Einzüge am Zeilenanfang bleiben dabei erhalten.
    * **Vorher:** `Records  =  All   Format   =   CSV`
    * **Nachher:** `Records = All Format = CSV`

---

## Snippets: Schnellbausteine für Ihre Abfragen

Um Ihnen den Einstieg zu erleichtern, haben wir einige Code-Schnipsel (Snippets) vorbereitet. Tippen Sie einfach den **Präfix** und drücken Sie `Enter` oder `Tab`, um den Code-Block einzufügen.

| Präfix     | Beschreibung                                                                               |
| :--------- | :----------------------------------------------------------------------------------------- |
| `icmOrders`  | Erstellt eine Basisabfrage für Daten aus der **Tageskurve** (Keyword: `Orders`).             |
| `icmReports` | Erstellt eine Basisabfrage für Daten aus den **Beurteilungsseiten** (Keyword: `Reports`).    |
| `icmCodes`   | Erstellt eine Basisabfrage für **kodierte Diagnosen oder Prozeduren** (Keyword: `Codes`).    |
| `icmPat`     | Fragt spezifische **demographische Patientendaten** ab (Keyword: `Pat`).                    |
| `icmSystem`  | Fragt **Systeminformationen** wie den aktuellen Benutzer oder die Stations-ID ab.            |
| `icmFormatGroup`| Fügt eine **Formatierungsanweisung** mit Gruppierung (WITHIN...DO) ein.            |
| `icmJcf`     | Erstellt die **Grundstruktur für eine ICM Export Job-Steuerdatei** (`.jcf`).                 |
| `icmFullJob` | Erstellt einen **vollständigen, zeitgesteuerten Export-Job** für alle Stationspatienten.     |
| `icmDop`     | Definiert einen **abgeleiteten Verordnungsparameter (DOP)** zum Abruf von Werten aus der Tageskurve. |

---

## Erste Schritte

Damit die Extension Ihre ICM-Sprache versteht, benötigt sie eine "Wörterbuch-Datei" (genannt `dsl_icm.json`).

1.  **Pfad zum Wörterbuch festlegen**: Sagen Sie VS Code, wo diese Datei in Ihrem Projekt liegt. Öffnen Sie dazu die Einstellungen (als JSON-Datei) und fügen Sie folgende Zeile hinzu. Passen Sie den Pfad bei Bedarf an:
    ```json
    {
      "icm.schemaPath": "schemas/dsl_icm.json"
    }
    ```
2.  **Änderungen übernehmen**: Wenn Sie das Wörterbuch mal ändern, nutzen Sie den Befehl **`ICM: Schema neu laden`** (über `Ctrl+Shift+P`), damit die Extension die neuen Begriffe lernt.

---

## Troubleshooting

**Problem:** Das Schema wird nicht geladen oder die Autovervollständigung funktioniert nicht.

**Lösung:**

1.  **Pfad überprüfen:** Stellen Sie sicher, dass der Pfad zur `dsl_icm.json` in den VSCode-Einstellungen (`icm.schemaPath`) korrekt ist. Der Pfad kann absolut oder relativ zum Workspace-Ordner sein.
2.  **Schema neu laden:** Führen Sie den Befehl `ICM: Schema neu laden` aus der Befehlspalette (`Ctrl+Shift+P` oder `Cmd+Shift+P`) aus.
3.  **VSCode neustarten:** Manchmal kann ein Neustart von Visual Studio Code helfen, um die Extension und das Schema neu zu laden.

---

## Konfiguration

Die Extension kann über die VSCode-Einstellungen konfiguriert werden:

* **`icm.schemaPath`**: Optionaler Pfad zur `dsl_icm.json` Schema-Datei. Wenn kein Pfad angegeben ist, wird das mitgelieferte Schema verwendet.

---

## Projektstruktur

```
├─ src/extension.ts          # TypeScript-Einstiegspunkt, registriert Features & lädt das Schema
├─ syntaxes/icm.tmLanguage.json   # TextMate-Grammatik für das Highlighting
├─ snippets/icm.code-snippets.json # Snippets für typische ICM-Dokumente
├─ schemas/dsl_icm.json      # Beispiel-Schema (Keywords, Felder, Funktionen, Enums, Beispiele)
├─ language-configuration.json    # Kommentar- und Klammer-Regeln
├─ package.json              # VS-Code-Metadaten, Befehle, Einstellungen & Build-Skripte
└─ tsconfig.json             # TypeScript-Konfiguration für den Build nach `dist/`
```

---

## Entwicklung & Debugging

Falls Sie an der Extension selbst mitentwickeln möchten, können Sie sie ganz einfach in einer lokalen Testumgebung ausführen.

1.  Öffnen Sie das Projekt in VS Code.
2.  Stellen Sie sicher, dass alle Abhängigkeiten installiert sind (`npm install`).
3.  Drücken Sie `F5`, um den **"Extension Development Host"** zu starten. Es öffnet sich ein neues VS Code-Fenster, in dem Ihre Extension bereits geladen und aktiv ist. Hier können Sie Ihre Änderungen live testen.