import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerPwaAutoUpdate} from './services/pwaUpdater.ts';

registerPwaAutoUpdate();

createRoot(document.getElementById('root')!).render(<App />);

