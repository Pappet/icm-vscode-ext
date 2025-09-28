# Roadmap zur Verbesserung der ICM DSL VS Code Extension

Basierend auf einer detaillierten Analyse des aktuellen Stands (Commit: `6cba246`) wurde die folgende Roadmap erstellt, um die Extension robuster, performanter und funktionsreicher zu machen. Die Aufgaben sind nach Priorität geordnet.

---

## Priorität Hoch: Stabilität, Sicherheit und Code-Qualität 🛡️

*Diese Aufgaben sind entscheidend, um die Extension robust, sicher und wartbar zu machen. Sie sollten vor allen anderen Punkten umgesetzt werden.*

### 1. Aufbau einer Test-Suite (Unit & Integration Tests)

* **Beschreibung:** Aktuell fehlt eine automatisierte Test-Suite. Dies ist die wichtigste Maßnahme, um die Code-Qualität sicherzustellen und zukünftige Änderungen ohne Regressionsrisiko zu ermöglichen. Im medizinischen Umfeld ist eine hohe Testabdeckung unerlässlich.
* **Umsetzungsvorschläge:**
    1.  **Testing Framework einrichten:** Integrieren Sie ein Test-Framework wie **Mocha** oder **Jest** in das Projekt. Passen Sie `package.json` und die Build-Skripte entsprechend an.
    2.  **Unit-Tests für die Validierungslogik:** Erstellen Sie Unit-Tests für die Kernfunktionen in `src/extension.ts`. Konzentrieren Sie sich zunächst auf:
        * `validateText()`: Nutzen Sie die Datei `test_errors.icmq` als Vorlage, um Testfälle für korrekte und fehlerhafte Syntax zu erstellen. Jeder Fehler in der Testdatei sollte durch einen spezifischen Test abgedeckt werden.
        * `isValidRangeValue()`: Testen Sie gültige und ungültige Zeitbereichs-Angaben.
        * `inferContext()`: Überprüfen Sie, ob der Kontext für Autovervollständigungen (Keyword, Feld, Enum) korrekt erkannt wird.
    3.  **Integrationstests:** Schreiben Sie VS-Code-Integrationstests, um das Verhalten der Provider (Completion, Hover, Diagnostics) in einer simulierten Editor-Umgebung zu prüfen.

<br>

### 2. Code-Modularisierung und Refactoring

* **Beschreibung:** Die gesamte Logik ist in der monolithischen Datei `src/extension.ts` enthalten. Das erschwert die Wartung, das Testen und die Weiterentwicklung.
* **Umsetzungsvorschläge:**
    1.  **Neue Ordnerstruktur anlegen:** Erstellen Sie im `src/`-Verzeichnis Unterordner, z.B. `providers`, `util`, `common`.
    2.  **Logik auslagern:**
        * **`src/providers/`:** Lagern Sie die Klassen `IcmCompletionProvider`, `IcmHoverProvider` und `IcmFormattingProvider` in separate Dateien aus (`completion.ts`, `hover.ts`, `formatter.ts`).
        * **`src/util/`:** Verschieben Sie alle Helper-Funktionen wie `findKeyword`, `findField`, `stripValue`, `makeDiag` etc. in eine oder mehrere Utility-Dateien. Die Schema-Lade-Logik (`loadSchema`, `resolveSchemaPath`) sollte in eine eigene Datei `schema.ts` ausgelagert werden.
        * **`src/diagnostics.ts`:** Die `validateText`-Funktion und ihre zugehörigen Helfer sollten in eine eigene Datei für die Diagnose-Logik ausgelagert werden.
        * **`src/common/types.ts`:** Die Typdefinitionen (`KeywordSpec`, `FunctionSpec`, etc.) sollten in einer zentralen Typ-Datei liegen.
    3.  **Hauptdatei `extension.ts` aufräumen:** Die `activate`-Funktion in `extension.ts` sollte nach dem Refactoring primär für die Registrierung der Provider und Commands zuständig sein und die ausgelagerte Logik importieren.

<br>

### 3. Performance-Optimierung bei der Kontextanalyse

* **Beschreibung:** Die Funktion `inferContext` liest bei jedem Tastendruck potenziell den gesamten Text bis zur Cursor-Position (`document.getText(...)`). Bei großen Dateien führt dies zu spürbaren Verzögerungen.
* **Umsetzungsvorschläge:**
    1.  **Sliding Window Ansatz:** Anstatt den gesamten Text zu laden, analysieren Sie nur einen relevanten Ausschnitt vor und nach der Cursor-Position. Suchen Sie rückwärts nach dem letzten `[`-Zeichen, um den aktuellen Block zu finden.
    2.  **Schema Caching:** Die `dsl_icm.json` wird bei jedem Start geladen. Implementieren Sie einen einfachen Cache, der das geladene Schema im Speicher hält. Fügen Sie einen File-Watcher hinzu, der das Schema nur bei einer tatsächlichen Änderung der JSON-Datei neu lädt. Dies ist effizienter als der manuelle `ICM: Schema neu laden`-Befehl.
        *Beispiel für einen einfachen Cache in `src/util/schema.ts`:*
        ```typescript
        let schema: Schema = { keywords: [], functions: [], fields: [], enums: {}, examples: [] };
        let schemaPath: string | null = null;
        let lastModified: number = 0;

        export function getSchema(forceReload: boolean = false): Schema {
          const currentPath = resolveSchemaPath();
          if (!currentPath) return schema;

          const stats = fs.statSync(currentPath);
          if (forceReload || currentPath !== schemaPath || stats.mtimeMs !== lastModified) {
            // Logik zum Laden der Datei...
            schemaPath = currentPath;
            lastModified = stats.mtimeMs;
          }
          return schema;
        }
        ```

