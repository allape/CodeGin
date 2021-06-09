import React from 'react';
import {Button, CircularProgress} from '@material-ui/core';
import {ButtonProps} from '@material-ui/core/Button/Button';
import {LoadingProps, useStyles} from './loading';

export interface LoadingButtonProps extends LoadingProps, ButtonProps {}

export default function LoadingButton(props: LoadingButtonProps) {
  const {loading} = props;
  const classes = useStyles();
  return <div className={classes.loadingContainer}>
    <Button {...props} disabled={loading || props.disabled}/>
    {loading && <CircularProgress size={24} className={classes.loadingProgress} />}
  </div>;
}
