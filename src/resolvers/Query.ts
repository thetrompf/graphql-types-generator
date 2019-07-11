import { QueryResolvers } from 'app/schemas-old/Query.graphql';
import { toGlobalId } from 'graphql-relay';

export const resolvers: QueryResolvers = {
    node: () => {
        return null;
    },
    nodes: () => {
        return [];
    },
    viewer: () => ({
        id: toGlobalId('Viewer', String(0)),
    }),
};