---

## Priorität Mittel: Code-Verbesserungen und Dokumentation 🛠️

*Diese Aufgaben verbessern die Robustheit und die Developer Experience.*

### 4. Robusteres Parsen der Blöcke

* **Beschreibung:** Die Validierung basiert auf regulären Ausdrücken (`blockRegex = /\[([\s\S]*?)\]/g;`). Dieser Ansatz ist anfällig für Fehler bei verschachtelten oder fehlerhaft formatierten Blöcken.
* **Umsetzungsvorschläge:**
    1.  **State-Machine-Parser:** Implementieren Sie einen einfachen, zustandsbasierten Parser, der den Text Zeichen für Zeichen durchläuft. Er sollte den aktuellen Kontext (z.B. `inBlock`, `inKeyword`, `inParameterValue`) verfolgen. Dies ist robuster als eine einzelne Regex.
    2.  **Tokenisierung:** Der Parser sollte den Code in Tokens zerlegen (z.B. `KEYWORD`, `PARAMETER_NAME`, `OPERATOR`, `VALUE`). Dies schafft eine solide Grundlage für zukünftige, komplexere Features wie "Go to Definition" oder semantisches Highlighting.

<br>

### 5. Vervollständigung der Projektdokumentation

* **Beschreibung:** Die `package.json` und die `README.md` sind teilweise unvollständig (`"publisher": "TODO"`). Eine gute Dokumentation ist für die Akzeptanz und Wartbarkeit des Projekts entscheidend.
* **Umsetzungsvorschläge:**
    1.  **`package.json` vervollständigen:** Tragen Sie einen validen `publisher`-Namen ein. Fügen Sie ein `repository`-Feld mit dem Link zum GitHub-Repo hinzu.
    2.  **`CHANGELOG.md` erstellen:** Legen Sie eine `CHANGELOG.md`-Datei an, um zukünftige Änderungen und neue Features zu dokumentieren.
    3.  **`README.md` erweitern:** Fügen Sie einen Abschnitt "Troubleshooting" hinzu (z.B. "Was tun, wenn das Schema nicht geladen wird?"). Ergänzen Sie Informationen zur Konfiguration und Entwicklung.

---

## Priorität Niedrig: Neue Features ✨

*Diese Features erhöhen den Komfort und die Produktivität, setzen aber eine stabile Code-Basis voraus.*

### 6. Implementierung von Code Actions (Quick Fixes)

* **Beschreibung:** Die Extension meldet Fehler, bietet aber keine automatischen Korrekturen an. Quick Fixes verbessern die User Experience erheblich.
* **Umsetzungsvorschläge:**
    1.  **CodeActionProvider implementieren:** Erstellen Sie eine neue Provider-Klasse, die `vscode.CodeActionProvider` implementiert.
    2.  **Aktionen für Diagnosen bereitstellen:**
        * **Fehlender `Format`-Parameter:** Bieten Sie eine Aktion an, die `Format=!({})\CR` automatisch in den Block einfügt, wenn die entsprechende Warnung (`vscode.DiagnosticSeverity.Warning`) angezeigt wird.
        * **Unbekanntes Keyword/Feld:** Schlagen Sie ähnliche, bekannte Keywords/Felder vor (z.B. "Meinten Sie 'Records'?" für den Tippfehler 'Reccords'). Nutzen Sie hierfür eine einfache Levenshtein-Distanz-Funktion.

<br>

### 7. Verbesserung der Code-Formatierung

* **Beschreibung:** Der aktuelle Formatter in `IcmFormattingProvider` ist rudimentär und behandelt nur Leerzeichen. Eine erweiterte Formatierung würde für mehr Konsistenz sorgen.
* **Umsetzungsvorschläge:**
    1.  **Mehrzeilige Blöcke formatieren:** Sorgen Sie dafür, dass Parameter in langen Blöcken konsistent eingerückt werden (z.B. ein Parameter pro Zeile mit Einrückung).
    2.  **Parameter sortieren:** Implementieren Sie eine optionale alphabetische Sortierung der Parameter innerhalb eines Blocks, um die Lesbarkeit zu erhöhen.

<br>

### 8. Navigation im Dokument (Outline & Go to Definition)

* **Beschreibung:** Bei langen Skripten, insbesondere bei `.jcf`-Dateien, fehlt eine schnelle Navigationsmöglichkeit.
* **Umsetzungsvorschläge:**
    1.  **Document Symbol Provider:** Implementieren Sie einen `vscode.DocumentSymbolProvider`, der die Struktur des Dokuments analysiert und im "Outline"-View anzeigt (z.B. alle `[JobControl]`, `[JobList]` und Keyword-Blöcke).
    2.  **Definition Provider (optional):** Implementieren Sie einen `vscode.DefinitionProvider`, der es erlaubt, von einem Funktionsaufruf in der `Format`-Anweisung zur Funktionsdefinition in der `dsl_icm.json` zu springen (via "Go to Definition").