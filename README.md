# Us Forever (Memory Lane) 💕

**Us Forever** is a feature-rich, romantic memory-tracking and journaling web and mobile application built for couples to capture, organize, and cherish their shared journey. Featuring AI-powered recap generation, interactive countdowns, a shared timeline journal, photo gallery, calendar, chat, and native Android support via Capacitor.

---

## 🌟 Key Features

- **🏠 Home Dashboard & AI Recap**: View milestone countdowns, memory stats, and generate heartwarming AI summaries of recent moments powered by Google Gemini.
- **📝 Journal & Timeline**: Create, tag, and explore detailed memories (Photos, Journal entries, Notes) arranged chronologically.
- **🖼 Photo Gallery**: Browse all shared photo memories in a clean, responsive gallery layout.
- **💬 Couple Chat**: Real-time messaging and notes between partners.
- **🗓 Shared Calendar**: Keep track of upcoming anniversaries, dates, and special shared events.
- **📱 Cross-Platform Mobile Support**: Web application powered by Vite & Express, packaged into a native Android app via Capacitor.
- **🔒 Secure Authentication & Data**: Protected by Firebase Authentication and customized Firestore Security Rules.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Motion (Framer Motion), Lucide React
- **Backend / Server**: Node.js, Express server (`server.ts`)
- **AI Integration**: Google GenAI SDK (`@google/genai` using Gemini models)
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **Mobile Runtime**: Capacitor 8 (Android)
- **Bundling & Tooling**: Vite, ESBuild, TSX

---

## 📋 Prerequisites

Ensure you have the following installed on your environment:

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Android Studio** *(optional, required for running or debugging the native Android app locally)*
- **JDK 17+** *(required for Android builds)*

---

## ⚙️ Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/memory-lane.git
   cd memory-lane
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example`:

   ```env
   # Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key_here

   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

---

## 🔥 Firebase Setup & Security Rules

### 1. Database Setup
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and **Firebase Authentication**.

### 2. Security Rules
Deploy the security rules specified in `firestore.rules` to secure database access for authenticated users.

---

## 🚀 Running the Web Application

### Development Mode
Start the local Express development server with live TypeScript execution via `tsx`:
```bash
npm run dev
```

### Production Build & Execution
1. Build web static assets with Vite and bundle the Node.js server with ESBuild:
   ```bash
   npm run build
   ```
2. Launch the bundled production server:
   ```bash
   npm run start
   ```

### Type Checking & Linting
To check TypeScript types across the project:
```bash
npm run lint
```

### Testing
Run the test suite to validate core functionality:
```bash
npm test
```

---

## 📱 Android Build & Capacitor Instructions

The repository uses **Capacitor 8** to build native Android packages (`com.memorylane.app`).

### 1. Build Web Dist & Sync Assets
Generate the latest `dist` directory and sync with the native Android project:
```bash
npm run build
npx cap sync android
```

### 2. Open in Android Studio
To run the Android app on an emulator or connected physical device:
```bash
npx cap open android
```

### 3. Command Line Android Build
Build the debug APK directly via Gradle:
```bash
cd android
./gradlew assembleDebug
```
The compiled debug APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Continuous Integration
Automated Android APK builds are configured via GitHub Actions in `.github/workflows/android-build.yml`.

---

## 📂 Project Structure

```
├── android/               # Native Android project files & Capacitor configuration
├── public/                # Web manifest, icons, and service worker
├── src/
│   ├── components/        # UI Views (Timeline, Gallery, Calendar, Chat, Auth, etc.)
│   ├── lib/               # Firebase initialization and helper utilities
│   ├── App.tsx            # Main application layout & state routing
│   └── main.tsx           # React application entry point
├── .env.example           # Environment variable template
├── capacitor.config.ts    # Capacitor app configuration
├── firestore.rules        # Firestore security rules
├── server.ts              # Express backend server script
├── vite.config.ts         # Vite configuration
└── package.json           # Project dependencies & scripts
```