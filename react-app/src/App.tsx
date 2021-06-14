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
import {DEFAULT_TEMPLATE, TemplateFile} from './model/template-file';
import DateString from './component/date/DateString';
import stringify from './component/date/date';
import usePromiseHandler from './component/loading/promise-handler';
import TemplateFiles from './view/TemplateFiles';
import {useCounter} from './component/loading/loading';
import {PRESET_DEFINITIONS} from './model/definition';
import useStorableState from './component/storable-state/storable-state';

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
      setEM('当前未加载任何Table, 无法导入依赖!');
      return;
    }

    setDefinitions(`
// DDL
${
  /*ddl.split('\n').map(i => `// ${i}`).join('\n')*/
  '// ' + ddl.replace(/\n/g, '\n// ')
}

// 数据库数据
export const database = ${JSON.stringify(database, undefined, 4)};

// 表数据
export const table = ${JSON.stringify(table, undefined, 4)};

// 字段列表
export const fields = ${JSON.stringify(fields, undefined, 4)};

// 字段列表Map
export const fieldMap = ${JSON.stringify(fields.reduce((p, c) => ({...p, [c.name as string]:c}), {}), undefined, 4)};

// 预设的方法
${PRESET_DEFINITIONS}
`);
    setTab(0);
  }, [
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
    if (window.confirm(`确定重置模板内容至默认模板?`)) {
      tplEditor?.setValue(DEFAULT_TEMPLATE);
      setTplFileName('');
    }
  }, [tplEditor]);
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
        'file:///node_modules/dbtpl/index.js'
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
    if (window.confirm(`点击确定将加载"${file.id}", 并且当前编辑的内容将会丢失`)) {
      tplEditor?.setValue(file.content);
      setTplFileName(file.id);
      hideTFD();
    }
  }, [tplEditor, hideTFD]);

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
      setTFNM('请输入文件名称!');
      return;
    }
    if (!filename.endsWith('.js')) {
      filename += '.js';
    }
    setTplFileName(filename);
    doSaveTplFile(filename, tplEditor?.getValue() || '');
  }, [doSaveTplFile, tplEditor]);
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
        const source = tplEditor.getValue();
        const sourceCode = `
          ${definitions.replace(/(?<=\n) *((import.+?;)|export )/g, '')}
          ${/*替换掉第一个import*/source.replace(/\s*(import.+?;)/, '')}
        `;
        console.log(sourceCode);
        const r = new Function(sourceCode)();
        if (r === undefined) {
          setEM('没有找到return语句');
        } else {
          applyResult(r);
          setEM('');
          setTab(1);

          // 添加历史记录
          setResults(olds => [{
            id: table?.name || r.substring(0, 10) || stringify(new Date()),
            content: r,
            createTime: Date.now(),
            updateTime: Date.now(),
          }, ...olds]);
        }
      } catch (e) {
        setEM(stringifyError(e));
      }
    } else {
      setEM('编辑器暂时未初始化完成');
    }
  }, [definitions, tplEditor, table, applyResult, setEM]);

  // region  输出模板日志

  const [resultsDialogOpen, setRDO] = useState(false);
  const openRsD = useCallback(() => setRDO(true), []);
  const hideRsD = useCallback(() => setRDO(false), []);

  const [results, setResults] = useState<TemplateFile[]>([]);
  const emptyResults = useCallback(() => {
    if (window.confirm('确定清空输出历史?')) {
      setResults([]);
    }
  }, []);

  // endregion

  // endregion

  return (
    <div className="code-generator-wrapper">
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4} xl={3}>
          <Alert severity={errorMessage ? 'error' : 'success'}>
            <AlertTitle>{errorMessage ? '错误' : '正常'}</AlertTitle>
            {errorMessage || '一切正常'}
          </Alert>
          <Paper>
            <Typography variant="h6" color="textPrimary">连接信息</Typography>
            <form className={`form-wrapper`} onSubmit={onConnectionInfoSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField required label="Host" name={'host'} defaultValue={DEFAULT_VALUE.host}
                             error={errors.host} helperText={'Host is required'} />
                </Grid>
                <Grid item xs={4}>
                  <TextField required type={'number'} label="Port" name={'port'}
                             defaultValue={DEFAULT_VALUE.port!.toString()}
                             error={errors.port} helperText={'Port is required'} />
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
                                  <span>返回</span>
                                </div>
                              } secondary={table?.name} />
                            </ListItem>
                            <ListItem button onClick={() => setEditorDefinitions()}>
                              <ListItemText primary="将该表数据注入至模板编辑器依赖" secondary="该操作将覆盖已有依赖" />
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
                                  <span>返回</span>
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
                <Typography color={'textSecondary'} align={'center'} style={{padding: '10px 0'}}>请先建立连接</Typography>
              }
            </LoadingContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={8} xl={9}>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={12}>
              <Paper>
                <div className="typo-with-right-button">
                  <Typography variant="h6" color="textPrimary">模板(javascript)</Typography>
                  <div className="buttons">
                    <Button variant={'outlined'} onClick={openTFD}>模板文件列表</Button>
                    <LoadingButton variant={'contained'} color={'primary'}
                                   loading={loading}
                                   onClick={openTplFileDialog}>保存{tplFileName ? `至${tplFileName.substring(0, 3)}...` : ''}</LoadingButton>
                    <Button variant={'outlined'} onClick={resetTplEditor}>重置</Button>
                    <Button variant={'contained'} color={'primary'} onClick={printResult}>输出结果</Button>
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
                    <Tab label="依赖" />
                    <Tab label="结果" />
                  </Tabs>
                  <div className="buttons">
                    <Button variant={'outlined'} onClick={openRsD}>历史记录</Button>
                    <Tooltip title="结果语言格式">
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
            <Typography variant="h6" color="textPrimary">保存了的模板</Typography>
            <div className="buttons">
              <Button variant={'contained'} color={'secondary'}
                             onClick={hideTFD}>关闭</Button>
              <LoadingButton loading={loading}
                             variant={'contained'}
                             onClick={reloadTplFiles}>刷新</LoadingButton>
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
            <Typography variant="h6" color="textPrimary">结果输出历史</Typography>
            <div className="buttons">
              <Button variant={'contained'} color={'secondary'}
                      onClick={hideRsD}>关闭</Button>
              <LoadingButton variant={'contained'}
                             onClick={emptyResults}>清空</LoadingButton>
            </div>
          </div>
          <div style={{padding: '5px 5px 0', margin: '5px 0 0'}}>
            {results.length === 0 ? <Typography variant="body1" color="textSecondary" align="center">暂无数据</Typography> : <></>}
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
          <TextField name="tplFileName" label="文件名称" defaultValue={tplFileName}
                     required autoComplete="off"
                     error={!!tplFileNameMessage} helperText={tplFileNameMessage} />
          <div className="buttons">
            <Button variant={'contained'} disabled={loading} onClick={hideTplFileDialog}>取消</Button>
            <LoadingButton variant={'contained'} color={'primary'}
                           loading={loading} type={'submit'}>保存</LoadingButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
