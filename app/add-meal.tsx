import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Beer, Utensils, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useCalories } from '../CaloriesContext';
import { RoseTheme } from '../constants/RoseTheme';
import { getApiBaseUrl } from '../utils/getApiBaseUrl';
import { safeImpact, safeNotification, safeSelection } from '../utils/safeHaptics';

type WizardStep = 'describe' | 'photo' | 'analyzing' | 'results';

const imagePickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.5,
  base64: true,
};

export default function AddMealScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const isEdit = Boolean(id);
  const { addEntry, updateEntry, entries } = useCalories();

  const [wizardStep, setWizardStep] = useState<WizardStep>('describe');
  const [resultsConfettiKey, setResultsConfettiKey] = useState(0);

  const [type, setType] = useState('meal');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [notes, setNotes] = useState('');
  const [lastMealPhotoBase64, setLastMealPhotoBase64] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; calories?: string }>({});

  useEffect(() => {
    if (id) {
      const entry = entries.find((e: any) => e.id === id);
      if (entry) {
        setType(entry.type || 'meal');
        setName(entry.name);
        setCalories(entry.calories.toString());
        setProtein(entry.protein?.toString() || '');
        setCarbs(entry.carbs?.toString() || '');
        setFats(entry.fats?.toString() || '');
        setNotes(entry.notes || '');
        setLastMealPhotoBase64(null);
      }
    }
  }, [id, entries]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const kcal = parseInt(calories);

    const nextErrors: { name?: string; calories?: string } = {};
    if (!trimmedName) {
      nextErrors.name = 'Add a short meal title.';
    }
    if (isNaN(kcal)) {
      nextErrors.calories = 'Calories are required.';
    } else if (kcal < 0) {
      nextErrors.calories = 'Calories must be 0 or higher.';
    } else if (kcal > 10000) {
      nextErrors.calories = 'Please enter a realistic calorie value (0-10000).';
    }

    if (nextErrors.name || nextErrors.calories) {
      setFieldErrors(nextErrors);
      setErrorMessage('Please fix the highlighted fields.');
      setShowError(true);
      safeNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setFieldErrors({});
    setShowError(false);

    const p = parseInt(protein) || 0;
    const c = parseInt(carbs) || 0;
    const f = parseInt(fats) || 0;

    if (id) {
      updateEntry(id, { name: trimmedName, calories: kcal, protein: p, carbs: c, fats: f, type, notes });
    } else {
      addEntry(trimmedName, kcal, type, notes, null, p, c, f);
    }

    safeNotification(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const applyAiMealPayload = (data: {
    name?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    type?: string;
  }) => {
    if (typeof data.name === 'string' && data.name.trim()) setName(data.name.trim());
    const roundOrEmpty = (n: number | undefined, setter: (s: string) => void) => {
      if (typeof n !== 'number' || !Number.isFinite(n)) return;
      setter(String(Math.max(0, Math.round(n))));
    };
    roundOrEmpty(data.calories, setCalories);
    roundOrEmpty(data.protein, setProtein);
    roundOrEmpty(data.carbs, setCarbs);
    roundOrEmpty(data.fats, setFats);
    if (typeof data.type === 'string') {
      setType(data.type.toLowerCase() === 'drink' ? 'drink' : 'meal');
    }
  };

  const callAnalyzeMealApi = async (body: { imageBase64?: string; description?: string }) => {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setErrorMessage('Missing API URL. Set EXPO_PUBLIC_API_BASE_URL for your backend.');
      setShowError(true);
      throw new Error('Missing API base URL');
    }
    const response = await fetch(`${apiBaseUrl}/analyze-meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const rawText = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = {};
    }
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          'Server returned 404 for /analyze-meal. Set EXPO_PUBLIC_API_BASE_URL to your meal API origin only (e.g. https://YOUR-SERVICE.up.railway.app) — no trailing slash, no /analyze-meal on the end, and not your Expo URL (not :8081).'
        );
      }
      const serverMsg =
        typeof data.error === 'string'
          ? data.error
          : `Server error (${response.status})`;
      const detail = typeof data.detail === 'string' ? data.detail : '';
      throw new Error(detail ? `${serverMsg} ${detail}` : serverMsg);
    }
    applyAiMealPayload(data as Parameters<typeof applyAiMealPayload>[0]);
    safeNotification(Haptics.NotificationFeedbackType.Success);
  };

  const handleEstimateMealWithAi = async () => {
    const desc = notes.trim();
    const img = lastMealPhotoBase64;
    if (!desc && !img) {
      setErrorMessage('Describe your meal, or take an AI photo first — then tap Estimate.');
      setShowError(true);
      safeNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setIsAnalyzing(true);
    setShowError(false);
    try {
      const body: { imageBase64?: string; description?: string } = {};
      if (desc) body.description = desc;
      if (img) body.imageBase64 = img;
      await callAnalyzeMealApi(body);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      const networkish =
        /network|failed to fetch|load failed|aborted/i.test(msg) ||
        msg === 'Network request failed';
      setErrorMessage(
        networkish
          ? "Can't reach your meal server. On your phone: use the same Wi‑Fi as your PC, run `npm run server`, allow port 8787 through Windows Firewall, and restart Expo."
          : msg || "AI couldn't estimate this meal. Try again."
      );
      setShowError(true);
      safeNotification(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAiPhotoScan = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('We need camera permission to take a photo of your food.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync(imagePickerOptions);

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const imageBase64 = result.assets[0].base64;
      setLastMealPhotoBase64(imageBase64);
      setIsAnalyzing(true);
      setShowError(false);
      try {
        const body: { imageBase64: string; description?: string } = { imageBase64 };
        const desc = notes.trim();
        if (desc) body.description = desc;
        await callAnalyzeMealApi(body);
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e);
        const networkish =
          /network|failed to fetch|load failed|aborted/i.test(msg) ||
          msg === 'Network request failed';
        setErrorMessage(
          networkish
            ? "Can't reach your meal server. Same Wi‑Fi as PC, `npm run server` running, firewall allows 8787, then reload Expo."
            : msg || "Oops! AI couldn't analyze the photo."
        );
        setShowError(true);
        safeNotification(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const wizardPickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('We need photo library access to upload a meal picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
    if (!result.canceled && result.assets?.[0]?.base64) {
      setLastMealPhotoBase64(result.assets[0].base64);
      safeImpact(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const wizardTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('We need camera permission to take a photo of your food.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(imagePickerOptions);
    if (!result.canceled && result.assets?.[0]?.base64) {
      setLastMealPhotoBase64(result.assets[0].base64);
      safeImpact(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const runWizardAnalysis = async () => {
    const desc = notes.trim();
    const img = lastMealPhotoBase64;
    if (!desc && !img) {
      setErrorMessage('Add a description on the last step, or a photo — your AI needs at least one.');
      setShowError(true);
      safeNotification(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setShowError(false);
    setWizardStep('analyzing');
    setIsAnalyzing(true);
    try {
      const body: { imageBase64?: string; description?: string } = {};
      if (desc) body.description = desc;
      if (img) body.imageBase64 = img;
      await callAnalyzeMealApi(body);
      setResultsConfettiKey((k) => k + 1);
      setWizardStep('results');
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      const networkish =
        /network|failed to fetch|load failed|aborted/i.test(msg) ||
        msg === 'Network request failed';
      setErrorMessage(
        networkish
          ? "Can't reach your meal server. On your phone: use the same Wi‑Fi as your PC, run `npm run server`, allow port 8787 through Windows Firewall, and restart Expo."
          : msg || "AI couldn't estimate this meal. Try again."
      );
      setShowError(true);
      safeNotification(Haptics.NotificationFeedbackType.Error);
      setWizardStep('photo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const headerClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (isEdit) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={headerClose}>
            <X size={24} color={RoseTheme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Platform.OS === 'web' ? 60 : 140 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Scan or describe</Text>
          {showError && !!errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setShowError(false)} style={styles.errorBannerClose}>
                <X size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DESCRIBE YOUR MEAL</Text>
            <Text style={styles.aiFieldHint}>
              Write what you ate, then use Estimate — or take a photo. Notes here are also sent with AI Photo Scan for
              extra detail (sauce, swaps, portions).
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Chipotle chicken bowl, double rice, no sour cream…"
              placeholderTextColor={RoseTheme.colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionPillFull}
                onPress={() => {
                  safeImpact(Haptics.ImpactFeedbackStyle.Medium);
                  handleAiPhotoScan();
                }}
                disabled={isAnalyzing}
              >
                <Text style={styles.actionPillText}>{isAnalyzing ? 'Analyzing…' : 'AI photo scan'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.aiEstimateButton, isAnalyzing && styles.aiEstimateButtonDisabled]}
              onPress={() => {
                safeImpact(Haptics.ImpactFeedbackStyle.Medium);
                handleEstimateMealWithAi();
              }}
              disabled={isAnalyzing || (!notes.trim() && !lastMealPhotoBase64)}
            >
              <Text style={styles.aiEstimateButtonText}>
                {isAnalyzing ? 'Estimating…' : 'Estimate with AI'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'meal' ? styles.typeButtonActive : styles.typeButtonInactive]}
              onPress={() => {
                safeSelection();
                setType('meal');
              }}
            >
              <Utensils size={32} color={type === 'meal' ? RoseTheme.colors.primary : '#d1d5db'} />
              <Text style={[styles.typeText, type === 'meal' ? styles.typeTextActive : styles.typeTextInactive]}>MEAL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'drink' ? styles.typeButtonActive : styles.typeButtonInactive]}
              onPress={() => {
                safeSelection();
                setType('drink');
              }}
            >
              <Beer size={32} color={type === 'drink' ? RoseTheme.colors.primary : '#d1d5db'} />
              <Text style={[styles.typeText, type === 'drink' ? styles.typeTextActive : styles.typeTextInactive]}>DRINK</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MEAL TITLE</Text>
              <TextInput
                style={[styles.input, fieldErrors.name ? styles.inputError : null]}
                placeholder="Filled by AI — you can edit"
                placeholderTextColor={RoseTheme.colors.textMuted}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
              />
              {!!fieldErrors.name && <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CALORIES</Text>
              <TextInput
                style={[styles.input, fieldErrors.calories ? styles.inputError : null]}
                placeholder="0"
                placeholderTextColor={RoseTheme.colors.textMuted}
                value={calories}
                onChangeText={(text) => {
                  setCalories(text);
                  if (fieldErrors.calories) {
                    setFieldErrors((prev) => ({ ...prev, calories: undefined }));
                  }
                }}
                keyboardType="number-pad"
              />
              {!!fieldErrors.calories && <Text style={styles.fieldErrorText}>{fieldErrors.calories}</Text>}
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>PROTEIN (g)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={RoseTheme.colors.textMuted}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}>
                <Text style={styles.label}>CARBS (g)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={RoseTheme.colors.textMuted}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>FATS (g)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={RoseTheme.colors.textMuted}
                  value={fats}
                  onChangeText={setFats}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Add to my log</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const wizardHeader = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.closeButton} onPress={headerClose}>
        <X size={24} color={RoseTheme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  if (wizardStep === 'describe') {
    return (
      <View style={styles.container}>
        {wizardHeader}
        <View style={[styles.wizardBody, { paddingTop: 8 }]}>
          <Text style={styles.wizardTitle}>Describe your meal</Text>
          <Text style={styles.wizardSubtitle}>A few words help your AI guess portions and sides.</Text>
          {showError && !!errorMessage && (
            <View style={[styles.errorBanner, { marginBottom: 16 }]}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setShowError(false)} style={styles.errorBannerClose}>
                <X size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={[styles.input, styles.textArea, { flexGrow: 0 }]}
            placeholder="e.g. Grilled salmon, rice, roasted veggies…"
            placeholderTextColor={RoseTheme.colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
          />
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 24 }]}
            onPress={() => {
              safeImpact(Haptics.ImpactFeedbackStyle.Medium);
              setShowError(false);
              setWizardStep('photo');
            }}
          >
            <Text style={styles.submitButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (wizardStep === 'photo') {
    const thumbUri = lastMealPhotoBase64 ? `data:image/jpeg;base64,${lastMealPhotoBase64}` : null;
    return (
      <View style={styles.container}>
        {wizardHeader}
        <View style={styles.wizardBody}>
          <Text style={styles.wizardTitle}>Add a meal photo</Text>
          <Text style={styles.wizardSubtitle}>
            Snap or upload a picture — or skip if you already described everything.
          </Text>
          {showError && !!errorMessage && (
            <View style={[styles.errorBanner, { marginBottom: 16 }]}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setShowError(false)} style={styles.errorBannerClose}>
                <X size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}
          {thumbUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: thumbUri }} style={styles.photoPreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  safeSelection();
                  setLastMealPhotoBase64(null);
                }}
              >
                <Text style={styles.secondaryButtonText}>Remove photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>No photo yet</Text>
            </View>
          )}
          <TouchableOpacity style={styles.outlineButton} onPress={() => void wizardTakePhoto()}>
            <Text style={styles.outlineButtonText}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outlineButton, { marginTop: 12 }]} onPress={() => void wizardPickFromLibrary()}>
            <Text style={styles.outlineButtonText}>Upload from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 16 }]}
            onPress={() => {
              safeSelection();
              setLastMealPhotoBase64(null);
              setWizardStep('describe');
            }}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 28 }]}
            onPress={() => {
              safeImpact(Haptics.ImpactFeedbackStyle.Medium);
              void runWizardAnalysis();
            }}
            disabled={isAnalyzing}
          >
            <Text style={styles.submitButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (wizardStep === 'analyzing') {
    return (
      <View style={styles.container}>
        {wizardHeader}
        <View style={styles.loadingBody}>
          <Text style={styles.loadingEmoji}>✨</Text>
          <Text style={styles.loadingTitle}>Crunching your fuel…</Text>
          <Text style={styles.loadingSubtitle}>Your cute little nutritionist is on it.</Text>
          <ActivityIndicator size="large" color={RoseTheme.colors.primary} style={{ marginTop: 28 }} />
        </View>
      </View>
    );
  }

  const kcalDisplay = parseInt(calories, 10);
  const proteinDisplay = parseInt(protein, 10) || 0;
  const carbsDisplay = parseInt(carbs, 10) || 0;
  const fatsDisplay = parseInt(fats, 10) || 0;

  if (wizardStep === 'results') {
    return (
      <View style={styles.container}>
        {wizardHeader}
        <View style={styles.wizardBody}>
          <Text style={styles.resultsHeadline}>Yayy! Your fuel is ready!</Text>
          <Text style={styles.resultsSub}>Here is what your AI logged for this meal.</Text>
          <View style={styles.macroGrid}>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>{Number.isFinite(kcalDisplay) ? kcalDisplay : '—'}</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{proteinDisplay} g</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{carbsDisplay} g</Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{fatsDisplay} g</Text>
            </View>
          </View>
          {!!name.trim() && (
            <Text style={styles.resultsName} numberOfLines={3}>
              {name.trim()}
            </Text>
          )}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Save to my log</Text>
          </TouchableOpacity>
        </View>
        {resultsConfettiKey > 0 && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <ConfettiCannon
              key={`fuel-confetti-${resultsConfettiKey}`}
              count={180}
              origin={{ x: -10, y: 0 }}
              fallSpeed={2800}
              fadeOut
              autoStart
              colors={[
                RoseTheme.colors.primary,
                RoseTheme.colors.secondary,
                RoseTheme.colors.accent,
                '#fff',
                RoseTheme.colors.teal400,
              ]}
            />
          </View>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoseTheme.colors.soft,
  },
  row: {
    flexDirection: 'row',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RoseTheme.colors.gray50,
  },
  content: {
    paddingHorizontal: 32,
    flexGrow: 1,
  },
  wizardBody: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  wizardTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 26,
    color: RoseTheme.colors.text,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  wizardSubtitle: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 15,
    color: RoseTheme.colors.textMuted,
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingBody: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 22,
    color: RoseTheme.colors.text,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 15,
    color: RoseTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 280,
    lineHeight: 22,
  },
  resultsHeadline: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 26,
    color: RoseTheme.colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultsSub: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 14,
    color: RoseTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macroCard: {
    width: '47%',
    backgroundColor: RoseTheme.colors.soft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  macroLabel: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: RoseTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  macroValue: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 22,
    color: RoseTheme.colors.text,
  },
  resultsName: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 15,
    color: RoseTheme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.85,
  },
  photoPreviewWrap: {
    marginBottom: 20,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    maxWidth: 320,
    height: 200,
    borderRadius: 16,
    backgroundColor: RoseTheme.colors.gray50,
  },
  photoPlaceholder: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 241, 242, 0.35)',
  },
  photoPlaceholderText: {
    fontFamily: RoseTheme.fonts.medium,
    color: RoseTheme.colors.textMuted,
    fontSize: 14,
  },
  outlineButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: RoseTheme.colors.border,
    backgroundColor: RoseTheme.colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 15,
    color: RoseTheme.colors.text,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 15,
    color: RoseTheme.colors.textMuted,
  },
  title: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 28,
    color: RoseTheme.colors.text,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  recentSection: {
    marginBottom: 32,
  },
  recentScroll: {
    gap: 12,
    paddingRight: 32,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RoseTheme.colors.gray50,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    gap: 6,
  },
  recentPillIcon: {
    fontSize: 14,
  },
  recentPillText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: RoseTheme.colors.text,
  },
  recentPillKcal: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 12,
    color: RoseTheme.colors.textMuted,
    marginLeft: 4,
  },
  favoriteRemoveButton: {
    marginLeft: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    gap: 8,
  },
  typeButtonActive: {
    borderColor: RoseTheme.colors.primary,
    backgroundColor: RoseTheme.colors.soft,
  },
  typeButtonInactive: {
    borderColor: RoseTheme.colors.gray50,
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
  },
  typeText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  typeTextActive: {
    color: RoseTheme.colors.primary,
  },
  typeTextInactive: {
    color: '#9ca3af',
  },
  form: {
    gap: 20,
  },
  inputGroup: {},
  label: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: RoseTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 241, 242, 0.5)',
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 16,
    color: RoseTheme.colors.text,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  fieldErrorText: {
    marginTop: 6,
    paddingHorizontal: 4,
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 12,
    color: '#dc2626',
  },
  errorBanner: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 13,
    color: '#b91c1c',
  },
  errorBannerClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 4,
  },
  actionPillFull: {
    flex: 1,
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  actionPillText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 13,
    color: RoseTheme.colors.textMuted,
  },
  aiFieldHint: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: Platform.OS === 'web' ? 12 : 13,
    color: RoseTheme.colors.text,
    opacity: 0.72,
    marginBottom: 10,
    paddingHorizontal: 4,
    lineHeight: Platform.OS === 'web' ? 17 : 19,
  },
  aiEstimateButton: {
    marginTop: 12,
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: RoseTheme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiEstimateButtonDisabled: {
    opacity: 0.55,
  },
  aiEstimateButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: 'white',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    width: '100%',
    height: 56,
    backgroundColor: RoseTheme.colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 18,
    color: 'white',
  },
});
