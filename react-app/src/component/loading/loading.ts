import {makeStyles} from '@material-ui/core';
import {useMemo} from 'react';

export const useStyles = makeStyles({
  loadingContainer: {
    position: 'relative',
  },
  loadingProgress: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
});

export interface LoadingProps {
  loading?: boolean;
}

export function useNoLoadingProps<T extends LoadingProps>(props: T): T {
  return useMemo(() => {
    const newProps = {...props};
    delete newProps.loading;
    return newProps;
  }, [props]);
}
