# Maternity Care & Health Platform

A comprehensive maternity care platform designed to support patients, doctors, nurses, and partners throughout the pregnancy journey and beyond. Built with a modern technology stack to ensure performance, reliability, and an exceptional user experience.

## ✨ Key Features

The application is structured into role-based portals, ensuring each user gets a customized experience:

### 🤰 For Patients
- **Pregnancy Journey & Onboarding:** Personalized milestones and journey tracking.
- **Symptoms & Vitals Tracker:** Monitor daily vitals and log symptoms.
- **Contraction Timer:** Built-in tool for timing contractions.
- **Health Management:** Track lab results, medications, and nutrition.
- **Mental Health Tracker:** Support for maternal mental wellness.
- **Birth Plan Preparation:** Tools to create and manage birth plans.
- **Direct Communication:** Secure chat with healthcare providers.

### 👨‍⚕️ For Doctors
- **Doctor Dashboard:** Overview of priority alerts, recent activity, and patient updates.
- **Patient Management:** Access detailed patient records, history, and vitals.
- **Prescriptions & Labs:** Manage medications and request lab tests.
- **Analytics:** Insights into patient outcomes and trends.
- **Communication Tools:** Secure chat with patients and staff, complete with templates.

### 👩‍⚕️ For Nurses
- **Nurse Dashboard:** Quick access to shift schedules and patient directories.
- **Ultrasound OCR:** Automated data extraction from ultrasound images.
- **Patient Monitoring:** Track patient vitals and alert doctors to abnormalities.

### 🏥 For Administrators
- **Facility Management:** Manage hospitals and care centers.
- **User Management:** Oversee doctors, nurses, and staff access.
- **Lab Categories:** Configure laboratory test categories and standards.

### 🤝 For Partners
- **Partner Dashboard:** Stay involved in the pregnancy journey with dedicated tracking and updates.

## 🛠️ Technology Stack

- **Frontend:** [React](https://reactjs.org/) (v18) with [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Routing:** [React Router](https://reactrouter.com/) (v6)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) & [TanStack React Query](https://tanstack.com/query/latest)
- **Authentication & Database:** [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `bun`

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure Firebase:**
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   bun run dev
   ```
   The app will be running at `http://localhost:8080` (or another port if specified by Vite).

## 🧪 Testing and Linting

- **Run linter:**
  ```bash
  npm run lint
  ```
- **Run tests:**
  ```bash
  npm run test
  ```
- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```

## 🏗️ Building for Production

To create a production build, run:
```bash
npm run build
```
The optimized assets will be available in the `dist` directory.

## 📄 License
This project is proprietary.
