import { ProfileViewerResolvers } from 'graphql-types-generator/schemas/Profile.graphql';
import { toGlobalId } from 'graphql-relay';

export const resolvers: ProfileViewerResolvers = {
    profile: () => ({
        id: toGlobalId('Profile', String(1)),
        name: 'Brian Kejlberg',
    }),
};
