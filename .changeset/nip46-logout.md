---
"@nostrify/nostrify": minor
---

Add support for the NIP-46 `logout` method to `NConnectSigner`. Call `signer.logout()` to inform the remote signer that the session is no longer needed. Note that `logout` is a courtesy hint, so applications must still delete their locally stored signer key on logout.
