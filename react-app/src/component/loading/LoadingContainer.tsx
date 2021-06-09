import {LoadingProps, useStyles} from './loading';
import React, {HTMLAttributes, ReactElement} from 'react';
import {CircularProgress, makeStyles} from '@material-ui/core';

export interface LoadingContainerProps extends HTMLAttributes<HTMLDivElement>, LoadingProps {
  children: ReactElement[] | ReactElement;
}

const useContainerStyle = makeStyles({
  loadingContainer: {
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      opacity: 0,
      transition: 'opacity .25s',
    },
    '&.loading::after': {
      width: '100%',
      height: '100%',
      opacity: 1,
      backgroundColor: 'rgba(0, 0, 0, .1)',
    },
  },
});

export default function LoadingContainer(props: LoadingContainerProps) {
  const {loading, children} = props;
  const classes = useStyles();
  const subClasses = useContainerStyle();
  return <div {...props} className={`${classes.loadingContainer} ${subClasses.loadingContainer} ${loading ? 'loading' : ''}`}>
    {children}
    {loading && <CircularProgress size={24} className={classes.loadingProgress} />}
  </div>;
}
