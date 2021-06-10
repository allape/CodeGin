import stringify, {DatableTypes} from './date';
import {useMemo} from 'react';

export interface DateStringProps {
  // 格式化的日期
  date?: DatableTypes;
  // 格式
  pattern?: string;
}

export default function DateString(props: DateStringProps) {
  const {date, pattern} = props;
  const memo = useMemo(() => stringify(date!, pattern), [date, pattern]);
  return <>{memo}</>;
}
