import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useDatabase } from '../../database/dbcontext';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { dbOps, initialized } = useDatabase();
  const [name, setName] = useState('');
  const [inspectors, setInspectors] = useState<{ id: number; name: string }[]>([]);
  const [loadingInspectors, setLoadingInspectors] = useState(true);
  const [geoImages, setGeoImages] = useState<{ uri: string; latitude: number; longitude: number }[]>([]);
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

    const loadGeoTaggedImages = async () => {
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) return;

      const photos = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 100 });

      const imageWithLocation = await Promise.all(
        photos.assets.map(async (photo) => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(photo);
            if (info?.location) {
              return {
                uri: info.uri,
                latitude: info.location.latitude,
                longitude: info.location.longitude,
              };
            }
          } catch (e) {
            console.warn(`Error reading location from image ${photo.filename}`, e);
          }
          return null;
        })
      );

      setGeoImages(imageWithLocation.filter(Boolean) as any);
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
    const markers = geoImages
      .map(
        (img) => `
        new ymaps.Placemark([${img.latitude}, ${img.longitude}], {
          balloonContent: '<img src="${img.uri}" width="150" height="150" />'
        })`
      )
      .join(',\n');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU" type="text/javascript"></script>
        </head>
        <body>
          <div id="map" style="width:100%; height:100%;"></div>
          <script>
            ymaps.ready(function () {
              var map = new ymaps.Map("map", {
                center: [55.751574, 37.573856],
                zoom: 10
              });

              var geoObjects = [${markers}];
              geoObjects.forEach(obj => map.geoObjects.add(obj));
            });
          </script>
        </body>
      </html>
    `;
  };

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      marginBottom: 10,
      borderRadius: 5,
      color: colors.text,
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
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      color: colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mapContainer: {
      height: 300,
      marginVertical: 10,
      borderRadius: 10,
      overflow: 'hidden',
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
    <View style={styles.container}>
      <Text style={styles.title}>Управление инспекторами</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Введите ФИО инспектора"
        placeholderTextColor={colors.text}
      />
      <Button title="Добавить инспектора" onPress={handleAddInspector} />
      <FlatList
        data={inspectors}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={{ color: colors.text }}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleDeleteInspector(item.id)}>
              <Text style={styles.deleteButton}>Удалить</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: colors.text }}>
            Нет добавленных инспекторов
          </Text>
        }
      />
      <Text style={styles.title}>📍 Фото с координатами</Text>
      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: generateYandexMapHTML() }}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
