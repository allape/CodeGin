import {LoadedFunction, LoadFunction, useLoading} from './loading';
import {Dispatch, SetStateAction, useCallback, useState} from 'react';

export type MessageHandlerFunction = (error: string | Error | any) => string;
export type PromiseHandlerFunction = <T> (promise: Promise<T>) => Promise<T>;
export type usePromiseHandlerReturn = [PromiseHandlerFunction, boolean, LoadFunction, LoadedFunction, string, Dispatch<SetStateAction<string>>];

export default function usePromiseHandler(messageHandler?: MessageHandlerFunction): usePromiseHandlerReturn {
  const [loading, load, loaded] = useLoading();
  const [message, setMessage] = useState<string>('');
  const handler = useCallback<PromiseHandlerFunction>(promise => {
    const rk = load();
    return new Promise((resolve, reject) => {
      promise
        .then(t => {
          resolve(t);
          setMessage('');
        })
        .catch(e => {
          setMessage(messageHandler ? messageHandler(e) : e);
          reject(e);
        })
        .finally(() => loaded(rk));
    });
  }, [messageHandler, load, loaded]);

  return [handler, loading, load, loaded, message, setMessage];
}
