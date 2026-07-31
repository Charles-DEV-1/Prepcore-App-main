// Prepcore - UI Polish
import { Dimensions } from 'react-native';

export const screenWidth = Dimensions.get('window').width;
export const screenHeight = Dimensions.get('window').height;

export const space = {
  base: screenWidth * 0.04,
  small: screenWidth * 0.04 * 0.5,
  medium: screenWidth * 0.04,
  large: screenWidth * 0.04 * 1.5,
  xlarge: screenWidth * 0.04 * 2
};

export const polishedCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: space.base,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
  marginBottom: space.base * 0.75
};
