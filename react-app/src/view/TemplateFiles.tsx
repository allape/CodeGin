import {TemplateFile} from '../model/template';
import {Button, Checkbox, Dialog, List, ListItem, ListItemText, Paper, TextField, Typography} from '@material-ui/core';
import LoadingContainer from '../component/loading/LoadingContainer';
import DateString from '../component/date/DateString';
import React, {useCallback, useEffect, useState} from 'react';
import usePromiseHandler from '../component/loading/promise-handler';
import {getSavedTplFiles, stringifyError} from '../api/api';
import LoadingButton from '../component/loading/LoadingButton';
import {useTranslation} from 'react-i18next';

const SELECTIONS_STORE_KEY = 'template-files-selections-key';

export interface TemplateFileSelector extends TemplateFile {

  // 是否被选中
  __selected?: boolean;
  // 模板输出文件路径
  __filename?: string;
  // 错误消息
  __error?: string;

}

interface TemplateFilesProps {
  /**
   * 是否显示
   */
  open?: boolean;
  /**
   * 点击元素时
   * @param file 点击的文件
   */
  onItemClick?: (file: TemplateFileSelector) => void;
  /**
   * 多选文件并且填写了文件地址的回调时间
   * @param records key: 文件夹路径, value: 模板文件
   */
  onFileSelectWithFilename?: (files: TemplateFileSelector[]) => void;
  /**
   * 关闭时
   */
  onClose?: () => void;
}

export default function TemplateFiles(props: TemplateFilesProps) {
  const {
    open,
    onClose,
    onItemClick,
    onFileSelectWithFilename,
  } = props;

  const { t } = useTranslation();

  const [promiseHandler, loading, , ,] = usePromiseHandler(stringifyError);

  // 加载了的模板文件列表
  const [templateFiles, setTemplateFiles] = useState<TemplateFileSelector[]>([]);

  const getTemplateFiles = useCallback(() => {
    promiseHandler(getSavedTplFiles()).then(files => {
      // 获取缓存的内容
      try {
        const cached = window.localStorage.getItem(SELECTIONS_STORE_KEY);
        if (cached) {
          const parsedCached = JSON.parse(cached);
          if (parsedCached && parsedCached instanceof Array) {
            for (const file of parsedCached) {
              const found = files.find(i => i.id === file.id) as TemplateFileSelector;
              if (found) {
                found.__selected = file.__selected;
                found.__filename = file.__filename;
              }
            }
          }
        }
      } catch (e) {
        console.error('error occurred while parsing stored template files data:', e);
      }
      setTemplateFiles(files);
    });
  }, [promiseHandler]);

  const onClick = useCallback((file: TemplateFileSelector) => {
    if (onFileSelectWithFilename) {
      file.__selected = !file.__selected;
      setTemplateFiles(files => [...files]);
    } else if (onItemClick) {
      onItemClick(file);
    }
  }, [onItemClick, onFileSelectWithFilename]);

  const onFileNameChange = useCallback((e, file: TemplateFileSelector) => {
    file.__filename = e.target.value;
    setTemplateFiles(files => [...files]);
  }, []);

  const onConfirm = useCallback(() => {
    let hasError = false;
    const selected = [];
    for (const file of templateFiles) {
      if (file.__selected) {
        selected.push(file);
        if (!file.__filename) {
          file.__error = t('template.fileListDialog.outputFolderIsEmpty', { file });
          hasError = true;
        } else {
          delete file.__error;
        }
      }
    }
    setTemplateFiles(files => [...files]);
    if (!hasError && onFileSelectWithFilename) {
      onFileSelectWithFilename(selected);
      // 缓存一次数据
      window.localStorage.setItem(SELECTIONS_STORE_KEY, JSON.stringify(selected));
    }
  }, [t, templateFiles, onFileSelectWithFilename]);

  useEffect(() => {
    getTemplateFiles();
  }, [getTemplateFiles, open]);

  return<Dialog open={!!open} onClose={onClose}>
    <Paper className="dialog-content-wrapper template-files-dialog">
      <div className="typo-with-right-button">
        <Typography variant="h6" color="textPrimary">{t('template.fileListDialog.title')}</Typography>
        <div className="buttons">
          <Button variant={'contained'} color={'secondary'}
                  onClick={onClose}>{t('template.fileListDialog.close')}</Button>
          <LoadingButton loading={loading}
                         variant={'contained'}
                         onClick={getTemplateFiles}>{t('template.fileListDialog.reload')}</LoadingButton>
          {!!onFileSelectWithFilename ?
            <LoadingButton loading={loading}
                           variant={'contained'}
                           color={'primary'}
                           onClick={onConfirm}>{t('template.fileListDialog.confirm')}</LoadingButton>
            : <></>
          }
        </div>
      </div>
      <LoadingContainer style={{padding: '0 5px 0', margin: '0'}} loading={loading}>
        {templateFiles.length === 0 ? <Typography variant="body1" color="textSecondary" align="center">暂无数据</Typography> : <></>}
        <List component="nav">
          {templateFiles.map((file, index) =>
            <ListItem key={index} button onClick={() => onClick(file)}>
              {onFileSelectWithFilename ?
                <Checkbox checked={!!file.__selected} color="primary"/>
                : <></>
              }
              <div className="template-file-name-with-input">
                <ListItemText primary={<span>
                                {/*<DateString date={file.createTime} />*/}
                                {/*<span>&nbsp;&nbsp;&nbsp;&nbsp;{file.id}</span>*/}
                                <span>{file.id}</span>
                              </span>}
                              secondary={<DateString date={file.updateTime} />} />
                {onFileSelectWithFilename && file.__selected ?
                  <TextField placeholder={t('template.fileListDialog.filenamePlaceholder')}
                             value={file.__filename || ''}
                             helperText={file.__error} error={!!file.__error}
                             onClick={e => e.stopPropagation()}
                             onChange={e => onFileNameChange(e, file)}/>
                  : <></>
                }
              </div>
            </ListItem>)
          }
        </List>
      </LoadingContainer>
    </Paper>
  </Dialog>;
}
