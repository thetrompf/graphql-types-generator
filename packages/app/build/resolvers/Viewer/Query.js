"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_relay_1 = require("graphql-relay");
exports.resolvers = {
    viewer: () => ({
        id: graphql_relay_1.toGlobalId('Viewer', String(1)),
    }),
};
