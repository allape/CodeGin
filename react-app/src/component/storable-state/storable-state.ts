import {Dispatch, SetStateAction, useEffect, useMemo, useState} from 'react';

/**
 * 能缓存数据的useState
 * @param key 缓存key, 相同的则会互相覆盖
 * @param parser 读取缓存后对原始数据的处理方法, 更改方法后不会自动更新
 * @param formatter 保存至缓存前对数据的处理方法, 更改方法后不会自动更新
 */
export default function useStorableState<T>(
  key: string,
  parser: (s: string | null) => T = (s => s as any),
  formatter: (t: T) => string = (t => `${t}`),
): [T, Dispatch<SetStateAction<T>>] {
  const cachedParser = useMemo(
    () => parser,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const cachedFormatter = useMemo(
    () => formatter,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [state, setState] = useState(cachedParser(window.localStorage.getItem(key)));
  useEffect(() => {
    window.localStorage.setItem(key, cachedFormatter(state));
  }, [key, state, cachedFormatter]);
  return [state, setState];
}
