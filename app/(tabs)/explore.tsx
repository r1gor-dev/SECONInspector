import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useDatabase } from '../../database/dbcontext';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';
import { ScrollView, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';


export default function ExploreScreen() {
  const { colors } = useTheme();
  const { dbOps, initialized } = useDatabase();
  const [name, setName] = useState('');
  const [inspectors, setInspectors] = useState<{ id: number; name: string }[]>([]);
  const [loadingInspectors, setLoadingInspectors] = useState(true);
  const [geoImages, setGeoImages] = useState<
  { uri: string; latitude: number; longitude: number; base64: string }[]
>([]);

  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (initialized && dbOps) {
        try {
          const data = await dbOps.getInspectors();
          setInspectors(data || []);
        } catch (error) {
          console.error('Failed to load inspectors:', error);
        } finally {
          setLoadingInspectors(false);
        }
      }
    };
    const imageToBase64 = async (uri: string): Promise<string | null> => {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${base64}`;
      } catch (error) {
        console.warn('Ошибка при конвертации изображения в base64:', error);
        return null;
      }
    };

    const loadGeoTaggedImages = async () => {
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) return;
    
      const album = await MediaLibrary.getAlbumAsync('ЭнергоИнспектор');
      if (!album) return;
    
      const photos = await MediaLibrary.getAssetsAsync({
        album,
        mediaType: 'photo',
        first: 100,
      });
    
      const enrichedImages = await Promise.all(
        photos.assets.map(async (photo) => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(photo);
            if (info?.location) {
              const base64 = await imageToBase64(info.uri);
              if (!base64) return null;
    
              return {
                uri: info.uri,
                latitude: info.location.latitude,
                longitude: info.location.longitude,
                base64,
              };
            }
          } catch (e) {
            console.warn(`Error reading location from image ${photo.filename}`, e);
          }
          return null;
        })
      );
    
      setGeoImages(enrichedImages.filter(Boolean) as any);
      setLoadingImages(false);
    };
    

    fetchData();
    loadGeoTaggedImages();
  }, [initialized, dbOps]);

  const handleAddInspector = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите ФИО инспектора');
      return;
    }

    try {
      if (!dbOps) throw new Error('Database not initialized');

      await dbOps.addInspector(name);
      setName('');
      const updatedInspectors = await dbOps.getInspectors();
      setInspectors(updatedInspectors || []);
      Alert.alert('Успех', 'Инспектор добавлен');
    } catch (error) {
      console.error('Error adding inspector:', error);
      Alert.alert('Ошибка', 'Не удалось добавить инспектора');
    }
  };

  const handleDeleteInspector = async (id: number) => {
    try {
      if (!dbOps) throw new Error('Database not initialized');

      await dbOps.deleteInspector(id);
      const updatedInspectors = await dbOps.getInspectors();
      setInspectors(updatedInspectors || []);
      Alert.alert('Успех', 'Инспектор удален');
    } catch (error) {
      console.error('Error deleting inspector:', error);
      Alert.alert('Ошибка', 'Не удалось удалить инспектора');
    }
  };

  const generateYandexMapHTML = () => {
    const maxMarkers = 10;
    const markers = geoImages.slice(0, maxMarkers)
      .map((img, i) => {
        const fileName = img.uri.split('/').pop() || `Фото ${i + 1}`;
        const displayName = fileName.replace(/\.[^/.]+$/, '');
  
        const safeBase64 = img.base64.startsWith('data:image')
          ? img.base64
          : 'https://via.placeholder.com/150';
  
        return `new ymaps.Placemark([${img.latitude}, ${img.longitude}], {
          balloonContent: \`
            <div style="padding: 10px; max-width: 300px;">
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #333;">
                📸 ${displayName}
              </div>
              <img 
                src="${safeBase64}" 
                style="width: 100%; height: auto; max-height: 200px; border-radius: 4px; margin-bottom: 8px;"
                onerror="this.src='https://via.placeholder.com/150'"
              />
              <div style="font-size: 14px; color: #666;">
                <div>Координаты: ${img.latitude.toFixed(6)}, ${img.longitude.toFixed(6)}</div>
                <div style="margin-top: 4px;">🕒 ${new Date().toLocaleString()}</div>
              </div>
            </div>
          \`,
          iconCaption: "${displayName}"
        })`;
      })
      .join(',\n');
  
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU" type="text/javascript"></script>
        </head>
        <body>
          <div id="map" style="width:100%; height:100vh;"></div>
          <script>
            ymaps.ready(function () {
              try {
                var map = new ymaps.Map("map", {
                  center: [53.195187, 45.018060],
                  zoom: 10
                });
  
                var geoObjects = [${markers}];
                geoObjects.forEach(obj => map.geoObjects.add(obj));
  
                if (geoObjects.length > 0) {
                  geoObjects[0].balloon.open();
                }
              } catch (e) {
                document.body.innerHTML = '<pre style="color:red;">Ошибка инициализации карты: ' + e.message + '</pre>';
              }
            });
          </script>
        </body>
      </html>
    `;
  };
  
  
  

  const styles = StyleSheet.create({
    container: {
      padding: 10,
      paddingBottom: 30,
    },
    
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      marginBottom: 10,
      borderRadius: 5,
      color: colors.text,
      marginTop: 20,
    },
    listItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    deleteButton: {
      color: 'red',
    },
    title: {
      fontSize: 23,
      marginTop: 55,
      marginLeft: 10,
      fontWeight: 'bold',
      marginBottom: 10,
      color: colors.text,
    },
    imageCard: {
      marginBottom: 15,
      padding: 10,
      backgroundColor: colors.card,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    imageWrapper: {
      marginTop: 10,
      borderRadius: 8,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: 200,
      borderRadius: 8,
    },
    imageTitle: {
      fontWeight: 'bold',
      fontSize: 16,
      color: colors.text,
    },
    imageSubtext: {
      fontSize: 12,
      color: colors.text,
      marginTop: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mapContainer: {
      height: 300,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    },
    
  });

  if (!initialized || loadingInspectors || loadingImages) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text }}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Управление инспекторами</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Введите ФИО инспектора"
        placeholderTextColor={colors.text}
      />
      <Button title="Добавить инспектора" onPress={handleAddInspector} />
      {inspectors.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: colors.text }}>
          Нет добавленных инспекторов
        </Text>
      ) : (
        inspectors.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={{ color: colors.text }}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleDeleteInspector(item.id)}>
              <Text style={styles.deleteButton}>Удалить</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

<Text style={styles.title}>
  <Icon name="map-marker-multiple" size={26}/>
  <Icon name="map-search-outline" size={26} /> Карта координат
</Text>
<View style={styles.mapContainer}>
  <WebView
    originWhitelist={['*']}
    source={{ html: generateYandexMapHTML() }}
    javaScriptEnabled={true}
    domStorageEnabled={true}
    style={{ flex: 1 }}
    onError={(e) => console.log('❌ WebView Error:', e.nativeEvent)}
    onHttpError={(e) => console.log('❌ WebView HTTP Error:', e.nativeEvent)}
    onLoadEnd={() => console.log('✅ WebView Loaded')}
  />
</View>


</ScrollView>
  );
}