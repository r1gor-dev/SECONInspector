import React, { useState, useEffect, useCallback  } from 'react';
import { View, Modal, Text, TextInput, Button, ScrollView,
   Alert, Image, Platform,StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@react-navigation/native';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Location from 'expo-location';
import { Menu, Divider, Provider as PaperProvider, Button as PaperButton } from 'react-native-paper';  
import { useDatabase } from '../../database/dbcontext';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Entry = {
  settlement: string;
  street: string;
  house: string;
  apartment: string;
  room: string;
  meterNumber: string;
  workDate: string;
  workTime: string;
  workType: string;
  workResult: string;
  inspector1: string;
  inspector2: string;
  photoUris: string[];
  timestamp: string;
};

type GeoImage = {
  uri: string;
  latitude: number;
  longitude: number;
  base64: string;
};

export default function App() {
  const { colors } = useTheme();
  const { dbOps, initialized } = useDatabase();
  const [settlement, setSettlement] = useState('');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [room, setRoom] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [workDate, setWorkDate] = useState(format(new Date(), 'dd.MM.yyyy'));
  const [workTime, setWorkTime] = useState(() => {
    const now = new Date();
    return format(now, 'HH:mm');
  });
  const [workType, setWorkType] = useState('');
  const [workResult, setWorkResult] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuVisible2, setMenuVisible2] = useState(false);
  const [inspectorsList, setInspectorsList] = useState<{id: number, name: string}[]>([]);
  const [inspectors, setInspectors] = useState<{id: number, name: string}[]>([]);
  const [inspector1, setInspector1] = useState('');
  const [inspector2, setInspector2] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const workTypes = ['возобновление', 'отключение', 'ограничение'];

  const workResultsMap: { [key: string]: string[] } = {
    'возобновление': ['возобновление', 'недопуск'],
    'отключение': ['отключение', 'оплата на месте', 'недопуск'],
    'ограничение': ['не нарушено', 'нарушено'],
  };

  useFocusEffect(
    useCallback(() => {
      const loadInspectors = async () => {
        if (initialized && dbOps) {
          const data = await dbOps.getInspectors();
          setInspectors(data);
          setInspectorsList(data);
        }
      };
      loadInspectors();
    }, [initialized, dbOps])
  );

  const [visibleWorkTypeMenu, setVisibleWorkTypeMenu] = useState(false);
  const [visibleWorkResultMenu, setVisibleWorkResultMenu] = useState(false);

  const pickImage = async () => {
    // Запрашиваем необходимые разрешения
    const [cameraPermission, locationPermission, mediaPermission] = await Promise.all([
      ImagePicker.requestCameraPermissionsAsync(),
      Location.requestForegroundPermissionsAsync(),
      MediaLibrary.requestPermissionsAsync()
    ]);
  
    if (!cameraPermission.granted || !locationPermission.granted || !mediaPermission.granted) {
      Alert.alert('Требуются разрешения', 'Необходимо предоставить доступ к камере, геолокации и медиабиблиотеке');
      return;
    }
  
    try {
      // Получаем текущее местоположение
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      });
  
      // Делаем фото
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.9,
        allowsEditing: false,
        allowsMultipleSelection: true,
        exif: true,
        cameraType: ImagePicker.CameraType.back
      });
  
      if (result.canceled) {
        Alert.alert('Отменено', 'Фотосъемка отменена пользователем');
        return;
      }
  
      if (result.assets?.length) {
        const timestamp = new Date();
        const formattedDate = format(timestamp, 'ddMMyyyy');
        const formattedTime = format(timestamp, 'HHmmss');
        
        // Формируем базовое имя файла
        const addressParts = [
          settlement?.replace(/\s+/g, '_'),
          street?.replace(/\s+/g, '_'),
          `дом${house}`,
          apartment ? `кв${apartment}` : '',
          room ? `ком${room}` : ''
        ].filter(Boolean);
  
        const baseFilename = addressParts.join('_');
        
        // Определяем тип фото (прибор или дверь)
        const isMeterPhoto = workResult.toLowerCase().includes('доступ') && 
                           !workResult.toLowerCase().includes('отсутствует');
        const photoType = isMeterPhoto ? 'прибор' : 'дверь';
  
        // Обрабатываем все сделанные фото
        const newPhotoUris = await Promise.all(
          result.assets.map(async (asset, index) => {
            const photoNumber = (index + 1).toString().padStart(2, '0');
            const filename = `${baseFilename}_${photoType}_${formattedDate}_${formattedTime}_${photoNumber}.jpg`;
            
            // Сохраняем в приватное хранилище приложения
            const newPath = `${FileSystem.documentDirectory}${filename}`;
            await FileSystem.copyAsync({ from: asset.uri, to: newPath });
  
            // Добавляем геоданные в EXIF (для Android)
            if (Platform.OS === 'android') {
              // Здесь не нужно использовать updateAssetLocationAsync, так как это не поддерживается.
              // Просто сохраняем фото с EXIF-метаданными, полученными при съемке.
              
              const newPath = `${FileSystem.documentDirectory}${filename}`;
              await FileSystem.copyAsync({ from: asset.uri, to: newPath });
            
              // Добавляем фото в медиабиблиотеку
              const assetInfo = await MediaLibrary.createAssetAsync(newPath);
            
              // Сохраняем фото в новый альбом
              await MediaLibrary.createAlbumAsync('ЭнергоИнспектор', assetInfo, false);
              
              // Дополнительно сохраняем координаты в текстовый файл
              const locationText = `Широта: ${location.coords.latitude}\nДолгота: ${location.coords.longitude}\nТочность: ${location.coords.accuracy}m`;
              await FileSystem.writeAsStringAsync(`${newPath}.txt`, locationText);
            }
            
  
            // Сохраняем в галерею с геотегом
            const assetInfo = await MediaLibrary.createAssetAsync(newPath);
            await MediaLibrary.createAlbumAsync('ЭнергоИнспектор', assetInfo, false);
  
            // Дополнительно сохраняем координаты в текстовый файл
            const locationText = `Широта: ${location.coords.latitude}\nДолгота: ${location.coords.longitude}\nТочность: ${location.coords.accuracy}m`;
            await FileSystem.writeAsStringAsync(`${newPath}.txt`, locationText);
  
            return newPath;
          })
        );
  
        setPhotoUris(prev => [...prev, ...newPhotoUris.filter(Boolean)]);
        
        Alert.alert(
          'Фото сохранены', 
          `Сделано ${newPhotoUris.length} фото.\nПример имени: ${newPhotoUris[0]?.split('/').pop()}`
        );
      }
    } catch (error) {
      console.error('Ошибка при фотофиксации:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить фотографии');
    }
  };

  const submitEntry = () => {
    if (!settlement || !street || !house || !apartment || !meterNumber || (!inspector1 && !inspector2) || !workType || !workResult) {
      Alert.alert('Заполните обязательные поля (Населённый пункт, Улица, Квартира, Номер прибора)');
      return;
    }

    const timestamp = new Date().toISOString();
    const newEntry = {
      settlement,
      street,
      house,
      apartment,
      room,
      meterNumber,
      workDate,
      workTime,
      workType,
      workResult,
      inspector1,
      inspector2,
      photoUris,
      timestamp
    };

    setEntries((prevEntries) => [...prevEntries, newEntry]);
    resetForm();
    Alert.alert('Запись сохранена!');
  };

  const resetForm = () => {
    setSettlement('');
    setStreet('');
    setHouse('');
    setApartment('');
    setRoom('');
    setMeterNumber('');
    setWorkTime(() => {
      const now = new Date();
      return format(now, 'HH:mm');
    });
    setWorkType('');
    setWorkResult('');
    setInspector1('');
    setInspector2('');
    setPhotoUris([]);
  };

  const generateXLSXReport = async () => {
    if (entries.length === 0) {
      Alert.alert('Нет записей для отчёта :(');
      return;
    }

    const worksheetData = [
      [
        '№ п/п',
        'Населенный пункт',
        'Улица',
        'Дом',
        'Квартира',
        'Комната',
        'Тип и номер прибора учета',
        'Дата заявки',
        'Время работы',
        'Вид работы',
        'Результат работы',
        'ФИО инспектора 1',
        'ФИО инспектора 2',
        'Кол-во фото, подтверждающих работу'
      ],
      ...entries.map((entry, index) => [
        index + 1,
        entry.settlement,
        entry.street,
        entry.house,
        entry.apartment,
        entry.room,
        entry.meterNumber,
        entry.workDate,
        entry.workTime,
        entry.workType,
        entry.workResult,
        entry.inspector1,
        entry.inspector2,
        entry.photoUris.length
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');

    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileName = `Отчет_${format(new Date(), 'ddMMyyyy_HHmm', { locale: ru })}.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Поделиться отчетом',
      UTI: 'com.microsoft.excel.xlsx'
    });
  };

  const styles = StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 40,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: colors.text,
    },
    label: {
      marginBottom: 4,
      marginTop: 10,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'left',
    },
    input: {
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      padding: 8,
      color: colors.text,
    },
    imageContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    image: {
      width: 300,
      height: 300,
      marginVertical: 15,
      alignSelf: 'center',
      borderRadius: 8,
    },
    menuButton: {
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 15,
      marginBottom: 10,
    },
    menuItemText: {
      textAlign: 'left', 
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      marginTop: 45,
    },
    separator: {
      marginVertical: 10,
      height: 1,
      backgroundColor: colors.border,
    },
    button: {
      marginVertical: 8,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    menuButtonText: {
      textAlign: 'left', 
    },
    buttonText: {
      color: colors.card,
      fontWeight: 'bold',
    },
  });

  return (
    <PaperProvider>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Энергоинспектор</Text>
        </View>

        <Text style={styles.label}>
          <Icon name="city" size={18} /> Населенный пункт:</Text>
        <TextInput
          style={styles.input}
          value={settlement}
          onChangeText={setSettlement}
          placeholder="Город/посёлок"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>
          <Icon name="home-city" size={18} /> Улица:</Text>
        <TextInput
          style={styles.input}
          value={street}
          onChangeText={setStreet}
          placeholder="Улица"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>
          <Icon name="home-outline" size={18} /> Дом:</Text>
        <TextInput
          style={styles.input}
          value={house}
          onChangeText={setHouse}
          placeholder="Дом"
          placeholderTextColor={colors.text}
          keyboardType="numeric"
        />

        <Text style={styles.label}>
         <Icon name="office-building" size={18} /> Квартира:</Text>
        <TextInput
          style={styles.input}
          value={apartment}
          onChangeText={setApartment}
          placeholder="Номер квартиры"
          placeholderTextColor={colors.text}
          keyboardType="numeric"
        />

        <Text style={styles.label}>
        <Icon name="door" size={18} /> Комната:</Text>
        <TextInput
          style={styles.input}
          value={room}
          onChangeText={setRoom}
          placeholder="Номер комнаты (если есть)"
          placeholderTextColor={colors.text}
          keyboardType="numeric"
        />

        <Text style={styles.label}>
        <Icon name="counter" size={18} /> Тип и номер прибора учета:</Text>
        <TextInput
          style={styles.input}
          value={meterNumber}
          onChangeText={setMeterNumber}
          placeholder="Например: СЕ 102  №: 12501176862604"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>
        <Icon name="calendar" size={18} /> Дата заявки:</Text>
        <TextInput
          style={styles.input}
          value={workDate}
          onChangeText={setWorkDate}
          placeholder="дд.мм.гггг"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>
        <Icon name="clock-outline" size={18} /> Время работы:</Text>
        <TextInput
          style={styles.input}
          value={workTime}
          onChangeText={setWorkTime}
          placeholder="Например: 14:00-15:30"
          placeholderTextColor={colors.text}
        />

        
        <Text style={[styles.label, { color: colors.text }]}>
        <Icon name="cog-outline" size={18} /> Вид работы:</Text>
          <Menu
            visible={visibleWorkTypeMenu}
            onDismiss={() => setVisibleWorkTypeMenu(false)}
            anchor={
              <PaperButton
                mode="text"
                contentStyle={{
                  justifyContent: 'flex-start',
                  paddingLeft: 0 
                }}
                onPress={() => setVisibleWorkTypeMenu(true)}
                style={[styles.menuButton, { backgroundColor: colors.primary }]}
                labelStyle={[styles.menuButtonText, { color: colors.background }]} // Цвет текста белый
              >
                {workType || 'Выберите вид работы'}
              </PaperButton>
            }
          >
            {workTypes.map((type) => (
              <Menu.Item
                key={type}
                titleStyle={[styles.menuItemText, { color: colors.text }]}
                title={type}
                onPress={() => {
                  if (workType !== type) {
                    setWorkType(type);
                    setVisibleWorkTypeMenu(false);
                    setWorkResult('');
                  }
                }}
              />
            ))}
          </Menu>

          <Text style={[styles.label, { color: colors.text }]}>
          <Icon name="check-circle-outline" size={18} /> Результат работы:</Text>
          <Menu
            visible={visibleWorkResultMenu}
            onDismiss={() => setVisibleWorkResultMenu(false)}
            anchor={
              <PaperButton
                mode="text"
                contentStyle={{
                  justifyContent: 'flex-start',
                  paddingLeft: 0 
                }}
                onPress={() => setVisibleWorkResultMenu(true)}
                style={[styles.menuButton, { backgroundColor: colors.primary }]}
                labelStyle={[styles.menuButtonText, { color: colors.background }]} // Цвет текста белый
              >
                {workResult || 'Выберите результат'}
              </PaperButton>
            }
          >
            {workResultsMap[workType]?.map((result) => (
              <Menu.Item
                key={result}
                titleStyle={[styles.menuItemText, { color: colors.text }]}
                title={result}
                onPress={() => {
                  if (workResult !== result) {
                    setWorkResult(result);
                    setVisibleWorkResultMenu(false);
                  }
                }}
              />
            ))}
          </Menu>

          <Text style={[styles.label, { color: colors.text }]}>
          <Icon name="account-outline" size={18} /> ФИО инспектора 1:</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <PaperButton
                  mode="text"
                  contentStyle={{
                    justifyContent: 'flex-start',
                    paddingLeft: 0,
                  }}
                  onPress={() => setMenuVisible(true)}
                  style={[styles.menuButton, { backgroundColor: colors.primary }]}
                  labelStyle={[styles.menuButtonText, { color: colors.background }]}
                >
                  {inspector1 || 'Выберите инспектора'}
                </PaperButton>
              }
            >
              {inspectors
                .filter((i) => i.name !== inspector2)
                .map((inspector) => (
                  <Menu.Item
                    key={inspector.id}
                    title={inspector.name}
                    onPress={() => {
                      setInspector1(inspector.name);
                      setMenuVisible(false);
                    }}
                  />
                ))}
            </Menu>

            <Text style={[styles.label, { color: colors.text }]}>
            <Icon name="account-outline" size={18} /> ФИО инспектора 2:</Text>
            <Menu
              visible={menuVisible2}
              onDismiss={() => setMenuVisible2(false)}
              anchor={
                <PaperButton
                  mode="text"
                  contentStyle={{
                    justifyContent: 'flex-start',
                    paddingLeft: 0,
                  }}
                  onPress={() => setMenuVisible2(true)}
                  style={[styles.menuButton, { backgroundColor: colors.primary }]}
                  labelStyle={[styles.menuButtonText, { color: colors.background }]}
                >
                  {inspector2 || 'Выберите инспектора'}
                </PaperButton>
              }
            >
              {inspectors
                .filter((i) => i.name !== inspector1) // исключаем уже выбранного
                .map((inspector) => (
                  <Menu.Item
                    key={inspector.id}
                    title={inspector.name}
                    onPress={() => {
                      setInspector2(inspector.name);
                      setMenuVisible2(false);
                    }}
                  />
                ))}
            </Menu>


        <TouchableOpacity onPress={pickImage} style={styles.button}>
          <Text style={styles.buttonText}>
          <Icon name="camera" size={18} /> Сделать фото</Text>
        </TouchableOpacity>

        <View style={styles.imageContainer}>
          {photoUris.map((uri, index) => (
            <View key={index} style={{ position: 'relative', margin: 10 }}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                onPress={() => {
                  setPhotoUris((prevUris) => prevUris.filter((_, i) => i !== index));
                }}
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 5,
                  backgroundColor: 'rgba(255, 0, 0, 0.7)',
                  borderRadius: 12,
                  padding: 4,
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>✖</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={submitEntry} style={styles.button}>
          <Text style={styles.buttonText}>
          <Icon name="content-save" size={18} /> Сохранить</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={generateXLSXReport} style={styles.button}>
          <Text style={styles.buttonText}>
          <Icon name="chart-bar" size={18} /> Скачать отчет</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
    </PaperProvider>
  );
}

