// State Management Module with Persistence
const STORAGE_KEY = 'studyai_session';

const getInitialState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Session Restore Failed", e);
        }
    }
    return {
        chatHistory: [],
        lastAIResponse: "",
        language: "urdu",
        isLoading: false,
        theme: "light",
        isRecording: false,
        error: null,
        userId: `user_${Math.random().toString(36).substr(2, 9)}`,
        onboarded: false
    };
};

export const state = getInitialState();

export const updateState = (key, value) => {
    state[key] = value;
    saveState();
};

export const saveState = () => {
    const persistable = { ...state, isLoading: false, isRecording: false, error: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
};
