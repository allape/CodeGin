import React from 'react';
import {Button, CircularProgress, makeStyles} from '@material-ui/core';
import {ButtonProps} from '@material-ui/core/Button/Button';
import {LoadingProps, useNoLoadingProps, useStyles} from './loading';

export interface LoadingButtonProps extends LoadingProps, ButtonProps {}

export const useButtonStyles = makeStyles({
  loadingButtonWrapper: {
    display: 'inline-block',
  },
});

export default function LoadingButton(props: LoadingButtonProps) {
  const {loading} = props;
  const noLoadingProps = useNoLoadingProps(props);
  const classes = useStyles();
  const buttonWrapper = useButtonStyles();
  return <div className={`${buttonWrapper.loadingButtonWrapper} ${classes.loadingContainer}`}>
    <Button {...noLoadingProps} disabled={loading || props.disabled}/>
    {loading && <CircularProgress size={24} className={classes.loadingProgress} />}
  </div>;
}
