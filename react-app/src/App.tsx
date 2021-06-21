import React, {FormEvent, useCallback, useMemo, useState} from 'react';
import './App.scss';
import {
  Button,
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
  Typography
} from "@material-ui/core";
import {Connection} from './model/connection';
import Database, {Field, Schema, Table} from './model/database';
import {connect, getFields, getTableDDL, getTables, saveTplFile, stringifyError} from './api/api';
import LoadingButton from './component/loading/LoadingButton';
import LoadingContainer from './component/loading/LoadingContainer';
import {Alert, AlertTitle} from '@material-ui/lab';
import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace';
import * as me from 'monaco-editor';
import CodeEditor from './component/code-editor/CodeEditor';
import {DEFAULT_TEMPLATE, define, run, TemplateFile} from './model/template';
import DateString from './component/date/DateString';
import stringify from './component/date/date';
import usePromiseHandler from './component/loading/promise-handler';
import TemplateFiles from './view/TemplateFiles';
import {useCounter} from './component/loading/loading';
import {PRESET_DEFINITIONS} from './model/definition';
import useStorableState from './component/storable-state/storable-state';
import {useTranslation} from 'react-i18next';

// 保存连接信息的key
const CONNECTION_STORAGE_KEY = 'connection_storage_key';
// 默认回填的数据
const DEFAULT_VALUE: Connection = (() => {
  try {
    const fromCache = window.localStorage.getItem(CONNECTION_STORAGE_KEY);
    if (fromCache) {
      const result = JSON.parse(fromCache);
      if (result) return result;
    }
  } catch (e) {
    console.error('error occurred while parsing stored connection info:', e);
  }
  return {
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: undefined,
  };
})();

// 保存了的结果语言类型
const DEFAULT_RESULT_LANGUAGE_TYPE = 'javascript';
const RESULT_LANGUAGE_TYPE_STORAGE_KEY = 'result_language_type_storage_key';

// 结果内容支持语法高亮的语言
const LANGUAGES = Array.from(new Set(me.languages.getLanguages().map(i => i.id.toLowerCase())));

