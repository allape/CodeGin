import {Button, Dialog, Grid, Paper, TextField, Typography} from '@material-ui/core'
import LoadingButton from '../component/loading/LoadingButton'
import React, {FormEvent, useCallback, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Connection} from '../model/connection'
import {connect} from '../api/api'
import {PromiseHandlerFunction} from '../component/loading/promise-handler'
import Database from '../model/database'

// 保存连接信息的key
const CONNECTION_STORAGE_KEY = 'connection_storage_key'
// 默认回填的数据
const DEFAULT_VALUE: Connection = (() => {
  try {
    const fromCache = window.localStorage.getItem(CONNECTION_STORAGE_KEY)
    if (fromCache) {
      const result = JSON.parse(fromCache)
      if (result) return result
    }
  } catch (e) {
    console.error('error occurred while parsing stored connection info:', e)
  }
  return {
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: undefined,
  }
})()

export interface ConnectFormProps {
  loading?: boolean
  promiseHandler?: PromiseHandlerFunction
  onChange?: (db?: Database) => void
  onDisconnect?: () => void
}

export default function ConnectForm(props: ConnectFormProps) {
  const {
    loading,
    promiseHandler,
    onChange,
    onDisconnect,
  } = props

  // 连接信息
  const [conn, setConn] = useState<Connection | undefined>(undefined)

  const onConnectionInfoSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()

    const target: any = e.target
    const data: Connection = Object.keys(DEFAULT_VALUE).reduce((p, c) => ({ ...p, [c]: target[c]?.value }), {})

    const newErrors: Record<string, boolean> = {}

    if (!data.host) {
      newErrors.host = true
    } else if (!data.port) {
      newErrors.port = true
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length) {
      return
    }

    setConn(data)
    window.localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(data))

    if (onChange && promiseHandler) {
      onChange(undefined)
      promiseHandler(connect(data)).then(db => {
        onChange(db)
      })
    }
  }, [promiseHandler, onChange])

  const { t } = useTranslation()

  // 连接信息表单错误信息
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // 断开连接按钮点击时
  const onDisconnectProxy = useCallback(() => {
    setConn(undefined)
    if (onDisconnect) {
      onDisconnect()
    }
  }, [onDisconnect])

  return <div className={'connect-form-wrapper'}>
    <Dialog open={!conn}>
      <Paper className={`connect-form`}>
        <Typography variant="h6" color="textPrimary">{t('connection.title')}</Typography>
        <form onSubmit={onConnectionInfoSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField required label={t('connection.host')} name={'host'} defaultValue={DEFAULT_VALUE.host}
                         error={errors.host} helperText={'Host is required'} />
            </Grid>
            <Grid item xs={4}>
              <TextField required type={'number'} label={t('connection.port')} name={'port'}
                         defaultValue={DEFAULT_VALUE.port!.toString()}
                         error={errors.port} helperText={'Port is required'} />
            </Grid>
            <Grid item xs={6}>
              <TextField label={t('connection.username')} name={'username'} defaultValue={DEFAULT_VALUE.username} />
            </Grid>
            <Grid item xs={6}>
              <TextField label={t('connection.password')} name={'password'} defaultValue={DEFAULT_VALUE.password} />
            </Grid>
            <Grid item xs={12}>
              <div className="form-buttons">
                <LoadingButton loading={loading}
                               variant="contained" color="primary"
                               type={'submit'}>{t('connection.connect')}</LoadingButton>
              </div>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Dialog>
    <Button style={{opacity: conn ? 1 : 0}} variant="contained" color="secondary"
            onClick={onDisconnectProxy}>{t('connection.disconnect')}</Button>
  </div>
}
