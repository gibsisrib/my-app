import { Redirect } from 'expo-router';
import { useCalories } from '../CaloriesContext';
import { View, ActivityIndicator } from 'react-native';
import { RoseTheme } from '../constants/RoseTheme';

export default function Index() {
  const { userData, isLoaded } = useCalories();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: RoseTheme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={RoseTheme.colors.primary} />
      </View>
    );
  }

  if (userData?.profileCompleted) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/profile-onboarding" />;
  }
}
