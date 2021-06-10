import moment, {Moment} from "moment";

export const YYYYMMDD_PATTERN = 'YYYY-MM-DD';
export const C_YYYYMMDD_PATTERN = 'YYYY年MM月DD日';
export const YYYYMMDDHHMMSS_PATTERN = 'YYYY-MM-DD HH:mm:ss';
export const NO_SEP_YYYYMMDDHHMMSS_PATTERN = 'YYYYMMDDHHmmss';
export const HHMMSS_PATTERN = 'HH:mm:ss';
export const C_HHMMSS_PATTERN = 'HH时mm分ss秒';
export const C_HHMM_PATTERN = 'HH时mm分';

export type DatableTypes = Date | string | Moment | number;

// region 基础

/**
 * 将日期转为字符串
 * @param date 日期对象或日期字符串{@link https://momentjs.com/docs/#/parsing/string/}
 * @param pattern {@link https://momentjs.com/docs/#/displaying/}
 * @param defaultValue 当{@link date}为不合法的日期格式字符串时
 */
export default function stringify(date: DatableTypes, pattern: string = YYYYMMDDHHMMSS_PATTERN, defaultValue: string = ''): string {
  if (date === null || date === undefined || date === '') return defaultValue;
  const parsedDate = moment(date);
  return parsedDate.isValid() ? parsedDate.format(pattern) : defaultValue;
}

/**
 * 去除小时、分钟、秒、毫秒的部分
 * @param date 操作的时间
 * @param defaultValue 默认值
 */
export function noTime(date: DatableTypes, defaultValue?: DatableTypes | any): Moment {
  if (date === null || date === undefined || date === '') return defaultValue;
  const parsedDate = moment(date);
  if (parsedDate.isValid()) {
    parsedDate.hour(0);
    parsedDate.minute(0);
    parsedDate.second(0);
    parsedDate.millisecond(0);
    return parsedDate;
  }
  return defaultValue;
}

// endregion

// region YTT

// 日期描述
const YTT_ARRAY: string[] = [
  '前天',
  '昨天',
  '今天',
  '明天',
  '后天',
];
// 中位数
const YTT_TODAY: number = Math.floor(YTT_ARRAY.length / 2);

/**
 * 将日期转换为"昨天"、"今天"、"明天"等中文, 超出显示范围时直接返回年月日格式<br/>
 * YTT = yesterday today tomorrow
 * @param date 转换的日期
 * @param pattern 不在可描述的时间时使用的时间格式
 * @param defaultValue 日期为不合法时返回的默认值
 * @constructor
 */
export function YTT (date: Date | string | Moment, pattern: string = C_YYYYMMDD_PATTERN, defaultValue: string = ''): string {
  const parsedDate = noTime(date);
  if (parsedDate.isValid()) {
    const timestamp = parsedDate.toDate().getTime();

    const now = noTime(new Date());
    const nowTime = now.toDate().getTime();

    // 24 * 60 * 60 * 1000 = 86400000
    const diff: number = (timestamp < nowTime ? -1 : 1) * Math.floor(Math.abs(timestamp - nowTime) / 86400000) + YTT_TODAY;
    if (diff < 0 || diff >= YTT_ARRAY.length) {
      return stringify(parsedDate, pattern, defaultValue);
    } else {
      return YTT_ARRAY[diff];
    }
  }
  return defaultValue;
}

/**
 * {@link YTT}并返回时分秒等
 * @param date 格式化的日期
 * @param pattern 不在YTT范围内时使用的格式
 * @param timePattern 时间格式
 * @param defaultValue 默认值
 */
export function YTTWithTime (date: Date | string | Moment, pattern: string = C_YYYYMMDD_PATTERN, timePattern: string = C_YYYYMMDD_PATTERN, defaultValue: string = '') {
  date = moment(date);
  return `${YTT(date, pattern, defaultValue)}${date.isValid() ? stringify(date, timePattern) : ''}`;
}

// endregion

// region 时间段

// 时间段单位
const INTERVAL_UNITS = [
  { label: '毫秒', ratio: 1000 },
  { label: '秒', ratio: 60 },
  { label: '分', ratio: 60 },
  { label: '时', ratio: 24 },
  { label: '天', ratio: 30 },
  { label: '月', ratio: 12 },
  { label: '年', ratio: 0 },
];

/**
 * 格式化时间段
 * @param from 格式化的时间, 毫秒
 * @param min 最小的单位, {@link INTERVAL_UNITS}的下标
 * @param max 最大的单位, {@link INTERVAL_UNITS}的下标
 * @param defaultValue 默认值
 */
export function parseInterval(from: number, min: number = 1, max: number = 1, defaultValue: string = '-'): string {
  if (
    isNaN(from) || from <= 0 ||
    min < 0 || min >= INTERVAL_UNITS.length ||
    max < min || max >= INTERVAL_UNITS.length
  ) {
    return defaultValue;
  }
  const stringInterval = [];
  let parsedTime = from;
  for (let i = 0; i <= max; i++) {
    const unit = INTERVAL_UNITS[i];
    if (i >= min) {
      stringInterval.push(unit.label);
      if (i === max) {
        stringInterval.push(parsedTime);
      } else {
        stringInterval.push(parsedTime % unit.ratio);
      }
    }
    parsedTime = (parsedTime / unit.ratio) >> 0;
    if (parsedTime === 0) break;
  }

  return stringInterval.reverse().join('');
}

// endregion
