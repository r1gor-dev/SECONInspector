import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useDatabase } from '../../database/dbcontext';

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { dbOps, initialized } = useDatabase();
  const [name, setName] = useState('');
  const [inspectors, setInspectors] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (initialized && dbOps) {
        try {
          const data = await dbOps.getInspectors();
          setInspectors(data || []);
          setLoading(false);
        } catch (error) {
          console.error('Failed to load inspectors:', error);
          setLoading(false);
        }
      }
    };

    fetchData();
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
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
      marginTop: 40,
      fontWeight: 'bold',
      marginBottom: 20,
      color: colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (!initialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text }}>Загрузка данных...</Text>
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

      <Button 
        title="Добавить инспектора" 
        onPress={handleAddInspector} 
      />

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
    </View>
  );
}