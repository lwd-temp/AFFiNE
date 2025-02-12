import type { GetCurrentUserFeaturesQuery } from '@affine/graphql';
import {
  adminServerConfigQuery,
  FeatureType,
  getCurrentUserFeaturesQuery,
} from '@affine/graphql';

import { useMutateQueryResource } from '../use-mutation';
import { useQuery } from '../use-query';

export const useServerConfig = () => {
  const { data } = useQuery({
    query: adminServerConfigQuery,
  });

  return data.serverConfig;
};

export const useRevalidateServerConfig = () => {
  const revalidate = useMutateQueryResource();

  return () => {
    return revalidate(adminServerConfigQuery);
  };
};

export const useRevalidateCurrentUser = () => {
  const revalidate = useMutateQueryResource();

  return () => {
    return revalidate(getCurrentUserFeaturesQuery);
  };
};
export const useCurrentUser = () => {
  const { data } = useQuery({
    query: getCurrentUserFeaturesQuery,
  });
  return data.currentUser;
};

export function isAdmin(
  user: NonNullable<GetCurrentUserFeaturesQuery['currentUser']>
) {
  return user.features.includes(FeatureType.Admin);
}
