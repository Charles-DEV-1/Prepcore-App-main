// Prepcore — Live Data & Polish
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;

export function scale(size: number): number {
  return Math.round(PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size));
}

export function verticalScale(size: number): number {
  return Math.round(PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / 844) * size));
}

export function moderateScale(size: number, factor = 0.5): number {
  return size + (scale(size) - size) * factor;
}
