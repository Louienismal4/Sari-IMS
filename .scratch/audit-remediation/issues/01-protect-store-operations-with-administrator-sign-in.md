# 01: Protect store operations with administrator sign-in

**What to build:** An installed store requires administrator sign-in before anyone can read or change inventory, sales, customer debts, integrations, backups, or database maintenance. The existing setup-created account is usable through an accessible sign-in flow.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Source audit findings:** 1.

- [x] An installed administrator can sign in, use the app, and sign out; passwords are checked against the existing stored hash.
- [x] Unauthenticated requests to operational APIs return an authentication error and disclose no store or customer data.
- [x] Destructive maintenance and integration changes require the authenticated administrator, including requests made directly to the API.
- [x] Setup and health checks remain available as needed before installation; completing setup still locks repeat installation.
- [x] Tests cover valid and invalid sign-in, sign-out, protected reads, protected writes, and unauthenticated reset/export attempts.
