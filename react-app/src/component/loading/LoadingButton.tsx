import React from 'react';
import {Button, CircularProgress} from '@material-ui/core';
import {ButtonProps} from '@material-ui/core/Button/Button';
import {LoadingProps, useNoLoadingProps, useStyles} from './loading';

export interface LoadingButtonProps extends LoadingProps, ButtonProps {}

export default function LoadingButton(props: LoadingButtonProps) {
  const {loading} = props;
  const noLoadingProps = useNoLoadingProps(props);
  const classes = useStyles();
  return <div className={classes.loadingContainer}>
    <Button {...noLoadingProps} disabled={loading || props.disabled}/>
    {loading && <CircularProgress size={24} className={classes.loadingProgress} />}
  </div>;
}
