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

type Entry = {
  settlement: string;
  street: string;
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

  const pickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужно разрешение на доступ к камере!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsMultipleSelection: true });
    if (!result.canceled && result.assets?.length) {
      const newPhotoUris = await Promise.all(
        result.assets.map(async (asset) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `photo_${timestamp}.jpg`;
          const newPath = FileSystem.documentDirectory + filename;
          await FileSystem.copyAsync({ from: asset.uri, to: newPath });
          return newPath;
        })
      );
      setPhotoUris([...photoUris, ...newPhotoUris]);
    }
  };

  const submitEntry = () => {
    if (!settlement || !street || !apartment || !meterNumber) {
      Alert.alert('Заполните обязательные поля (Населённый пункт, Улица, Квартира, Номер прибора)');
      return;
    }

    const timestamp = new Date().toISOString();
    const newEntry = {
      settlement,
      street,
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
        'Квартира',
        'Комната',
        'Тип и номер прибора учета',
        'Дата заявки',
        'Время работы',
        'Вид работы',
        'Результат работы',
        'ФИО инспектора 1',
        'ФИО инспектора 2',
        'Кол-во фото'
      ],
      ...entries.map((entry, index) => [
        index + 1,
        entry.settlement,
        entry.street,
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

        <Text style={styles.label}>🏠 Населенный пункт:</Text>
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
          placeholder="Улица, дом"
          placeholderTextColor={colors.text}
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
        />

        <Text style={styles.label}>🔢 Тип и номер прибора учета:</Text>
        <TextInput
          style={styles.input}
          value={meterNumber}
          onChangeText={setMeterNumber}
          placeholder="Например: СЭТ-4-1 123456"
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
        <TextInput
          style={styles.input}
          value={workType}
          onChangeText={setWorkType}
          placeholder="Ограничение/возобновление/проверка"
          placeholderTextColor={colors.text}
        />

        <Text style={styles.label}>✅ Результат работы:</Text>
        <TextInput
          style={styles.input}
          value={workResult}
          onChangeText={setWorkResult}
          placeholder="Результат выполненных работ"
          placeholderTextColor={colors.text}
        />

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
