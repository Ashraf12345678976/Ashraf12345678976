import React from "react";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/context/AppContext";
import RootNavigator from "@/navigation/RootNavigator";

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AppProvider>
  );
}
