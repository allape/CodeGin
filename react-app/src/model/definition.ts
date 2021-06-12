// 预设的依赖内容
export const PRESET_DEFINITIONS = `
/**
 * 将下划线字符串转为驼峰
 * @param {string} str 要被转换的字符串
 * @param {boolean} firstUpper 首字母是否大写
 */
export function toCamelCase(str, firstUpper = false) {
  if (!str) return '';
  const pieces = str.split(/_/g);
  let firstDidUpper = false;
  return pieces.map((value => {
    if (value) {
      if (!firstDidUpper) {
        firstDidUpper = true;
        if (!firstUpper) return value;
      }
      return value[0].toUpperCase() + value.substring(1);
    }
    return undefined;
  })).filter(i => !!i).reduce((p, c) => p + c, '');
}

/**
 * 将驼峰字符串转为下划线
 * @param {string} str 要被转换的字符串
 * @param {boolean} upper 是否转换为大写
 */
export function toUnderlineCase(str, upper = false) {
  return str ? str.replace(/([A-Z])/g, '_$1')[upper ? 'toUpperCase' : 'toLowerCase']() : '';
}


/**
 * 将数据库类型转换为ts对应的类型
 * @param {string} typeFromDb 数据库字段名称
 * @param {boolean} date2string 是否将日期字段作为字符串
 * @return {string} 转换后的类型
 */
export function toTypescriptType(typeFromDb, date2string=true) {
  const numberType = 'number';
  const dateType = 'Date';
  const stringType = 'string';
  const booleanType = 'boolean';
  const bufferType = 'ArrayBuffer';

  if (
    typeFromDb.startsWith('decimal')
    || typeFromDb.startsWith('double')
    || typeFromDb.startsWith('float')
    || typeFromDb.startsWith('bigint')
    || typeFromDb.startsWith('int')
    || typeFromDb.startsWith('mediumint')
    || typeFromDb.startsWith('smallint')
    || typeFromDb.startsWith('tinyint')
    || typeFromDb.startsWith('bit')
  ) {
    return numberType;
  }
  if (
    typeFromDb === 'date'
    || typeFromDb === 'time'
    || typeFromDb === 'datetime'
    || typeFromDb.startsWith('timestamp')
    || typeFromDb.startsWith('year')
  ) {
    return date2string ? stringType : dateType;
  }
  if (
    typeFromDb.startsWith('char')
    || typeFromDb.startsWith('varchar')
    || typeFromDb.startsWith('tinytext')
    || typeFromDb.startsWith('text')
    || typeFromDb.startsWith('mediumtext')
    || typeFromDb.startsWith('longtext')
    || typeFromDb.startsWith('binary')
    || typeFromDb.startsWith('varbinary')
  ) {
    return stringType;
  }
  if (
    typeFromDb.startsWith('tinyblob')
    || typeFromDb.startsWith('blob')
    || typeFromDb.startsWith('mediumblob')
    || typeFromDb.startsWith('longblob')
  ) {
    return bufferType;
  }
  if (typeFromDb.startsWith('boolean')) {
    return booleanType;
  }
}

/**
 * 将数据库类型转换为java对应的类型
 * @param {string} typeFromDb 数据库字段名称
 * @param {boolean} date2string 是否将日期字段作为字符串
 * @return {string} 转换后的类型
 */
export function toJavaType(typeFromDb, date2string=true) {
  const stringType = 'String';

  if (typeFromDb.startsWith('decimal')
    || typeFromDb.startsWith('double')) {
    return 'Double';
  }
  if (typeFromDb.startsWith('float')) {
    return 'Float';
  }
  if (typeFromDb.startsWith('bigint')) {
    return 'Long';
  }
  if (typeFromDb.startsWith('int')
    || typeFromDb.startsWith('mediumint')
  ) {
    return 'Integer';
  }
  if (typeFromDb.startsWith('int')
    || typeFromDb.startsWith('smallint')
  ) {
    return 'Short';
  }
  if (typeFromDb.startsWith('tinyint')
    || typeFromDb.startsWith('bit')
  ) {
    return 'Byte';
  }

  if (
    typeFromDb === 'date'
    || typeFromDb === 'time'
    || typeFromDb === 'datetime'
    || typeFromDb.startsWith('timestamp')
    || typeFromDb.startsWith('year')
  ) {
    return date2string ? stringType : 'Date';
  }

  if (
    typeFromDb.startsWith('char')
    || typeFromDb.startsWith('varchar')
    || typeFromDb.startsWith('tinytext')
    || typeFromDb.startsWith('text')
    || typeFromDb.startsWith('mediumtext')
    || typeFromDb.startsWith('longtext')
    || typeFromDb.startsWith('binary')
    || typeFromDb.startsWith('varbinary')
  ) {
    return stringType;
  }

  if (
    typeFromDb.startsWith('tinyblob')
    || typeFromDb.startsWith('blob')
    || typeFromDb.startsWith('mediumblob')
    || typeFromDb.startsWith('longblob')
  ) {
    return 'Byte[]';
  }

  if (typeFromDb.startsWith('boolean')) {
    return 'Boolean';
  }
}
`;

export const DEFINITION_IMPORT = `toCamelCase, toUnderlineCase, toTypescriptType, toJavaType`;
