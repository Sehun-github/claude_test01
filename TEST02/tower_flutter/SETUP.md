# 타워 디펜스 Flutter 앱 실행 방법

## 1. Flutter SDK 설치
https://docs.flutter.dev/get-started/install/windows

설치 후 환경변수 PATH에 `flutter/bin` 추가

## 2. 설치 확인
```
flutter doctor
```

## 3. 실행
```
cd tower_flutter
flutter pub get
flutter run
```

### 데스크탑(Windows)으로 실행
```
flutter run -d windows
```

### 앱 빌드 (APK)
```
flutter build apk --release
```
APK 경로: `build/app/outputs/flutter-apk/app-release.apk`

### 앱 빌드 (Windows EXE)
```
flutter build windows --release
```
