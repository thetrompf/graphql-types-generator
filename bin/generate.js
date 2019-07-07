#!/usr/bin/env node
const { generate } = require('graphql-types-generator/generator');
const { GeneratorContext } = require('graphql-types-generator/generator/GeneratorContext');
const { GraphQLError, printError } = require('graphql');
const { join } = require('path');

generate({
    contextImportSpec: 'graphql-types-generator/Context#Context',
    schemaInputPath: join(__dirname, '..', 'schemas'),
    resolversImportPrefix: 'graphql-types-generator/resolvers',
    resolversOutputPath: join(__dirname, '..', 'src', 'resolvers'),
    typesImportPrefix: 'graphql-types-generator/schemas',
    typesOutputPath: join(__dirname, '..', 'src', 'generated', 'schemas'),
}).catch(err => {
    if (err instanceof GeneratorContext) {
        err.errors.forEach(error => console.error(printError(error)));
    } else if (err instanceof GraphQLError) {
        console.error(printError(err));
    } else {
        console.error(err);
    }
    process.exit(1);
});
