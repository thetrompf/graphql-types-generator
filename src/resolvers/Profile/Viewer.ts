import { ProfileViewerResolvers } from 'app/schemas-old/Viewer.graphql';
export const resolvers: ProfileViewerResolvers = {
    profile: (_context, _viewer, _args) => {
        throw new Error('Not implemented yet!');
    },
};
