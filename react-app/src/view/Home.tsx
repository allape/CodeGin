import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {
  Button,
  ButtonGroup,
  Checkbox,
  Dialog,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core"
import Database, {Field, Schema, Table} from '../model/database'
import {getFields, getTableDDL, getTables, saveToFile, saveTplFile, stringifyError} from '../api/api'
import LoadingButton from '../component/loading/LoadingButton'
import LoadingContainer from '../component/loading/LoadingContainer'
import {Alert} from '@material-ui/lab'
import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace'
import * as me from 'monaco-editor'
import CodeEditor from '../component/code-editor/CodeEditor'
import {DEFAULT_TEMPLATE, define, run, TemplateFile} from '../model/template'
import DateString from '../component/date/DateString'
import stringify from '../component/date/date'
import usePromiseHandler from '../component/loading/promise-handler'
import TemplateFiles, {TemplateFileSelector} from './TemplateFiles'
import {useCounter} from 'react-loading-state'
import {PRESET_DEFINITIONS} from '../model/definition'
import useStorableState from '../component/storable-state/storable-state'
import {useTranslation} from 'react-i18next'
import ConnectForm from './ConnectForm'
import ListIcon from '@material-ui/icons/List'

// 默认结果语言类型
const DEFAULT_RESULT_LANGUAGE_TYPE = 'javascript'
// 保存了的结果语言类型
const RESULT_LANGUAGE_TYPE_STORAGE_KEY = 'result_language_type_storage_key'

// 上一次进行输出结果的内容的key
const LAST_TPL_STORAGE_KEY = 'last_tpl_storage_key'

// 自动输出结果的checkbox的选中值的key
const AUTO_PRINT_STORAGE_KEY = 'auto_print_storage_key'

// 结果内容支持语法高亮的语言
const LANGUAGES = Array.from(new Set(me.languages.getLanguages().map(i => i.id.toLowerCase())))

export default function Home() {

  const { t } = useTranslation()

  const defaultOkMessage = t('error.okContent')

  const [error, setError] = useState(false)
  const [message, setMessage] = useState('')

  const [promiseHandler, loading, , , errorMessage] = usePromiseHandler(stringifyError)

  useEffect(() => {
    if (errorMessage) {
      setMessage(errorMessage)
      setError(true)
    } else {
      setMessage(defaultOkMessage)
      setError(false)
    }
  }, [errorMessage, defaultOkMessage])

  const [errorMessageInDialogOpen, setErrMsgDO] = useState(false)
  const openErrorMessageInDialog = useCallback(() => {
    setErrMsgDO(true)
  }, [])
  const hideErrorMessageInDialog = useCallback(() => {
    setErrMsgDO(false)
  }, [])

  // 注入到编辑器的依赖内容
  const [definitions, setDefinitions] = useState(PRESET_DEFINITIONS)

  const [tab, setTab] = useState(0)
  const handleTabChange = useCallback((e, nv) => setTab(nv), [])

  // region 数据库

  // 连接了的数据库信息
  const [database, setDatabase] = useState<Database | undefined>(undefined)
  // 当前选中的schema
  const [schema, setSchema] = useState<Schema | undefined>(undefined)
  // table列表
  const [tables, setTables] = useState<Table[] | undefined>(undefined)
  // 当前选中的table
  const [table, setTable] = useState<Table | undefined>(undefined)
  // 当前选中的table的DDL信息
  const [ddl, setDdl] = useState('')
  // fields列表
  const [fields, setFields] = useState<Field[] | undefined>(undefined)

  // table名字搜索
  const [tableNameKeywords, setTableNameKeywords] = useState('')

  const onConnectFormChange = useCallback((db?: Database) => {
    setDatabase(db)
  }, [])

  const onDisconnectButtonClick = useCallback(() => {
    setDatabase(undefined)
    setSchema(undefined)
    setTables(undefined)
    setTable(undefined)
    setDdl('')
    setFields(undefined)
  }, [])

  // 将当前显示字段的表的数据导入编辑器依赖
  const setEditorDefinitions = useCallback(() => {
    if (!fields) {
      setMessage(t('dependency.noTableData'))
      setError(true)
      return
    } else {
      setMessage(t('dependency.injectOk'))
      setError(false)
    }

    setDefinitions(define(t, database!, table!, fields, ddl))
    setTab(0)
  }, [
    t,
    database, table, fields, ddl,
  ])
  useEffect(() => {
    if (fields) {
      setEditorDefinitions()
    }
  }, [fields, setEditorDefinitions])

  const onDatabaseClick = useCallback((schema: Schema) => {
    setSchema(schema)
    setTableNameKeywords('')
    promiseHandler(getTables(schema.name!)).then(tables => {
      setTables(tables)
    })
  }, [promiseHandler])

  const onTableClick = useCallback((table: Table) => {
    setTable(table)
    Promise.all([
      promiseHandler(getTableDDL(schema?.name!, table.name)),
      promiseHandler(getFields(schema?.name!, table.name)),
    ]).then(([ ddl, fields ]) => {
      setDdl(ddl)
      setFields(fields)
    })
  }, [schema, promiseHandler])

  // region 直接解析模板并导出为结果文件

  const [tplFileSelectorDialogOpen, setTFSelectorDO] = useState(false)
  const openTFSelectorD = useCallback(() => {
    setTFSelectorDO(true)
  }, [])
  const hideTFSelectorD = useCallback(() => {
    setTFSelectorDO(false)
  }, [])

  const onFileSelectWithFilename = useCallback((files: TemplateFileSelector[]) => {
    if (!fields) {
      setMessage(t('dependency.noTableData'))
      setError(true)
      return
    } else {
      setMessage(defaultOkMessage)
      setError(false)
    }
    // 获取依赖
    const definition = define(t, database!, table!, fields, ddl)
    // 根据模板文件进行导出
    try {
      for (const file of files) {
        const result = run(t, definition, file.content)
        if (!result.filename) {
          setMessage(t('outputResult.hasNoFilename', { file }))
          setError(true)
          return
        }
        promiseHandler(saveToFile(file.__filename!, result.filename, result.result)).then(() => {
          hideTFSelectorD()
          setMessage(defaultOkMessage)
          setError(false)
        })
      }
      alert(t('outputResult.exportSuccess'))
    } catch (e) {
      setMessage(stringifyError(e))
      setError(true)
    }
  }, [
    t, defaultOkMessage,
    database, table, fields, ddl,
    promiseHandler, hideTFSelectorD,
  ])

  // endregion

  // endregion

  // region 文本编辑器

  // 当前打开/编辑的文件名
  const [tplFileName, setTplFileName] = useState('')

  const [tplEditor, setTplEditor] = useState<me.editor.IStandaloneCodeEditor | undefined>(undefined)
  const resetTplEditor = useCallback(() => {
    if (window.confirm(t('template.resetConfirm'))) {
      tplEditor?.setValue(DEFAULT_TEMPLATE)
      setTplFileName('')
    }
  }, [t, tplEditor])
  const tplEditorWillMount = useCallback(
    (monaco: typeof me): me.editor.IStandaloneEditorConstructionOptions => {
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2016,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        typeRoots: ["node_modules/@types"],
      })
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        definitions,
        'file:///node_modules/code-gin/index.js'
      )
      const content = tplEditor?.getValue() || localStorage.getItem(LAST_TPL_STORAGE_KEY) || DEFAULT_TEMPLATE
      console.log(content)
      const model = me.editor.createModel(
        content,
        'javascript',
        me.Uri.parse(`file:///main-${Date.now()}.js`)
      )
      return {
        model,
        minimap: {
          enabled: false,
        },
        language: 'javascript',
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [definitions],
    )
  const tplEditorDidMount = useCallback((editor: me.editor.IStandaloneCodeEditor, monaco: typeof me) => {
    console.log('template editor did mount:', editor, monaco)
    setTplEditor(editor)
  }, [])

  // region 自动输出结果

  const [autoGenerate, setAutoGenerate] = useState(!!localStorage.getItem(AUTO_PRINT_STORAGE_KEY))
  const setAutoGenerateProxy = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setAutoGenerate(checked)
    if (checked) {
      localStorage.setItem(AUTO_PRINT_STORAGE_KEY, `${Date.now()}`)
    } else {
      localStorage.removeItem(AUTO_PRINT_STORAGE_KEY)
    }
  }, [])

  // endregion

  // region 模板文件列表

  const [onSavedFileSelected, triggerSavedFileSelected] = useCounter()
  const [tplFilesDialogOpen, setTFDO] = useState(false)
  const openTFD = useCallback(() => setTFDO(true), [])
  const hideTFD = useCallback(() => setTFDO(false), [])

  const loadTemplateFile = useCallback((file: TemplateFile) => {
    // if (window.confirm(t('template.loadFromFile', { file }))) {
    tplEditor?.setValue(file.content)
    setTplFileName(file.id)
    hideTFD()
    if (autoGenerate) {
      triggerSavedFileSelected(1)
    }
    // }
  }, [tplEditor, hideTFD, autoGenerate, triggerSavedFileSelected])

  // endregion

  // region 保存模板文件

  const [tplFileNameMessage, setTFNM] = useState('')
  // 模板文件名称输入弹窗
  const [tplFileSaveDialogOpen, setTFSDO] = useState(false)
  const openTplFileDialog = useCallback(() => {
    setTFSDO(true)
  }, [])
  const hideTplFileDialog = useCallback(() => {
    setTFSDO(false)
  }, [])

  // 保存文件
  const doSaveTplFile = useCallback((filename: string, content: string) => {
    promiseHandler(saveTplFile(filename, content)).then(() => {
      hideTplFileDialog()
    })
  }, [hideTplFileDialog, promiseHandler])
  // 文件名提交
  const onTplFileDialogSubmit = useCallback((e) => {
    e.preventDefault()
    let filename: string = e.target.tplFileName?.value || ''
    if (!filename) {
      setTFNM(t('template.saveWithEmptyFileName'))
      return
    }
    if (!filename.endsWith('.js')) {
      filename += '.js'
    }
    setTplFileName(filename)
    doSaveTplFile(filename, tplEditor?.getValue() || '')
  }, [t, doSaveTplFile, tplEditor])
  // 保存
  const onTplFileSave = useCallback(() => {
    openTplFileDialog()
  }, [openTplFileDialog])

  // endregion

  // endregion

  // region 依赖内容和模板结果

  // region 输出模板日志

  const [resultsDialogOpen, setRDO] = useState(false)
  const openRsD = useCallback(() => setRDO(true), [])
  const hideRsD = useCallback(() => setRDO(false), [])

  const [results, setResults] = useState<TemplateFile[]>([])
  const emptyResults = useCallback(() => {
    if (window.confirm(t('outputResult.emptyHistoryConfirm'))) {
      setResults([])
    }
  }, [t])

  // endregion

  const [resultAndDepsDialogOpen, setRADDO] = useState(false)
  const openRADD = useCallback(() => {
    setRADDO(true)
  } ,[])
  const hideRADD = useCallback(() => {
    setRADDO(false)
  } ,[])

  const [resultReloadKey, reloadResultEditor] = useCounter()
  const [resultEditor, setResultEditor] = useState<me.editor.IStandaloneCodeEditor | undefined>(undefined)
  const [result, setResult] = useState('')
  const applyResult = useCallback((result: string) => {
    setResult(result)
    reloadResultEditor()
    hideRsD()
  }, [reloadResultEditor, hideRsD])

  const depEditorOptions = useMemo((): me.editor.IStandaloneEditorConstructionOptions => ({
    value: definitions,
    readOnly: true,
    minimap: {
      enabled: false,
    },
    language: 'javascript',
  }), [definitions])

  const [resultType, setResultType] = useStorableState<string>(
    RESULT_LANGUAGE_TYPE_STORAGE_KEY,
    s => s || DEFAULT_RESULT_LANGUAGE_TYPE
  )
  const onResultTypeChange = useCallback(e => {
    const type = e.target.value
    setResultType(type)
    window.localStorage.setItem(RESULT_LANGUAGE_TYPE_STORAGE_KEY, type)
    applyResult(resultEditor?.getValue() || '')
  }, [resultEditor, applyResult, setResultType])

  const resultEditorOptions = useMemo((): me.editor.IStandaloneEditorConstructionOptions => {
    console.log('reload result editor:', resultReloadKey)
    return {
      value: result,
      minimap: {
        enabled: false,
      },
      language: resultType,
    }
  }, [resultType, result, resultReloadKey])
  const resultEditorDidMount = useCallback((editor: me.editor.IStandaloneCodeEditor) => {
    console.log('result editor mounted')
    setResultEditor(editor)
  }, [])

  const printResult = useCallback(() => {
    if (tplEditor) {
      try {
        const tpl = tplEditor.getValue()
        const result = run(t, definitions, tpl)
        applyResult(result.result)
        setMessage('')
        setError(false)
        setTab(1)

        // 添加历史记录
        setResults(olds => [{
          id: table?.name || result.result.substring(0, 10) || stringify(new Date()),
          content: result.result,
          createTime: Date.now(),
          updateTime: Date.now(),
        }, ...olds])
        localStorage.setItem(LAST_TPL_STORAGE_KEY, tpl)
        openRADD()
        setMessage(defaultOkMessage)
        setError(false)
      } catch (e) {
        setMessage(stringifyError(e))
        setError(true)
      }
    } else {
      setMessage(t('template.editorNotInitializedYet'))
      setError(true)
    }
  }, [
    t, defaultOkMessage,
    definitions, tplEditor,
    table, applyResult,
    openRADD,
  ])

  // endregion

  useEffect(() => {
    if (onSavedFileSelected > 0) {
      triggerSavedFileSelected(0)
      printResult()
    }
  }, [printResult, onSavedFileSelected, triggerSavedFileSelected])

  return (
    <div className="code-generator-wrapper">
      <Dialog open={errorMessageInDialogOpen}
              onBackdropClick={hideErrorMessageInDialog} onClose={hideErrorMessageInDialog}>
        <div style={{padding: '20px'}}>{message || t('error.okContent')}</div>
      </Dialog>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4} xl={3}>
          <Alert className="alert-wrapper" severity={error ? 'error' : 'success'} onClick={openErrorMessageInDialog}>
            <div className={'message-wrapper'}>{message}</div>
          </Alert>
          <Paper>
            <div className="typo-with-right-button">
              <Typography variant="h6" color="textPrimary">{t('connection.database.title')}</Typography>
              <div className="buttons">
                <ConnectForm promiseHandler={promiseHandler} loading={loading}
                             onChange={onConnectFormChange} onDisconnect={onDisconnectButtonClick}/>
              </div>
            </div>
            <LoadingContainer style={{padding: '0 5px 5px'}} loading={loading}>
              {database ?
                <div className="database-wrapper">
                  <Typography className="connection-name" color="textSecondary">{database.name}</Typography>
                  <Divider />
                  <div style={!fields ? {display: 'none'} : {}} className="databases-wrapper">
                    <List component="nav">
                      <ListItem button onClick={() => setFields(undefined)}>
                        <ListItemText primary={
                          <div className="text-with-icon">
                            <KeyboardBackspaceIcon className="icon"/>
                            <span>{t('connection.database.back')}</span>
                          </div>
                        } secondary={table?.name} />
                      </ListItem>
                      {/*<ListItem button onClick={() => setEditorDefinitions()}>
                        <ListItemText primary={t('connection.database.fields.injectionPrimary')}
                                      secondary={t('connection.database.fields.injectionSecondary')} />
                      </ListItem>*/}
                      <ListItem button onClick={() => openTFSelectorD()}>
                        <ListItemText primary={t('connection.database.fields.export')} />
                      </ListItem>
                      {fields ?
                        fields.map((field, index) =>
                          <ListItem key={index}>
                            <ListItemText style={{paddingLeft: '20px'}}
                                          primary={`${field.name}${field.nullable ? '?' : ''}: ${field.type}`}
                                          secondary={field.comment} />
                          </ListItem>
                        )
                        :
                        <></>
                      }
                    </List>
                  </div>
                  <div style={!!fields || !tables ? {display: 'none'} : {}} className="databases-wrapper">
                    <List component="nav">
                      <ListItem>
                        <TextField placeholder={t('connection.table.search.placeholder')}
                                   value={tableNameKeywords}
                                   onChange={e => setTableNameKeywords(e.target.value)}/>
                      </ListItem>
                      <ListItem button onClick={() => setTables(undefined)}>
                        <ListItemText primary={
                          <div className="text-with-icon">
                            <KeyboardBackspaceIcon className="icon"/>
                            <span>{t('connection.database.back')}</span>
                          </div>
                        } />
                      </ListItem>
                      {tables ?
                        tables.filter(i => i.name && i.name.toLowerCase().includes(tableNameKeywords.toLowerCase())).map((table, index) =>
                          <ListItem key={index} button onClick={() => onTableClick(table)}>
                            <ListItemText style={{paddingLeft: '20px'}}
                                          primary={`${schema?.name}.${table.name}`}
                                          secondary={table.comment} />
                          </ListItem>
                        )
                        :
                        <></>
                      }
                    </List>
                  </div>
                  <div style={!!tables ? {display: 'none'} : {}} className="databases-wrapper">
                    <List component="nav">
                      {database.schemas.map((schema, index) =>
                        <ListItem key={index} button
                                  onClick={() => onDatabaseClick(schema)}>
                          <ListItemText primary={schema.name} />
                        </ListItem>)}
                    </List>
                  </div>
                </div>
                :
                <Typography color={'textSecondary'} align={'center'} style={{padding: '10px 0'}}>{t('connection.database.notConnectionPlaceholder')}</Typography>
              }
            </LoadingContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={8} xl={9}>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={12}>
              <Paper>
                <div className="typo-with-right-button">
                  <Typography className="typo" variant="h6" color="textPrimary">{t('template.title')}(javascript) {tplFileName}</Typography>
                  <div className="buttons">
                    <Tooltip title={t('template.autoGenerate').toString()}>
                      <Checkbox checked={autoGenerate} onChange={setAutoGenerateProxy} />
                    </Tooltip>
                    <Button variant={'outlined'} onClick={openTFD}>{t('template.fileList')}</Button>
                    <LoadingButton variant={'contained'} color={'primary'}
                                   loading={loading}
                                   onClick={openTplFileDialog}>
                      {tplFileName ?
                        t('template.saveFileToXXXButton', { filename: tplFileName.substring(0, 3) })
                        : t('template.saveFileButton')
                      }
                    </LoadingButton>
                    <Button variant={'outlined'} onClick={resetTplEditor}>{t('template.resetEditor')}</Button>
                    <ButtonGroup color="primary">
                      <Button onClick={printResult}>{t('template.generate')}</Button>
                      <Button onClick={openRADD}><ListIcon/></Button>
                    </ButtonGroup>
                  </div>
                </div>
                <div className="editor-wrapper">
                  <CodeEditor divProps={{style: {height: 'calc(100vh - 20px - 36px - 40px - 20px)'}}}
                              onChange={onTplFileSave}
                              willMount={tplEditorWillMount}
                              didMount={tplEditorDidMount}/>
                </div>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Dialog open={resultAndDepsDialogOpen} maxWidth={'xl'} fullWidth onClose={hideRADD}>
        <Paper>
          <div className="typo-with-right-button" style={{paddingRight: '10px'}}>
            <Tabs value={tab} onChange={handleTabChange}>
              <Tab label={t('dependency.title')} />
              <Tab label={t('outputResult.title')} />
            </Tabs>
            <div className="buttons">
              <span style={tab === 1 ? {paddingRight: '20px'} : { display: 'none' }}>
                <Button variant={'outlined'} onClick={openRsD}>{t('outputResult.history')}</Button>
                <Tooltip title={t('outputResult.resultLng').toString()}>
                  <Select value={resultType} style={{minWidth: '120px'}} onChange={onResultTypeChange}>
                    {LANGUAGES.map(language => <MenuItem value={language} key={language}>{language}</MenuItem>)}
                  </Select>
                </Tooltip>
              </span>
              <Button variant={'contained'} color={'secondary'} onClick={hideRADD}>{t('outputResult.close')}</Button>
            </div>
          </div>
          <div className="editor-wrapper" style={{ height: 'calc(100vh - 64px - 48px - 20px)'}}>
            <div style={tab === 0 ? { height: 'calc(100% - 22px)' } : { display: 'none' }}>
              <CodeEditor divProps={{style: {height: '100%'}}}
                          value={definitions} options={depEditorOptions}/>
            </div>
            <div style={tab === 1 ? { height: 'calc(100% - 22px)' } : { display: 'none' }}>
              <CodeEditor divProps={{style: {height: '100%'}}}
                          options={resultEditorOptions}
                          didMount={resultEditorDidMount}/>
            </div>
          </div>
        </Paper>
      </Dialog>

      <TemplateFiles open={tplFilesDialogOpen}
                     onClose={hideTFD}
                     onItemClick={loadTemplateFile}/>
      <TemplateFiles open={tplFileSelectorDialogOpen}
                     onClose={hideTFSelectorD}
                     onFileSelectWithFilename={onFileSelectWithFilename}/>

      <Dialog open={resultsDialogOpen} onClose={hideRsD}>
        <Paper className="dialog-content-wrapper" style={{maxHeight: 500, minWidth: 300}}>
          <div className="typo-with-right-button">
            <Typography variant="h6" color="textPrimary">{t('outputResult.historyDialog.title')}</Typography>
            <div className="buttons">
              <LoadingButton variant={'contained'}
                             onClick={emptyResults}>{t('outputResult.historyDialog.clear')}</LoadingButton>
              <Button variant={'contained'} color={'secondary'}
                      onClick={hideRsD}>{t('outputResult.historyDialog.close')}</Button>
            </div>
          </div>
          <div style={{padding: '5px 5px 0', margin: '5px 0 0'}}>
            {results.length === 0 ? <Typography variant="body1" color="textSecondary" align="center">{t('outputResult.historyDialog.noDataPlaceholder')}</Typography> : <></>}
            <List component="nav">
              {results.map((file, index) =>
                <ListItem key={index} button onClick={() => applyResult(file.content)}>
                  <ListItemText primary={<span>
                                        <DateString date={file.createTime} />
                                        <span>&nbsp;&nbsp;&nbsp;&nbsp;{file.id}</span>
                                      </span>} />
                </ListItem>)
              }
            </List>
          </div>
        </Paper>
      </Dialog>

      <Dialog className="dialog-form-wrapper" open={tplFileSaveDialogOpen} onClose={hideTplFileDialog}>
        <form className="dialog-form" onSubmit={onTplFileDialogSubmit}>
          <TextField name="tplFileName" label={t('template.fileNameDialog.filename')} defaultValue={tplFileName}
                     required autoComplete="off"
                     error={!!tplFileNameMessage} helperText={tplFileNameMessage} />
          <div className="buttons">
            <Button variant={'contained'} disabled={loading} onClick={hideTplFileDialog}>{t('template.fileNameDialog.cancel')}</Button>
            <LoadingButton variant={'contained'} color={'primary'}
                           loading={loading} type={'submit'}>{t('template.fileNameDialog.save')}</LoadingButton>
          </div>
        </form>
      </Dialog>

    </div>
  )
}
