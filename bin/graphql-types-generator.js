#!/usr/bin/env node
try {
    require('graphql-types-generator/generator/cli');
} catch (e) {
    console.error(e);
}
