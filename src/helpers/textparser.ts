export const removeAccents = (val: string) => {
  return val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const prepareForSortName = (val: string) => {
  return removeAccents(val.toLowerCase());
};

export default {
  removeAccents,
};
