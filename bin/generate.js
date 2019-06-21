#!/usr/bin/env node
const { generate } = require('graphql-types-generator/generator');
const { GeneratorContext } = require('graphql-types-generator/generator/GeneratorContext');
const { GraphQLError, printError } = require('graphql');
const { join } = require('path');
generate(
    join(__dirname, '..', 'schemas'),
    join(__dirname, '..', 'src', 'generated', 'schemas'),
    'graphql-types-generator/schemas',
).catch(err => {
    if (err instanceof GeneratorContext) {
        err.errors.forEach(error => console.error(printError(error)));
    } else if (err instanceof GraphQLError) {
        console.error(printError(err));
    } else {
        console.error(err);
    }
    process.exit(1);
});
