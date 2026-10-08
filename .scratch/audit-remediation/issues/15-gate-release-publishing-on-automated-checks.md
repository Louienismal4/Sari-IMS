# 15: Gate release publishing on automated checks

**What to build:** Production images and release bundles are published only after the repository's relevant automated checks pass.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 17.

- [ ] Run backend tests and frontend type/build checks before image or deployment-bundle publication.
- [ ] A failed check prevents both image publication and the release-bundle publishing path for the same commit.
- [ ] Add a PostgreSQL test job or isolated check path for locking/snapshot behaviors that SQLite cannot verify.
- [ ] Each defect ticket supplies its own focused regression checks; enabling CI does not require all defect fixes to be completed first.
- [ ] Checks use isolated test configuration and must not write integration test credentials into a real environment file.
- [ ] Verify successful and deliberately failing check paths without publishing a test release.
