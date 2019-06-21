#!/bin/bash -e

DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

build-generator() {
    cd "$DIR"
    find ./packages/graphql-types-generator -type f \( -name '*.js' -o -name '*.d.ts' \) -delete
    yarn tsc -p tsconfig.generator.json
}

build-generator "$@"
