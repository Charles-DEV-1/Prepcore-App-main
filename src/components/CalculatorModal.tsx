// Prepcore - UI Polish
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow } from '../constants/theme';
import { space } from '../constants/spacing';

const keys = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '=']
];

function precedence(operator: string) {
  return operator === '+' || operator === '-' ? 1 : 2;
}

function applyOperator(a: number, b: number, operator: string) {
  if (operator === '+') return a + b;
  if (operator === '-') return a - b;
  if (operator === '×') return a * b;
  if (operator === '÷') return b === 0 ? NaN : a / b;
  return b;
}

function calculate(expression: string) {
  const tokens = expression.match(/(\d+\.?\d*|\.\d+|[+\-×÷])/g) ?? [];
  const values: number[] = [];
  const operators: string[] = [];

  tokens.forEach(token => {
    if (/^\d/.test(token) || token.startsWith('.')) {
      values.push(Number(token));
      return;
    }

    while (operators.length && precedence(operators[operators.length - 1]) >= precedence(token)) {
      const operator = operators.pop();
      const b = values.pop();
      const a = values.pop();
      if (!operator || a === undefined || b === undefined) return;
      values.push(applyOperator(a, b, operator));
    }
    operators.push(token);
  });

  while (operators.length) {
    const operator = operators.pop();
    const b = values.pop();
    const a = values.pop();
    if (!operator || a === undefined || b === undefined) return 'Error';
    values.push(applyOperator(a, b, operator));
  }

  const result = values[0];
  if (!Number.isFinite(result)) return 'Error';
  return Number.isInteger(result) ? String(result) : String(Number(result.toFixed(8)));
}

export function CalculatorButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Open calculator"
      className="items-center justify-center rounded-full"
      style={{ height: 42, width: 42, backgroundColor: colors.primarySoft }}
    >
      <Ionicons name="calculator-outline" size={23} color={colors.primary} />
    </Pressable>
  );
}

export function CalculatorModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [display, setDisplay] = useState('0');
  const canEvaluate = useMemo(() => /[0-9]/.test(display) && !/[+\-×÷.]$/.test(display), [display]);

  function pressKey(key: string) {
    if (key === 'C') {
      setDisplay('0');
      return;
    }

    if (key === '⌫') {
      setDisplay(current => (current.length > 1 ? current.slice(0, -1) : '0'));
      return;
    }

    if (key === '=') {
      if (canEvaluate) setDisplay(calculate(display));
      return;
    }

    if (key === '%') {
      setDisplay(current => {
        const value = Number(current);
        return Number.isFinite(value) ? String(value / 100) : current;
      });
      return;
    }

    setDisplay(current => {
      const isOperator = /^[+\-×÷]$/.test(key);
      if (current === 'Error') return isOperator ? '0' : key;
      if (current === '0' && !isOperator && key !== '.') return key;
      if (isOperator && /[+\-×÷.]$/.test(current)) return `${current.slice(0, -1)}${key}`;
      if (key === '.' && current.split(/[+\-×÷]/).pop()?.includes('.')) return current;
      return `${current}${key}`;
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)' }}>
        <Pressable className="flex-1" onPress={onClose} />
        <View
          style={{
            padding: space.medium,
            paddingBottom: space.xlarge,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: colors.white,
            ...shadow
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700', lineHeight: 36 }}>Calculator</Text>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
              <Ionicons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <View className="items-end justify-center" style={{ marginTop: space.medium, minHeight: 76, borderRadius: radii.md, backgroundColor: colors.primarySoft, paddingHorizontal: space.medium }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.ink, fontSize: 34, fontWeight: '700', lineHeight: 51 }}>
              {display}
            </Text>
          </View>

          <View style={{ marginTop: space.medium, gap: space.small }}>
            {keys.map(row => (
              <View key={row.join('')} className="flex-row" style={{ gap: space.small }}>
                {row.map(key => {
                  const isAction = ['C', '⌫', '%'].includes(key);
                  const isOperator = ['÷', '×', '-', '+', '='].includes(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => pressKey(key)}
                      className="items-center justify-center"
                      style={{
                        flex: key === '0' ? 2 : 1,
                        height: 58,
                        borderRadius: 16,
                        backgroundColor: isOperator ? colors.primary : isAction ? colors.primarySoft : colors.page
                      }}
                    >
                      <Text style={{ color: isOperator ? colors.white : isAction ? colors.primary : colors.ink, fontSize: 22, fontWeight: '700', lineHeight: 33 }}>
                        {key}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
