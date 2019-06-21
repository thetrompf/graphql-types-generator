import { toGlobalId } from 'graphql-relay';
import { ViewerQueryResolvers } from 'graphql-types-generator/schemas/Viewer.graphql';

export const resolvers: ViewerQueryResolvers = {
    viewer: () => ({
        id: toGlobalId('Viewer', String(1)),
    }),
};
