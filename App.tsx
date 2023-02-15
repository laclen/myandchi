import WebView from "react-native-webview";
import BackButton from "./components/BackButton";
import isFirstLaunch from "./utils/detectFirstLaunch";
import { getStatusBarHeight } from "react-native-safearea-height";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { WebViewNavigation, WebViewScrollEvent } from "react-native-webview/lib/WebViewTypes";
import { StatusBar, setStatusBarStyle, setStatusBarBackgroundColor, setStatusBarTranslucent } from "expo-status-bar";
import {
  StyleSheet,
  View,
  Platform,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Dimensions,
} from "react-native";

export default function App() {
  const PLATFORM = Platform.OS;
  const webViewRef = useRef<WebView>();

  const [showBackButton, setShowBackButton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refresherEnabled, setEnableRefresher] = useState(true);

  // opens app settings
  const getSettings = () => Linking.openSettings();

  // back to previous webview page
  const onBackPress = (): boolean => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    } else {
      return false;
    }
  };

  // manage back button availability, display it when not in login or main page
  const checkBackButtonAvailability = (navState: WebViewNavigation): Boolean => navState && navState.canGoBack;

  // onNavigationStateChange, manage backbutton availability, and
  // set statusbar to light text everytime state changes because it's bugged in ios
  const handleNavigatioStateChange = (navState: WebViewNavigation): void => {
    styleStatusBar();
    checkBackButtonAvailability(navState) ? setShowBackButton(true) : setShowBackButton(false);
  };

  // statusbar styling
  const styleStatusBar = () => {
    setStatusBarStyle("dark");
    PLATFORM === "android"
      ? () => {
          setStatusBarTranslucent(true);
          setStatusBarBackgroundColor("#FFC200", false);
        }
      : undefined;
  };

  // scroll handler to manually enable PullToRefresh property for android
  const handleScroll = (e: WebViewScrollEvent): void =>
    Number(e.nativeEvent.contentOffset.y) === 0 ? setEnableRefresher(true) : setEnableRefresher(false);

  // get camera and photo library permissions for users' profile picture preferences
  useEffect(() => {
    const getPermissions = async () => {
      const firstLaunch: Boolean = await isFirstLaunch();
      await check(PLATFORM === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA).then((result) => {
        if (result !== RESULTS.GRANTED && result !== RESULTS.UNAVAILABLE) {
          request(PLATFORM === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA).then((response) => {
            if (response === RESULTS.DENIED && firstLaunch) {
              Alert.alert(
                "Dikkat!",
                "Profil fotoğrafı çekebilmek için uygulama ayarlarından kamera erişimine izin vermeyi unutmayın.",
                [
                  {
                    text: "İptal",
                    style: "cancel",
                  },
                  { text: "Ayarlara Git", onPress: () => getSettings() },
                ]
              );
            }
          });
        }
      });
      await check(PLATFORM === "ios" ? PERMISSIONS.IOS.PHOTO_LIBRARY : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES).then(
        (result) => {
          if (result !== RESULTS.GRANTED && result !== RESULTS.UNAVAILABLE) {
            request(PLATFORM === "ios" ? PERMISSIONS.IOS.PHOTO_LIBRARY : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES).then(
              (response) => {
                if (response === RESULTS.DENIED && firstLaunch) {
                  Alert.alert(
                    "Dikkat!",
                    "Galeriden profil fotoğrafı seçebilmek için uygulama ayarlarından izinleri düzenlemeyi unutmayın.",
                    [
                      {
                        text: "İptal",
                        style: "cancel",
                      },
                      { text: "Ayarlara Git", onPress: () => getSettings() },
                    ]
                  );
                }
              }
            );
          }
        }
      );
    };

    styleStatusBar();
    getPermissions();
  }, []);

  // enable android hardwareBackPress for webview pages, depending on custom back button's state
  useLayoutEffect(() => {
    if (PLATFORM === "android" && showBackButton) {
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => {
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
      };
    }
  }, [showBackButton]);

  return (
    <View style={styles.container}>
      {PLATFORM === "ios" ? (
        <WebView
          style={styles.webview}
          ref={webViewRef}
          source={{ uri: "https://myandchi.com/" }}
          onNavigationStateChange={(navState) => handleNavigatioStateChange(navState)}
          renderLoading={() => <ActivityIndicator size="large" color="rgb(253,168,0)" style={styles.webviewLoading} />}
          pullToRefreshEnabled
          allowsBackForwardNavigationGestures // only works with iOS
          javaScriptEnabled
          startInLoadingState
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              enabled={refresherEnabled}
              onRefresh={() => {
                webViewRef.current.reload();
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 2000);
              }}
            />
          }
        >
          <StatusBar style="dark" backgroundColor="#FFC200" />
          <WebView
            style={styles.webview}
            ref={webViewRef}
            source={{ uri: "https://myandchi.com/" }}
            onNavigationStateChange={(navState) => handleNavigatioStateChange(navState)}
            onScroll={handleScroll}
            renderLoading={() => (
              <View style={styles.webViewLoadingContainer}>
                <ActivityIndicator style={styles.webviewLoading} size="large" color="#FFC200" />
              </View>
            )}
            allowsBackForwardNavigationGestures // only works with iOS
            javaScriptEnabled
            startInLoadingState
          />
        </ScrollView>
      )}
      {showBackButton && (
        <View style={styles.buttonWrapper}>
          <BackButton onPress={onBackPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  webview: {
    flex: 1,
    zIndex: 1,
    marginTop: getStatusBarHeight(),
    backgroundColor: "white",
  },
  webViewLoadingContainer: {
    position: "absolute",
    height: Dimensions.get("window").height,
    width: Dimensions.get("window").width,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  webviewLoading: {
    position: "absolute",
    bottom: Dimensions.get("window").height / 2 - 20,
    left: Dimensions.get("window").width / 2 - 20,

    zIndex: 4,
  },
  buttonWrapper: {
    zIndex: 2,
    position: "absolute",
    bottom: 50,
    left: 20,

    borderRadius: 48 / 2,
    shadowColor: "#FFC200",

    // ios shadow
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,

    // android shadow
    elevation: 15,
  },
});
