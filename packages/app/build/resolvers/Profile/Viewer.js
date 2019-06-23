"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_relay_1 = require("graphql-relay");
exports.resolvers = {
    profile: () => ({
        age: null,
        id: graphql_relay_1.toGlobalId('Profile', String(1)),
        name: 'Brian Kejlberg',
    }),
};
