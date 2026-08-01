import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { ThemeProvider } from './tema/ContextoTema';
import ErrorBoundary from './componentes/ErrorBoundary/ErrorBoundary';
import App from './Aplicacion.jsx';
import './index.css';
import './tema/tema.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </Provider>
  </StrictMode>
);
