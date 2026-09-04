"""Make Python's SSL stack use the OS certificate store (macOS Keychain / Windows
cert store) instead of the certifi-bundled CA list.

httpx (used by the openai/litellm client stack) hardcodes certifi's CA bundle by
default and ignores SSL_CERT_FILE, so on machines with a corporate root CA
installed system-wide (e.g. Aikido safe-chain's traffic inspection cert), calls
to an internal proxy fail verification even though the OS itself trusts it. This
makes verification consult the real OS trust store instead - proper trust, not a
bypass. Import this before making any HTTPS calls.
"""

import truststore

truststore.inject_into_ssl()
