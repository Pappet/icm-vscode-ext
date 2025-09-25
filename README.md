# ICM DSL Support

Eine VS-Code-Erweiterung für die Dräger ICM Query DSL. Sie bietet Syntax-Highlighting, Autovervollständigung, Hover-Hilfen, Snippets und Diagnosemeldungen, die aus einer konfigurierbaren Schema-Datei gespeist werden.

## Features auf einen Blick

- **Syntax-Highlighting** für `.icmq`, `.jcf`, `.template` und ähnliche Dateien über eine spezialisierte TextMate-Grammatik.
- **Autocomplete** für Keywords, Felder, Enum-Werte, Funktionen und bereitgestellte Beispiel-Queries.
- **Hover-Hinweise** mit Beschreibungen, Pflichtparametern und Enum-Werten direkt aus dem Schema.
- **Diagnosemeldungen** für Klammerfehler, unbekannte Keywords/Felder, doppelte Felder sowie ungültige Enum-Werte.
- **Snippets** für häufige Query- und Job-Steuer-Datei-Strukturen.
- **Command `ICM: Schema neu laden`** um Schema-Änderungen ohne Neustart zu übernehmen.

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

## Erste Schritte

1. Repository klonen und in den Projektordner wechseln.
2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
3. TypeScript nach `dist/` kompilieren:
   ```bash
   npm run compile
   ```
   Alternativ für kontinuierliches Bauen:
   ```bash
   npm run watch
   ```
4. Optional: Eine eigene `schemas/dsl_icm.json` vorbereiten und über die Einstellung `icm.schemaPath` einbinden (siehe unten).

## Entwickeln (Extension Development Host)

1. `npm install` ausführen, falls noch nicht geschehen.
2. In VS Code `F5` drücken. Dadurch startet ein Extension-Development-Host mit der lokal gebauten Version.
3. Im Entwicklungs-Host eine Testdatei (z. B. `test.icmq`) anlegen oder öffnen und Funktionen der Erweiterung ausprobieren.
4. Änderungen an `src/extension.ts` oder dem Schema speichern, anschließend den Befehl **„ICM: Schema neu laden“** (Command-Palette) ausführen oder den Development-Host neu laden, um Effekte sofort zu sehen.

## Schema einbinden & aktualisieren

1. Legen Sie Ihr Schema (z. B. `dsl_icm.json`) im Workspace ab, etwa unter `schemas/dsl_icm.json`.
2. Ergänzen Sie in den VS-Code-Einstellungen (JSON oder Settings-UI):
   ```json
   {
     "icm.schemaPath": "schemas/dsl_icm.json"
   }
   ```
   Relative Pfade beziehen sich auf den aktuellen Workspace-Ordner.
3. Nach Änderungen am Schema den Befehl **„ICM: Schema neu laden“** ausführen, damit Autocomplete, Hover und Diagnostik aktualisiert werden.

## Snippets & Beispiele

- Nutzen Sie die Präfixe `icmOrders`, `icmReports`, `icmCodes`, `icmPat` usw., um vorbereitete Query-Blöcke einzufügen.
- Im Schema gepflegte `examples` erscheinen als zusätzliche Snippet-Vorschläge in leeren Zeilen.
- Eigene Snippets können Sie durch Anpassungen in `snippets/icm.code-snippets.json` ergänzen.

## Paketieren & Installation

1. Build aktualisieren:
   ```bash
   npm run compile
   ```
2. VSIX-Paket erzeugen:
   ```bash
   npm run package
   ```
   Die Datei `icm-dsl-support-<version>.vsix` wird im Projektstamm erstellt.
3. Installation in VS Code:
   - GUI: Extensions-Ansicht → `⋯` → **Install from VSIX...** → erzeugte Datei auswählen.
   - CLI: `code --install-extension icm-dsl-support-<version>.vsix`
4. Nach erfolgreicher Installation VS Code neu laden und unter „Installiert“ prüfen, ob die Erweiterung aktiv ist.

## Nützliche Hinweise

- Halten Sie das Schema konsistent – fehlende Felder, falsch deklarierte Enums oder Syntaxfehler werden beim Laden gemeldet.
- Nutzen Sie die Watch-Aufgabe (`npm run watch`), um beim Entwickeln sofort aktuelle Builds zu erhalten.
- Die Publisher-Angabe in `package.json` muss vor einer Veröffentlichung im Marketplace auf Ihren Account angepasst werden.
