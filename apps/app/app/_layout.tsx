import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'react-native-drawer-layout';
import 'react-native-reanimated';

import { Sidebar } from '@/components/sidebar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SidebarProvider } from '@/lib/sidebar-context';
import '../global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SidebarProvider
          render={({ isOpen, open, close }) => (
            <Drawer
              open={isOpen}
              onOpen={open}
              onClose={close}
              renderDrawerContent={() => <Sidebar onClose={close} />}
              drawerType="front"
              swipeEdgeWidth={40}
            >
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: 'modal', title: 'Modal' }}
                />
              </Stack>
            </Drawer>
          )}
        />
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
