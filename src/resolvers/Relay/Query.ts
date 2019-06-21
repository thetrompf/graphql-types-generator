import { RelayQueryResolvers } from 'graphql-types-generator/schemas/Relay.graphql';

export const resolvers: RelayQueryResolvers = {
    node: () => null,
    nodes: () => [],
};
