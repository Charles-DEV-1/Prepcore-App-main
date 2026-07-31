import { Tabs } from 'expo-router';
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#5F6673',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.white,
          borderTopColor: colors.softLine
        },
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'navigate-circle' : 'navigate-circle-outline'} size={size + 2} color={color} />
        }}
      />
      <Tabs.Screen
        name="exam"
        options={{
          title: 'Exam',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <AntDesign name="linechart" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <AntDesign name="user" size={size} color={color} />
        }}
      />
      <Tabs.Screen name="flashcards" options={{ href: null, title: 'Flashcards' }} />
      <Tabs.Screen name="weekly-quiz" options={{ href: null, title: 'Weekly Quiz' }} />
    </Tabs>
  );
}
