export const corporateColors = {
  brand: '#0B3D5C',
  primary: '#1F49B6',
  primaryHover: '#4E7CDD',
  accentGold: '#E9A61A',
  accentOrange: '#EA8344',
  accentTeal: '#4F9DA5',
  textPrimary: '#3C3C3B',
  info: '#0088BB',
  textSecondary: '#828281',
  background: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3F8',
  border: '#D7DEE6',
  borderStrong: '#C0CAD6',
  success: '#4F9DA5',
  warning: '#E9A61A',
  error: '#EA8344',
  sidebarText: '#E7EDF4',
  sidebarMuted: '#AFC0D4',
};

const areaToneList = [
  { backgroundColor: '#EAF0F8', color: '#0B3D5C' },
  { backgroundColor: '#EDF2FE', color: '#1F49B6' },
  { backgroundColor: '#EEF6F7', color: '#4F9DA5' },
  { backgroundColor: '#FFF6E3', color: '#E9A61A' },
  { backgroundColor: '#FCEEE7', color: '#EA8344' },
  { backgroundColor: '#E8F4FA', color: '#0088BB' },
];

export const getAreaTone = (value) => {
  if (!value) {
    return areaToneList[0];
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash + value.charCodeAt(index)) % areaToneList.length;
  }

  return areaToneList[hash];
};
