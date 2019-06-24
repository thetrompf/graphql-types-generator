import { MutationResolvers } from 'graphql-types-generator/schemas/Mutation.graphql';
import { toGlobalId } from 'graphql-relay';
export const resolvers: MutationResolvers = {
    createNode: () => ({
        id: toGlobalId('Node', String(0)),
    }),
};
