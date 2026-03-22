---
"@nostrify/react": patch
---

Fix NIP-46 bunker login: use `bunkerPubkey` instead of user pubkey when reconstructing `NConnectSigner`

`NUser.fromBunkerLogin()` was passing `login.pubkey` (the user's pubkey) to `NConnectSigner` instead of `login.data.bunkerPubkey` (the bunker's pubkey). For signers where these differ (e.g. Primal Signer), all signing operations silently failed after page reload because NIP-46 requests were encrypted to the wrong key, p-tags pointed to the wrong recipient, and subscription filters listened for the wrong author.
