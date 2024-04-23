import dayjs from 'dayjs';

export const removeAccents = (val: string) => {
  return val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const prepareForSortName = (val: string) => {
  return removeAccents(val.toLowerCase());
};

/**
 * 
 * @param {string} str String of numbers formatted such as '1;2;3;4'
 * @returns {number[]} Array of numbers
 */
export const stringQueryToNumbers = (str: string): number[] => {
  return str.split(';').reduce((def: number[], i) => {
    const ni = +i;
    if (ni) def.push(ni);
    return def;
  }, []);
}

export const nextDate = (last: Date | string, freq: number): Date => {
  return dayjs(last).add(freq, 'days').toDate();
};


export default {
  removeAccents,
  stringQueryToNumbers,
  nextDate,
};
