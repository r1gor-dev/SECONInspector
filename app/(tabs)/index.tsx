import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';

type Entry = {
  address: string;
  meterReading: string;
  actionType: string;
  comments: string;
  photoUri: string | null;
  timestamp: string;
};



export default function App() {
  const {colors} = useTheme();
  const [address, setAddress] = useState('');
  const [meterReading, setMeterReading] = useState('');
  const [actionType, setActionType] = useState('');
  const [comments, setComments] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужно разрешение на доступ к камере!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${address}_${timestamp}.jpg`;
      const newPath = FileSystem.documentDirectory + filename;
      await FileSystem.copyAsync({ from: uri, to: newPath });
      setPhotoUri(newPath);
    }
  };

  const submitEntry = () => {
    if (!address || !meterReading || !actionType) {
      Alert.alert('Заполни все обязательные поля.');
      return;
    }

    const timestamp = new Date().toISOString();
    const newEntry = {
      address,
      meterReading,
      actionType,
      comments,
      photoUri,
      timestamp
    };

    setEntries((prevEntries) => [...prevEntries, newEntry]);
    resetForm();
    Alert.alert('Запись сохранена!');
  };

  const resetForm = () => {
    setAddress('');
    setMeterReading('');
    setActionType('');
    setComments('');
    setPhotoUri(null);
  };

  const generateReport = async () => {
    if(entries.length===0){
      Alert.alert('Нет записи для отчёта :(');
      return;
    }
    const lastEntry = entries[entries.length - 1]; 

    const clean = (str:string) =>
      str.replace(/[^wa-яА-Я0-9]/gi, '_').substring(0,30);

    const fileName = `${clean(lastEntry.address)}_${clean(lastEntry.actionType)}_${clean(lastEntry.meterReading)}.txt`;
    const fileUri = FileSystem.documentDirectory + fileName;

    const report = entries.map((e, i) =>
      `${i + 1}. ${e.timestamp} | ${e.address} | ${e.actionType} | ${e.meterReading} | ${e.comments}`
    ).join('\n');


    await FileSystem.writeAsStringAsync(fileUri, report);
    await Sharing.shareAsync(fileUri);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.background,
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Энергоинспектор</Text>
      </View>

      <Text style={styles.label}>🏠 Адрес:</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Введите адрес"
        placeholderTextColor={colors.text}
      />

      <Text style={styles.label}>🔢 Показания прибора:</Text>
      <TextInput
        style={styles.input}
        value={meterReading}
        onChangeText={setMeterReading}
        placeholder="000000"
        placeholderTextColor={colors.text}
        keyboardType="numeric"
      />

      <Text style={styles.label}>⚙️ Тип действия:</Text>
      <TextInput
        style={styles.input}
        value={actionType}
        onChangeText={setActionType}
        placeholder="ограничение / возобновление"
        placeholderTextColor={colors.text}
      />

      <Text style={styles.label}>💬 Комментарии:</Text>
      <TextInput
        style={[styles.input, { height: 60 }]}
        value={comments}
        onChangeText={setComments}
        multiline
        placeholder="Замечания, уточнения..."
        placeholderTextColor={colors.text}
      />

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>
          <Ionicons name="camera" size={16} color={colors.card} /> Сделать фото
        </Text>
      </TouchableOpacity>

      {photoUri && <Image source={{ uri: photoUri }} style={styles.image} />}

      <View style={styles.separator} />
      
      <TouchableOpacity style={styles.button} onPress={submitEntry}>
        <Text style={styles.buttonText}>
          <Ionicons name="save" size={16} color={colors.card} /> Сохранить запись
        </Text>
      </TouchableOpacity>

      <View style={styles.separator} />
      
      <TouchableOpacity style={styles.button} onPress={generateReport}>
        <Text style={styles.buttonText}>
          <Ionicons name="document-text" size={16} color={colors.card} /> Сформировать отчёт
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


