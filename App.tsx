import "./global.css";
import "react-native-url-polyfill/auto";
import { ExpoRoot } from "expo-router";
import type { RequireContext } from "expo-router/build/types";

type MetroRequire = NodeRequire & {
  context(directory: string): RequireContext;
};

export default function App() {
  const ctx = (require as MetroRequire).context("./app");

  return <ExpoRoot context={ctx} />;
}
