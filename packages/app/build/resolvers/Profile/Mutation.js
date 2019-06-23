"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_relay_1 = require("graphql-relay");
exports.resolvers = {
    changeProfileName: (_context, _root, args) => ({
        profile: {
            age: null,
            id: args.input.id,
            name: args.input.newName,
        },
    }),
    createProfile: (_context, _root, args) => ({
        profile: {
            age: null,
            id: graphql_relay_1.toGlobalId('Profile', String(0)),
            name: args.input.name,
        },
    }),
};
