import { Platform } from 'react-native';

const ICON_FONTS_CSS = `
@font-face {
  font-family: 'Ionicons';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.6148e7019854f3bde85b633cb88f3c25.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'ionicons';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.6148e7019854f3bde85b633cb88f3c25.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'MaterialCommunityIcons';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.b62641afc9ab487008e996a5c5865e56.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'material-community';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.b62641afc9ab487008e996a5c5865e56.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'MaterialIcons';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'material';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/FontAwesome.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5_Solid';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.605ed7926cf39a2ad5ec2d1f9d391d3d.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/FontAwesome5_Solid.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome6_Solid';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.adec7d6f310bc577f05e8fe06a5daccf.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/FontAwesome6_Solid.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Feather';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.a76d309774d33d9856f650bed4292a23.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Feather.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'AntDesign';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.3a2ba31570920eeb9b1d217cabe58315.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/AntDesign.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Entypo';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.31b5ffea3daddc69dd01a1f3d6cf63c5.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Entypo.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Octicons';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.f7c53c47a66934504fcbc7cc164895a7.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Octicons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'SimpleLineIcons';
  src: url('/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.d2285965fe34b05465047401b8595dd0.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/SimpleLineIcons.ttf') format('truetype');
  font-display: swap;
}
`;

export const injectWebFonts = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const existing = document.getElementById('juntitas-vector-icon-fonts');
    if (!existing) {
      const style = document.createElement('style');
      style.id = 'juntitas-vector-icon-fonts';
      style.type = 'text/css';
      style.appendChild(document.createTextNode(ICON_FONTS_CSS));
      document.head.appendChild(style);
      console.log('✅ [Juntitas Web] Icon fonts injected into document.head');
    }
  }
};
