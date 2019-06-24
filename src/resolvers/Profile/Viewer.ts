import { ProfileViewerResolvers } from 'graphql-types-generator/schemas/Viewer.graphql';
export const resolvers: ProfileViewerResolvers = {
    profile: (context, viewer, args) => {
        throw new Error('Not implemented yet!');
    },
};
