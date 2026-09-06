// Prepcore - UI Polish
import { Dimensions } from 'react-native';

export const screenWidth = Dimensions.get('window').width;
export const screenHeight = Dimensions.get('window').height;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
  massive: 64,
  base: 16,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32
};

export const polishedCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: space.lg,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
  marginBottom: space.md
};
