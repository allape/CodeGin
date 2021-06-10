import * as me from 'monaco-editor';
import {createRef, HTMLAttributes, useEffect, useState} from 'react';

export interface CodeEditorProps {
  // 填入的内容
  value?: string;
  // 变更回调: 触发保存时才会调用
  onChange?: (value: string) => void;

  // 配置内容, 更改后会刷新编辑器
  options?: me.editor.IStandaloneEditorConstructionOptions;

  // 挂载前回调
  willMount?: (monaco: typeof me) => void | me.editor.IStandaloneEditorConstructionOptions;
  // 挂载后回调
  didMount?: (editor: me.editor.IStandaloneCodeEditor, monaco: typeof me) => void | me.editor.IStandaloneEditorConstructionOptions;

  // 挂载点配置
  divProps?: HTMLAttributes<HTMLDivElement>,
}

export default function CodeEditor(props: CodeEditorProps) {
  const { value, onChange, options, willMount, didMount, divProps } = props;

  // 引用
  const ref = createRef<HTMLDivElement>();
  const [editor, setEditor] = useState<me.editor.IStandaloneCodeEditor | undefined>(undefined);

  useEffect(() => {
    if (editor && value) {
      editor.setValue(value.toString());
    }
  }, [editor, value]);

  useEffect(() => {
    if (ref.current) {
      const editor = me.editor.create(
        ref.current,
        {
          ...options,
          ...(willMount ? willMount(me) : undefined),
        },
      );
      editor.addCommand(me.KeyMod.CtrlCmd | me.KeyCode.KEY_S, () => {
        if (onChange) {
          onChange(editor.getValue());
        }
      });
      setEditor(oldEditor => {
        try {
          // oldEditor?.getModel()?.dispose();
          oldEditor?.dispose();
        } catch (e) {
          console.error('error on disposing editor:', e);
        }
        return editor;
      });
    }
  }, [options, willMount, didMount, onChange]);

  useEffect(() => {
    if (didMount && editor) {
      didMount(editor, me);
    }
  }, [editor, didMount])

  return <div ref={ref} style={{height: '500px'}} {...divProps} />;
}
