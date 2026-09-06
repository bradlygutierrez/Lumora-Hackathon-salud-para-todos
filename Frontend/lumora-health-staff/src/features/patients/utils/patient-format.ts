export function fullPatientName(firstNames: string, lastNames: string) {
  return `${firstNames} ${lastNames}`.trim();
}

export function patientAge(birthDate: string | null, now = new Date()): number | null {
  if (!birthDate) return null;
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  let age = now.getFullYear() - parsed.getFullYear();
  const beforeBirthday =
    now.getMonth() < parsed.getMonth() ||
    (now.getMonth() === parsed.getMonth() && now.getDate() < parsed.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function principalAddress(
  addresses: { es_principal: boolean; linea_1: string; ciudad: string; departamento: string | null; pais: string }[],
) {
  const address = addresses.find((item) => item.es_principal) ?? addresses[0];
  if (!address) return null;
  return [address.linea_1, address.ciudad, address.departamento, address.pais]
    .filter(Boolean)
    .join(', ');
}
