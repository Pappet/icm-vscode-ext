# ICM DSL Support

- **Dateiendung:** `.icmq`
- **Features:** Syntax-Highlighting, Snippets, Autocomplete (Keywords/Funktionen/Felder), Hover-Hilfen, einfache Klammer-Diagnostik.
- **Schema:** Optional per `icm.schemaPath` eine JSON laden, um Felder/Funktionen dynamisch zu befüllen.

## Entwickeln
1. `npm i`
2. F5 in VS Code → Extension Host startet
3. Testdatei `test.icmq` anlegen

## Paketieren
- `npm run package` → `.vsix` erzeugen
- lokal installieren: VS Code → Extensions (⋯) → "Install from VSIX...

## Nutzung mit dsl_icm.json

1. Lege deine `dsl_icm.json` ins Repo, z. B. unter `schemas/dsl_icm.json`.
2. Setze in VS Code Einstellungen (`settings.json`):
   ```json
   {
     "icm.schemaPath": "schemas/dsl_icm.json"
   }
