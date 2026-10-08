# Gemini integration settings

Save the Gemini API key and OCR model in Settings (or during initial Setup).
Keys are encrypted in `integration_credentials`; the model preference is stored
in `settings`. Receipt OCR reads these values on every scan, including after a
restart. If no model preference is saved, `GEMINI_MODEL` remains the default,
followed by the existing fallback models. Deleting a key disables receipt OCR
until another key is saved; OCR does not fall back to `GEMINI_API_KEY`.

## Upgrading older installations

Older versions copied Settings credentials and model preferences into `.env`.
Before upgrading, save any environment-only key through Settings so an encrypted
database copy exists. Keep the existing `APP_KEY`, which decrypts saved keys.

Manually remove obsolete `GEMINI_API_KEY` entries from the root, backend, and
deployment `.env` files and any container environment configuration. Remove old
`GEMINI_MODEL` copies unless you intend to keep them as deployment defaults.
Use a text editor; do not source an old `.env` file, since previously submitted
values may contain shell substitutions. Clear Laravel's configuration cache
(`php artisan config:clear` from `backend/`, or inside the backend container)
and recreate containers/restart backend workers to discard old environment
values. The application does not edit these files when saving or deleting
integration settings.
