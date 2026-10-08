# 14: Honor the configured production HTTPS domain

**What to build:** A production deployment with a configured domain serves the advertised HTTPS application and supports phone camera scanning.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 15.

- [ ] The reverse proxy uses the supplied domain instead of always binding an HTTP-only site.
- [ ] With a valid domain and certificate prerequisites satisfied, the advertised HTTPS URL serves the frontend and API.
- [ ] Retain and clearly describe the supported local/IP HTTP mode; do not promise camera access there on ordinary phone browsers.
- [ ] The published deployment URLs and instructions agree with the proxy configuration.
- [ ] Validate the proxy configuration for domain and local modes; check HTTPS/API routing and camera permissions in an appropriate deployed test environment.
