import React, {FormEvent, useCallback, useMemo, useState} from 'react';
import './App.scss';
import {Button, Divider, Grid, List, ListItem, ListItemText, Paper, TextField, Typography} from "@material-ui/core";
import {Connection} from './model/connection';
import Database from './model/database';
import {connect, stringifyError} from './api/api';
import LoadingButton, {useLoading} from './component/LoadingButton';

// 默认回填的数据
const DEFAULT_VALUE: Connection = {
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: undefined,
};

export default function App() {

  const [loading, load, loaded] = useLoading();

  // 连接信息
  const [conn, setConn] = useState<Connection>({});
  // 连接了的数据库信息
  const [database, setDatabase] = useState<Database | undefined>(undefined);

  const onConnectionInfoSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();

    const target: any = e.target;
    const data = Object.keys(DEFAULT_VALUE).reduce((p, c) => ({ ...p, [c]: target[c]?.value || (DEFAULT_VALUE as any)[c] }), {});

    setConn(data);

    const rk = load();
    connect(data).then(db => {
      setDatabase(db);
    }).catch(e => {
      stringifyError(e);
    }).finally(() => {
      loaded(rk);
    });
  }, [setConn, setDatabase]);

  const cachedDatabaseEle = useMemo(() => database ?
    <>
      <Typography color="textSecondary">{database.name}</Typography>
      <Divider />
      <List component="nav">
        {database.schemas.map((schema, index) => <ListItem key={index} button>
          <ListItemText primary={schema.name} />
        </ListItem>)}
      </List>
    </> :
    <Typography color={'textSecondary'} align={'center'}>请先建立连接</Typography>, [database]);

  return (
    <div className="code-generator-wrapper">
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4} xl={3}>
          <Paper>
            <Typography variant="h6" color="textPrimary">连接信息</Typography>
            <form className={`form-wrapper`} onSubmit={onConnectionInfoSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField label="Host" name={'host'} defaultValue={DEFAULT_VALUE.host} />
                </Grid>
                <Grid item xs={4}>
                  <TextField type={'number'} label="Port" name={'port'} defaultValue={DEFAULT_VALUE.port!.toString()} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Username" name={'username'} defaultValue={DEFAULT_VALUE.username} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Password" name={'password'} defaultValue={DEFAULT_VALUE.password} />
                </Grid>
                <Grid item xs={12}>
                  <div className="form-buttons">
                    <LoadingButton loading={loading}
                                   variant="contained" color="primary"
                                   type={'submit'}>连接</LoadingButton>
                  </div>
                </Grid>
              </Grid>
            </form>
          </Paper>
          <Paper className="paper-item">
            <Typography variant="h6" color="textPrimary">数据库信息</Typography>
            {cachedDatabaseEle}
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}
