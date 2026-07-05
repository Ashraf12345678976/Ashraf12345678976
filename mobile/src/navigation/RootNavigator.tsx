import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { colors } from "@/theme/colors";
import { useApp } from "@/context/AppContext";
import OnboardingScreen from "@/screens/OnboardingScreen";
import HomeScreen from "@/screens/HomeScreen";
import ChatScreen from "@/screens/ChatScreen";
import LessonsScreen from "@/screens/LessonsScreen";
import LessonPlayerScreen from "@/screens/LessonPlayerScreen";
import FlashcardsScreen from "@/screens/FlashcardsScreen";
import PronunciationScreen from "@/screens/PronunciationScreen";
import ProfileScreen from "@/screens/ProfileScreen";

export type LessonsStackParamList = {
  LessonsList: undefined;
  LessonPlayer: { lessonId: string };
};

const Tab = createBottomTabNavigator();
const LessonsStack = createNativeStackNavigator<LessonsStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{symbol}</Text>
  );
}

function LessonsStackNavigator() {
  return (
    <LessonsStack.Navigator screenOptions={{ headerShown: false }}>
      <LessonsStack.Screen name="LessonsList" component={LessonsScreen} />
      <LessonsStack.Screen name="LessonPlayer" component={LessonPlayerScreen} />
    </LessonsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon symbol="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon symbol="💬" focused={focused} /> }}
      />
      <Tab.Screen
        name="Lessons"
        component={LessonsStackNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon symbol="📚" focused={focused} /> }}
      />
      <Tab.Screen
        name="Speak"
        component={PronunciationScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon symbol="🎙️" focused={focused} /> }}
      />
      <Tab.Screen
        name="Flashcards"
        component={FlashcardsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon symbol="🗂️" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon symbol="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { profile, loading } = useApp();

  if (loading) return null;

  return (
    <NavigationContainer theme={navTheme}>
      {profile.onboarded ? <MainTabs /> : <OnboardingScreen />}
    </NavigationContainer>
  );
}
