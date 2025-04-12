import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import * as MediaLibrary from 'expo-media-library';

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

export default function App() {
  const { colors } = useTheme();
  const [settlement, setSettlement] = useState('');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [room, setRoom] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [workDate, setWorkDate] = useState(format(new Date(), 'dd.MM.yyyy'));
  const [workTime, setWorkTime] = useState('');
  const [workType, setWorkType] = useState('');
  const [workResult, setWorkResult] = useState('');
  const [inspector1, setInspector1] = useState('');
  const [inspector2, setInspector2] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const workTypes = ['возобновление', 'отключение', 'ограничение'];

  const workResultsMap: { [key: string]: string[] } = {
    'возобновление': ['возобновление', 'недопуск'],
    'отключение': ['отключение', 'оплата на месте', 'недопуск'],
    'ограничение': ['не нарушено', 'нарушено'],
  };



  const pickImage = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    //const mediaPermission = await MediaLibrary.requestPermissionsAsync();
    const locationPermission = await Location.requestForegroundPermissionsAsync();

    if (!cameraPermission.granted /*|| !mediaPermission.granted*/ || locationPermission.status !== 'granted') {
      Alert.alert('Нужны разрешения на камеру и геолокацию!');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const result = await ImagePicker.launchCameraAsync({ 
      quality: 0.7, 
      allowsMultipleSelection: true,
      exif: true 
    });

    if (result.canceled) {
      console.log("Съемка была отменена пользователем");
      Alert.alert('Вы вышли из камеры.')
      return;
    }

    if (!result.canceled && result.assets?.length) {
      const timestamp = new Date();
      const formattedTime = format(timestamp, 'ddMMyyyy_HHmmss');
      const address = `${settlement}_${street}_${apartment || ''}_${room || ''}`.replace(/\s+/g, '_');
      const isAvaliable = workResult.toLowerCase().includes('доступ') && !workResult.toLowerCase().includes('отсутствует');

      const newPhotoUris = await Promise.all(
        result.assets.map(async (asset, index) => {
          const fileName = isAvaliable
            ? `${address}_${formattedTime}_${index + 1}.jpg`
            : `${address}_доступ_отсутствует_${formattedTime}_${index + 1}.jpg`;
            
          const newPath = FileSystem.documentDirectory + fileName;
          await FileSystem.copyAsync({ from: asset.uri, to: newPath });

          // const assetSaved = await MediaLibrary.createAssetAsync(newPath);
          // await MediaLibrary.createAlbumAsync('Энергоинспектор', assetSaved, false);

          const locationInfo = `lat=${location.coords.latitude},lon=${location.coords.longitude}`;
          await FileSystem.writeAsStringAsync(newPath + '.txt', locationInfo);
          
          //return assetSaved.uri;
          return newPath;
        })
      );
      
      // Фильтруем пустые URI (если были отменены из-за темноты)
      const filteredUris = newPhotoUris.filter(uri => uri !== '');
      setPhotoUris([...photoUris, ...filteredUris]);
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
    setWorkTime('');
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
    buttonText: {
      color: colors.card,
      fontWeight: 'bold',
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Энергоинспектор</Text>
        </View>

        <Text style={styles.label}>🏙️ Населенный пункт:</Text>
        <TextInput
          style={styles.input}
          value={settlement}
          onChangeText={setSettlement}
          placeholder="Город/посёлок"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>🏘️ Улица:</Text>
        <TextInput
          style={styles.input}
          value={street}
          onChangeText={setStreet}
          placeholder="Улица"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>🏠 Дом:</Text>
        <TextInput
          style={styles.input}
          value={house}
          onChangeText={setHouse}
          placeholder="Дом"
          placeholderTextColor={colors.text}
          keyboardType="numeric"
        />

        <Text style={styles.label}>🏢 Квартира:</Text>
        <TextInput
          style={styles.input}
          value={apartment}
          onChangeText={setApartment}
          placeholder="Номер квартиры"
          placeholderTextColor={colors.text}
          keyboardType="numeric"
        />

        <Text style={styles.label}>🚪 Комната:</Text>
        <TextInput
          style={styles.input}
          value={room}
          onChangeText={setRoom}
          placeholder="Номер комнаты (если есть)"
          placeholderTextColor={colors.text}
          keyboardType="numeric"
        />

        <Text style={styles.label}>🔢 Тип и номер прибора учета:</Text>
        <TextInput
          style={styles.input}
          value={meterNumber}
          onChangeText={setMeterNumber}
          placeholder="Например: СЕ 102  №: 12501176862604"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>📅 Дата заявки:</Text>
        <TextInput
          style={styles.input}
          value={workDate}
          onChangeText={setWorkDate}
          placeholder="дд.мм.гггг"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>⏱️ Время работы:</Text>
        <TextInput
          style={styles.input}
          value={workTime}
          onChangeText={setWorkTime}
          placeholder="Например: 14:00-15:30"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>⚙️ Вид работы:</Text>
        <Picker
          selectedValue={workType}
          onValueChange={(value) => {
            setWorkType(value);
            setWorkResult(''); // Сброс при смене типа работы
          }}
          style={{ color: colors.text, backgroundColor: colors.card }}
        >
          <Picker.Item label="Выберите вид работы" value="" />
          {workTypes.map((type) => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>

        <Text style={styles.label}>✅ Результат работы:</Text>
        <Picker
          selectedValue={workResult}
          onValueChange={setWorkResult}
          style={{ color: colors.text, backgroundColor: colors.card }}
          enabled={!!workType}
        >
          <Picker.Item label="Выберите результат" value="" />
          {workResultsMap[workType]?.map((result) => (
            <Picker.Item key={result} label={result} value={result} />
          ))}
        </Picker>

        <Text style={styles.label}>👤 ФИО инспектора 1:</Text>
        <TextInput
          style={styles.input}
          value={inspector1}
          onChangeText={setInspector1}
          placeholder="Иванов И.И."
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>👤 ФИО инспектора 2:</Text>
        <TextInput
          style={styles.input}
          value={inspector2}
          onChangeText={setInspector2}
          placeholder="Петров П.П. (если есть)"
          placeholderTextColor={colors.text}
        />

        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>
            <Ionicons name="camera" size={16} color={colors.card} /> Сделать фото
          </Text>
        </TouchableOpacity>

        {photoUris.length > 0 && (
          <View style={styles.imageContainer}>
            {photoUris.map((uri, index) => (
              <Image key={index} source={{ uri }} style={styles.image} />
            ))}
          </View>
        )}

        <View style={styles.separator} />

        <TouchableOpacity style={styles.button} onPress={submitEntry}>
          <Text style={styles.buttonText}>
            <Ionicons name="save" size={16} color={colors.card} /> Сохранить запись
          </Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.button} onPress={generateXLSXReport}>
          <Text style={styles.buttonText}>
            <Ionicons name="document-text" size={16} color={colors.card} /> Сформировать XLSX отчёт
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}