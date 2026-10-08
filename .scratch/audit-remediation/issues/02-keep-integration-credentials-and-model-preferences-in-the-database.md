# 02: Keep integration credentials and model preferences in the database

**What to build:** Saving Google Gemini integration settings persists the credential and chosen OCR model without writing user-submitted values into executable environment files.

**Blocked by:** None (can start immediately).

**Status:** completed

**Source audit findings:** 2, 16.

- [x] Integration updates and deletion do not write submitted values into environment files.
- [x] Receipt OCR uses the saved database model preference on subsequent requests and after restart, with the existing environment default used when no preference exists.
- [x] Encrypted database credentials remain usable; removing a saved credential does not silently reactivate that same removed credential from an application-created environment copy.
- [x] A harmless command-substitution-shaped input cannot cause shell execution through the settings flow.
- [x] Tests verify persistence across separate requests, deletion, configuration fallback, and the removal of the environment-write path; document any cleanup needed for pre-existing environment copies.

## Comments

Completed in commit `5c070f5` on 2026-10-08. Settings saves encrypted credentials and model preferences only in the database. Receipt OCR reads the saved model, retains the configured model default, and does not reactivate environment keys after deletion.

Verification: all 60 backend tests and frontend typechecking passed. Standards and spec reviews reported no findings. Regression tests cover saved credential/model use after runtime configuration reset, deletion, model fallback, and blocked environment writes with command-substitution-shaped values.

Cleanup instructions: [Gemini integration settings](../../../docs/integration-settings.md). Earlier baseline tests wrote test Gemini values into the live environment file; manually check those entries. Live Gemini calls and an actual backend restart were not tested.
