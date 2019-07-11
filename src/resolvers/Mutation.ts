import { MutationResolvers } from 'app/schemas-old/Mutation.graphql';
import { toGlobalId } from 'graphql-relay';
export const resolvers: MutationResolvers = {
    createNode: () => ({
        id: toGlobalId('Node', String(0)),
    }),
};
