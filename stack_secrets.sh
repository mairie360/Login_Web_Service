#!/usr/bin/env bash

# Sourced by security_test.sh and performance_test.sh (MAIR-680), same as BFF_user's stack_secrets.sh.
#
# Only Core_API signs session JWTs: Core gets the run's Ed25519 key pair (JWT_PRIVATE_KEY +
# JWT_PUBLIC_KEY), BFF User only the public key and no JWT_SECRET, so the stack refuses every HS256
# token. Each run gets a fresh key pair (an exported JWT_PRIVATE_KEY + JWT_PUBLIC_KEY pair wins), and
# the accessToken cookie of the runners is signed here exactly like Core signs it (EdDSA, `kid` =
# RFC 7638 thumbprint of the public key, claims { sub, role, exp, iss, aud }). Nothing is committed:
# the repo is public, so a committed key or token would be valid anywhere it was reused.
#
# Exports JWT_PRIVATE_KEY (for the core-api service only), JWT_PUBLIC_KEY and ACCESS_TOKEN (`sub=2`,
# the user init-test.sql gives the Admin role, valid 4 hours), and defines sign_jwt. Needs openssl 3.

if [ -z "${JWT_PRIVATE_KEY:-}" ] || [ -z "${JWT_PUBLIC_KEY:-}" ]; then
    JWT_PRIVATE_KEY="$(openssl genpkey -algorithm ed25519 2>/dev/null)" || return 1
    JWT_PUBLIC_KEY="$(printf '%s\n' "$JWT_PRIVATE_KEY" | openssl pkey -pubout)" || return 1
fi
# A pre-exported pair must be an Ed25519 pair: a token signed with another key than the one the
# services verify with, or with a non-Ed25519 key under an EdDSA header, would get a 401 that does
# not name the cause.
jwt_derived_public="$(printf '%s
' "$JWT_PRIVATE_KEY" | openssl pkey -pubout 2>/dev/null)" \
    && jwt_given_public="$(printf '%s
' "$JWT_PUBLIC_KEY" | openssl pkey -pubin -pubout 2>/dev/null)" \
    && [ -n "$jwt_derived_public" ] \
    && printf '%s
' "$JWT_PRIVATE_KEY" | openssl pkey -noout -text 2>/dev/null | head -n 1 | grep -q 'ED25519' \
    || { echo "stack_secrets.sh: JWT_PRIVATE_KEY / JWT_PUBLIC_KEY are not valid Ed25519 PEM keys" >&2; return 1; }
if [ "$jwt_derived_public" != "$jwt_given_public" ]; then
    echo "stack_secrets.sh: JWT_PUBLIC_KEY is not the public key of JWT_PRIVATE_KEY" >&2
    return 1
fi
unset jwt_derived_public jwt_given_public
export JWT_PRIVATE_KEY JWT_PUBLIC_KEY

b64url() {
    openssl base64 -A | tr '+/' '-_' | tr -d '='
}

# `kid` of the session tokens: RFC 7638 thumbprint of the Ed25519 public key (the last 32 bytes of
# its DER), computed like mairie360_api_lib does.
JWT_KID="$(printf '{"crv":"Ed25519","kty":"OKP","x":"%s"}' \
    "$(printf '%s\n' "$JWT_PUBLIC_KEY" | openssl pkey -pubin -outform DER | tail -c 32 | b64url)" \
    | openssl dgst -sha256 -binary | b64url)" || return 1

# sign_jwt <sub> <role> <ttl-seconds> [private key PEM]: EdDSA JWT with the claims Core signs
# ({ sub, role, exp, iss, aud }, no `sid`), under Core's `kid`. The optional key signs a forgery: a
# token claiming Core's `kid` but signed with another key, which the stack must refuse.
sign_jwt() {
    local key="${4:-$JWT_PRIVATE_KEY}" header payload input signature
    header="$(printf '{"alg":"EdDSA","typ":"JWT","kid":"%s"}' "$JWT_KID" | b64url)"
    payload="$(printf '{"sub":"%s","role":"%s","exp":%d,"iss":"mairie360-core","aud":"mairie360"}' \
        "$1" "$2" "$(($(date +%s) + $3))" | b64url)"
    # `pkeyutl -rawin` (Ed25519) reads its input from a file, not from a pipe.
    input="$(mktemp)"
    printf '%s.%s' "$header" "$payload" >"$input"
    signature="$(openssl pkeyutl -sign -rawin -in "$input" -inkey <(printf '%s\n' "$key") | b64url)"
    rm -f "$input"
    [ -n "$signature" ] || return 1
    printf '%s.%s.%s' "$header" "$payload" "$signature"
}

ACCESS_TOKEN="$(sign_jwt 2 user 14400)" || return 1
export ACCESS_TOKEN
