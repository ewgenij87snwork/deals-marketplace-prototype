export function optionalQueryValue(
  value: string | string[] | undefined,
): string | string[] | undefined {
  return value === '' ? undefined : value;
}
