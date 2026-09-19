# Certificate Studio

Certificate Studio is a local-first Electron application for designing, generating, and emailing personalized PDF certificates. Each event has an isolated SQLite-backed workspace containing its template, normalized field geometry, participant data, mappings, output location, generation jobs, and delivery state.

## Features

- Unlimited independent event workspaces and first-run dashboard
- PNG, JPEG, and WebP template import without aspect-ratio distortion
- Visual click-and-drag field designer with move, resize, lock, duplicate, delete, grid, zoom, undo/redo, fixed values, design JSON import/export, and normalized coordinates
- Horizontal/vertical alignment, installed Windows fonts, colors, bold text, actual font-metric auto-fitting, and optional wrapping
- Excel (`.xlsx`, `.xls`) and standards-compliant UTF-8 CSV import with flexible column mappings
- Real-data preview, dry-run validation, test PDF, bulk PDF generation, duplicate-file policies, progress, cancellation, history, and resume
- SMTP testing and controlled-concurrency personalized delivery with PDF attachments and retry state
- SMTP passwords encrypted through Electron `safeStorage`; passwords are excluded from exports and logs
- Portable event JSON export/import, including template, fields, mappings, and participant data
- Light/dark themes and responsive desktop/tablet UI

## Architecture

The React renderer has no Node access. A context-isolated preload exposes typed IPC methods. Electron main owns dialogs, filesystem access, encrypted credentials, SQLite, PDF generation, and SMTP. `CertificateGenerator`, `EmailService`, import/validation utilities, and `AppDatabase` are independent backend services. PDF and preview consume the same normalized field configuration; PDF conversion correctly changes the canvas top-left origin to the PDF bottom-left origin.

## Install and run

Requirements: Windows 10/11, Node.js LTS, and npm.

```powershell
npm install
npm run dev
```

Validation and production builds:

```powershell
npm run typecheck
npm test
npm run build
npm run dist
```

`npm run build` produces the web bundle in `dist/` and Electron code in `dist-electron/`. `npm run dist` creates the Windows NSIS installer and portable executable in `release/`.

## Operating workflow

1. Create an event and upload a certificate image.
2. Open **Designer**, select **Add field**, then drag a rectangle. Name and format it, and save the design.
3. Open **Participants**, import Excel/CSV, map each field to a detected spreadsheet column or fixed value, and run the dry run.
4. Use **Preview** to inspect real participant records. Generate a test PDF and inspect it.
5. In **Generate**, select a workspace folder and an existing-file policy, validate, then generate.
6. In **Email**, enter SMTP settings and an app password, save, send a test email, then send generated certificates.
7. Review generation and delivery results under the event's **History** tab.

The selected workspace receives `template`, `input`, `generated`, and `logs` directories. Generated PDFs are in `<workspace>\generated` and use sanitized participant names. Existing names may be skipped, overwritten, or suffixed (`_2`, `_3`, …).

## Data and configuration

Application data is stored under Electron's platform user-data directory, normally:

`%APPDATA%\Certificate Studio\certificate-studio.db`

Imported template copies are stored below the same directory in `templates\<event-id>`. The original files are not modified. Output is written only to the folder explicitly selected for the event.

SMTP typically uses port 587 with STARTTLS or port 465 with SSL. Gmail and Microsoft accounts commonly require an app password. The sender address must be accepted by the SMTP account. Never share an exported event expecting it to contain credentials: passwords are deliberately excluded.

## Troubleshooting

- **Cannot generate:** confirm a template, at least one field, mappings, participants, and an output folder are present. Run Dry Run for row numbers.
- **Missing characters:** choose a font installed on Windows that supports the script. Arial, Calibri, Times New Roman, Georgia, and Verdana are included in the selector; PDF generation embeds the installed font.
- **SMTP authentication failed:** verify host/port/security, use an app password where required, and confirm SMTP access is enabled by the provider.
- **File permission error:** close an open PDF, select a writable folder, and retry. Use **Create duplicate** if an existing file is locked.
- **Native module load error after changing Electron:** run `npm install` again; the postinstall rebuilds native dependencies for Electron.

## Security notes

The renderer is sandboxed and context-isolated. Uploaded files are extension/type checked and never executed. Templates are converted to trusted PNG copies. Output filenames are sanitized against Windows-reserved characters and path traversal. SMTP passwords are encrypted using the OS credential facility, never returned to React, logged, or exported. Email uses only the explicitly configured SMTP server; participant data is not sent to third-party APIs.

## Known limitations

- Custom user-supplied font-file loading is not exposed in the UI; the five documented Windows fonts are embedded when installed. Unicode support depends on the selected font's glyph coverage.
- CSV delimiter override is not currently exposed; XLSX's parser auto-detects conventional CSV delimiters.
- Delivery speed and maximum attachment size depend on the SMTP provider.