export default function App() {

  const { t } = useTranslation();

  const [promiseHandler, loading, , , errorMessage, setEM] = usePromiseHandler(stringifyError);

  // 注入到编辑器的依赖内容
  const [definitions, setDefinitions] = useState(PRESET_DEFINITIONS);

  const [tab, setTab] = useState(0);
  const handleTabChange = useCallback((e, nv) => setTab(nv), []);

  // region 数据库

  // 连接信息表单错误信息
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // 连接信息
  const [, setConn] = useState<Connection>({});
  // 连接了的数据库信息
  const [database, setDatabase] = useState<Database | undefined>(undefined);
  // 当前选中的schema
  const [schema, setSchema] = useState<Schema | undefined>(undefined);
  // table列表
  const [tables, setTables] = useState<Table[] | undefined>(undefined);
  // 当前选中的table
  const [table, setTable] = useState<Table | undefined>(undefined);
  // 当前选中的table的DDL信息
  const [ddl, setDdl] = useState('');
  // fields列表
  const [fields, setFields] = useState<Field[] | undefined>(undefined);

  const onConnectionInfoSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();

    const target: any = e.target;
    const data: Connection = Object.keys(DEFAULT_VALUE).reduce((p, c) => ({ ...p, [c]: target[c]?.value }), {});

    const newErrors: Record<string, boolean> = {};

    if (!data.host) {
      newErrors.host = true;
    } else if (!data.port) {
      newErrors.port = true;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      return;
    }

    setConn(data);
    window.localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(data));

    setDatabase(undefined);
    promiseHandler(connect(data)).then(db => {
      setDatabase(db);
    });
  }, [promiseHandler]);

  const onDatabaseClick = useCallback((schema: Schema) => {
    setSchema(schema);
    promiseHandler(getTables(schema.name!)).then(tables => setTables(tables));
  }, [promiseHandler]);

  const onTableClick = useCallback((table: Table) => {
    setTable(table);
    Promise.all([
      promiseHandler(getTableDDL(schema?.name!, table.name)),
      promiseHandler(getFields(schema?.name!, table.name)),
    ]).then(([ ddl, fields ]) => {
      setDdl(ddl);
      setFields(fields);
    });
  }, [schema, promiseHandler]);

  // 将当前显示字段的表的数据导入编辑器依赖
  const setEditorDefinitions = useCallback(() => {
    if (!fields) {
      setEM(t('dependency.noTableData'));
      return;
    }

    setDefinitions(define(t, database!, table!, fields, ddl));
    setTab(0);
  }, [
    t,
    database, table, fields, ddl,
    setEM,
  ]);

  // endregion

  // region 文本编辑器

  // 模板文件列表刷新器
  const [tplFilesReloadKey, reloadTplFiles] = useCounter();
  // 当前打开/编辑的文件名
  const [tplFileName, setTplFileName] = useState('');

  const [tplEditor, setTplEditor] = useState<me.editor.IStandaloneCodeEditor | undefined>(undefined);
  const resetTplEditor = useCallback(() => {
    if (window.confirm(t('template.resetConfirm'))) {
      tplEditor?.setValue(DEFAULT_TEMPLATE);
      setTplFileName('');
    }
  }, [t, tplEditor]);
  const tplEditorWillMount = useCallback(
    (monaco: typeof me): me.editor.IStandaloneEditorConstructionOptions => {
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2016,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        typeRoots: ["node_modules/@types"],
      });
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        definitions,
        'file:///node_modules/code-gin/index.js'
      );
      const content = tplEditor?.getValue() || DEFAULT_TEMPLATE;
      console.log(content);
      const model = me.editor.createModel(
        content,
        'javascript',
        me.Uri.parse(`file:///main-${Date.now()}.js`)
      );
      return {
        model,
        minimap: {
          enabled: false,
        },
        language: 'javascript',
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [definitions],
    );
  const tplEditorDidMount = useCallback((editor: me.editor.IStandaloneCodeEditor, monaco: typeof me) => {
    console.log('template editor did mount:', editor, monaco);
    setTplEditor(editor);
  }, []);

  // region 模板文件列表

  const [tplFilesDialogOpen, setTFDO] = useState(false);
  const openTFD = useCallback(() => setTFDO(true), []);
  const hideTFD = useCallback(() => setTFDO(false), []);

  const loadTemplateFile = useCallback((file: TemplateFile) => {
    if (window.confirm(t('template.loadFromFile', { file }))) {
      tplEditor?.setValue(file.content);
      setTplFileName(file.id);
      hideTFD();
    }
  }, [t, tplEditor, hideTFD]);

  // endregion

  // region 保存模板文件

  const [tplFileNameMessage, setTFNM] = useState('');
  // 模板文件名称输入弹窗
  const [tplFileSaveDialogOpen, setTFSDO] = useState(false);
  const openTplFileDialog = useCallback(() => {
    setTFSDO(true);
  }, []);
  const hideTplFileDialog = useCallback(() => {
    setTFSDO(false);
  }, []);

  // 保存文件
  const doSaveTplFile = useCallback((filename: string, content: string) => {
    promiseHandler(saveTplFile(filename, content)).then(() => {
      hideTplFileDialog();
      reloadTplFiles();
    });
  }, [hideTplFileDialog, reloadTplFiles, promiseHandler]);
  // 文件名提交
  const onTplFileDialogSubmit = useCallback((e) => {
    e.preventDefault();
    let filename: string = e.target.tplFileName?.value || '';
    if (!filename) {
      setTFNM(t('template.saveWithEmptyFileName'));
      return;
    }
    if (!filename.endsWith('.js')) {
      filename += '.js';
    }
    setTplFileName(filename);
    doSaveTplFile(filename, tplEditor?.getValue() || '');
  }, [t, doSaveTplFile, tplEditor]);
  // 保存
  const onTplFileSave = useCallback(() => {
    openTplFileDialog();
  }, [openTplFileDialog]);

  // endregion

  // endregion

  // region 依赖内容和模板结果

  const [resultReloadKey, reloadResultEditor] = useCounter();
  const [resultEditor, setResultEditor] = useState<me.editor.IStandaloneCodeEditor | undefined>(undefined);
  const [result, setResult] = useState('');
  const applyResult = useCallback((result: string) => {
    setResult(result);
    reloadResultEditor();
  }, [reloadResultEditor]);

  const depEditorOptions = useMemo((): me.editor.IStandaloneEditorConstructionOptions => ({
    value: definitions,
    readOnly: true,
    minimap: {
      enabled: false,
    },
    language: 'javascript',
  }), [definitions]);

  const [resultType, setResultType] = useStorableState<string>(
    RESULT_LANGUAGE_TYPE_STORAGE_KEY,
    s => s || DEFAULT_RESULT_LANGUAGE_TYPE
  );
  const onResultTypeChange = useCallback(e => {
    const type = e.target.value;
    setResultType(type);
    window.localStorage.setItem(RESULT_LANGUAGE_TYPE_STORAGE_KEY, type);
    applyResult(resultEditor?.getValue() || '');
  }, [resultEditor, applyResult, setResultType]);

  const resultEditorOptions = useMemo((): me.editor.IStandaloneEditorConstructionOptions => {
    console.log('reload result editor:', resultReloadKey);
    return {
      value: result,
      minimap: {
        enabled: false,
      },
      language: resultType,
    };
  }, [resultType, result, resultReloadKey]);
  const resultEditorDidMount = useCallback((editor: me.editor.IStandaloneCodeEditor) => {
    console.log('result editor mounted');
    setResultEditor(editor);
  }, []);

  const printResult = useCallback(() => {
    if (tplEditor) {
      try {
        const result = run(t, definitions, tplEditor.getValue());
        applyResult(result.result);
        setEM('');
        setTab(1);

        // 添加历史记录
        setResults(olds => [{
          id: table?.name || result.result.substring(0, 10) || stringify(new Date()),
          content: result.result,
          createTime: Date.now(),
          updateTime: Date.now(),
        }, ...olds]);
      } catch (e) {
        setEM(stringifyError(e));
      }
    } else {
      setEM(t('template.editorNotInitializedYet'));
    }
  }, [t, definitions, tplEditor, table, applyResult, setEM]);

  // region  输出模板日志

  const [resultsDialogOpen, setRDO] = useState(false);
  const openRsD = useCallback(() => setRDO(true), []);
  const hideRsD = useCallback(() => setRDO(false), []);

  const [results, setResults] = useState<TemplateFile[]>([]);
  const emptyResults = useCallback(() => {
    if (window.confirm(t('outputResult.emptyHistoryConfirm'))) {
      setResults([]);
    }
  }, [t]);

  // endregion

  // endregion

  return (
    <div className="code-generator-wrapper">
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4} xl={3}>
          <Alert className="alert-wrapper" severity={errorMessage ? 'error' : 'success'}>
            <AlertTitle>{t(errorMessage ? 'error.notOK' : 'error.ok')}</AlertTitle>
            {errorMessage || t('error.okContent')}
          </Alert>
          <Paper>
            <Typography variant="h6" color="textPrimary">{t('connection.title')}</Typography>
            <form className={`form-wrapper`} onSubmit={onConnectionInfoSubmit}>
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
          <Paper className="paper-item">
            <Typography variant="h6" color="textPrimary">{t('connection.database.title')}</Typography>
            <LoadingContainer style={{padding: '5px'}} loading={loading}>
              {database ?
                <>
                  <Typography color="textSecondary">{database.name}</Typography>
                  <Divider />
                  <div style={{maxHeight: 500, overflow: 'auto'}}>
                    {tables ?
                      <>
                        {fields ?
                          <List component="nav">
                            <ListItem button onClick={() => setFields(undefined)}>
                              <ListItemText primary={
                                <div className="text-with-icon">
                                  <KeyboardBackspaceIcon className="icon"/>
                                  <span>{t('connection.database.back')}</span>
                                </div>
                              } secondary={table?.name} />
                            </ListItem>
                            <ListItem button onClick={() => setEditorDefinitions()}>
                              <ListItemText primary={t('connection.database.fields.injectionPrimary')}
                                            secondary={t('connection.database.fields.injectionSecondary')} />
                            </ListItem>
                            {fields.map((field, index) =>
                              <ListItem key={index} button>
                                <ListItemText style={{paddingLeft: '20px'}}
                                              primary={`${field.name}${field.nullable ? '?' : ''}: ${field.type}`}
                                              secondary={field.comment} />
                              </ListItem>)}
                          </List>
                          :
                          <List component="nav">
                            <ListItem button onClick={() => setTables(undefined)}>
                              <ListItemText primary={
                                <div className="text-with-icon">
                                  <KeyboardBackspaceIcon className="icon"/>
                                  <span>{t('connection.database.back')}</span>
                                </div>
                              } />
                            </ListItem>
                            {tables.map((table, index) =>
                              <ListItem key={index} button onClick={() => onTableClick(table)}>
                                <ListItemText style={{paddingLeft: '20px'}}
                                              primary={`${schema?.name}.${table.name}`}
                                              secondary={table.comment} />
                              </ListItem>)}
                          </List>
                        }
                      </>
                      :
                      <List component="nav">
                        {database.schemas.map((schema, index) =>
                          <ListItem key={index} button
                                    onClick={() => onDatabaseClick(schema)}>
                            <ListItemText primary={schema.name} />
                          </ListItem>)}
                      </List>
                    }
                  </div>
                </>
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
                  <Typography variant="h6" color="textPrimary">{t('template.title')}(javascript)</Typography>
                  <div className="buttons">
                    <Button variant={'outlined'} onClick={openTFD}>{t('template.fileList')}</Button>
                    <LoadingButton variant={'contained'} color={'primary'}
                                   loading={loading}
                                   onClick={openTplFileDialog}>{tplFileName ? t('template.saveFileToXXXButton', { filename: tplFileName.substring(0, 3) }) : t('template.saveFileButton')}</LoadingButton>
                    <Button variant={'outlined'} onClick={resetTplEditor}>{t('template.resetEditor')}</Button>
                    <Button variant={'contained'} color={'primary'} onClick={printResult}>{t('template.generate')}</Button>
                  </div>
                </div>
                <div className="editor-wrapper">
                  <CodeEditor onChange={onTplFileSave}
                              willMount={tplEditorWillMount}
                              didMount={tplEditorDidMount}/>
                </div>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={12}>
              <Paper style={{paddingTop: '8px'}}>
                <div className="typo-with-right-button">
                  <Tabs value={tab} onChange={handleTabChange}>
                    <Tab label={t('dependency.title')} />
                    <Tab label={t('outputResult.title')} />
                  </Tabs>
                  <div className="buttons">
                    <Button variant={'outlined'} onClick={openRsD}>{t('outputResult.history')}</Button>
                    <Tooltip title={t('outputResult.resultLng').toString()}>
                      <Select value={resultType} onChange={onResultTypeChange}>
                        {LANGUAGES.map(language => <MenuItem value={language} key={language}>{language}</MenuItem>)}
                      </Select>
                    </Tooltip>
                  </div>
                </div>
                <div className="editor-wrapper">
                  {tab === 0 ? <>
                    <CodeEditor value={definitions} options={depEditorOptions}/>
                  </> : <></>}
                  {tab === 1 ? <>
                    <CodeEditor options={resultEditorOptions}
                                didMount={resultEditorDidMount}/>
                  </> : <></>}
                </div>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Dialog open={tplFilesDialogOpen} onClose={hideTFD}>
        <Paper className="dialog-content-wrapper" style={{maxHeight: 500, minWidth: 300}}>
          <div className="typo-with-right-button">
            <Typography variant="h6" color="textPrimary">{t('template.fileListDialog.title')}</Typography>
            <div className="buttons">
              <Button variant={'contained'} color={'secondary'}
                             onClick={hideTFD}>{t('template.fileListDialog.close')}</Button>
              <LoadingButton loading={loading}
                             variant={'contained'}
                             onClick={reloadTplFiles}>{t('template.fileListDialog.reload')}</LoadingButton>
            </div>
          </div>
          <TemplateFiles reloadKey={tplFilesReloadKey}
                         onItemClick={loadTemplateFile}
                         promiseHandler={promiseHandler} loading={loading}/>
        </Paper>
      </Dialog>
      <Dialog open={resultsDialogOpen} onClose={hideRsD}>
        <Paper className="dialog-content-wrapper" style={{maxHeight: 500, minWidth: 300}}>
          <div className="typo-with-right-button">
            <Typography variant="h6" color="textPrimary">{t('outputResult.historyDialog.title')}</Typography>
            <div className="buttons">
              <Button variant={'contained'} color={'secondary'}
                      onClick={hideRsD}>{t('outputResult.historyDialog.close')}</Button>
              <LoadingButton variant={'contained'}
                             onClick={emptyResults}>{t('outputResult.historyDialog.clear')}</LoadingButton>
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
  );
}
