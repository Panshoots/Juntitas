import { registerRootComponent } from 'expo';
import App from './App';
import { injectWebFonts } from './src/utils/injectWebFonts';

injectWebFonts();

registerRootComponent(App);
