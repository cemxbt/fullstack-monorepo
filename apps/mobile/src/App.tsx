import {
  CreateTaskInput,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  Task,
  TaskStatus,
} from '@starter/contracts';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api } from './api';

const nextStatus = (status: TaskStatus): TaskStatus =>
  TASK_STATUSES[(TASK_STATUSES.indexOf(status) + 1) % TASK_STATUSES.length]!;

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export default function App() {
  return (
    <SafeAreaProvider>
      <TaskScreen />
    </SafeAreaProvider>
  );
}

function TaskScreen() {
  const dark = useColorScheme() === 'dark';
  const colors = dark ? darkColors : lightColors;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await api.tasks.list());
      setError(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTask() {
    const parsed = CreateTaskInput.safeParse({ title });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid task');
      return;
    }
    try {
      const task = await api.tasks.create(parsed.data);
      setTasks((list) => [task, ...list]);
      setTitle('');
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }

  async function advance(task: Task) {
    const status = nextStatus(task.status);
    const previous = tasks;
    setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await api.tasks.update(task.id, { status });
    } catch (e) {
      setTasks(previous);
      setError(message(e));
    }
  }

  async function remove(task: Task) {
    const previous = tasks;
    setTasks((list) => list.filter((t) => t.id !== task.id));
    try {
      await api.tasks.remove(task.id);
    } catch (e) {
      setTasks(previous);
      setError(message(e));
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Text style={[styles.heading, { color: colors.text }]}>Task Board</Text>

      <View style={styles.row}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={addTask}
          placeholder="What needs doing?"
          placeholderTextColor={colors.muted}
          maxLength={120}
          returnKeyType="done"
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
        <Pressable onPress={addTask} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>

      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => task.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>No tasks yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <View style={styles.cardActions}>
                <Pressable onPress={() => advance(item)} accessibilityRole="button">
                  <Text style={{ color: colors.accent }}>{TASK_STATUS_LABELS[item.status]} →</Text>
                </Pressable>
                <Pressable onPress={() => remove(item)} accessibilityRole="button">
                  <Text style={{ color: colors.danger }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const lightColors = {
  bg: '#f6f7f9',
  text: '#16181d',
  muted: '#667085',
  border: '#e4e7ec',
  accent: '#2563eb',
  danger: '#b42318',
};

const darkColors = {
  bg: '#0f1115',
  text: '#e6e8ec',
  muted: '#98a2b3',
  border: '#2a2f37',
  accent: '#60a5fa',
  danger: '#f97066',
};

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  heading: { fontSize: 28, fontWeight: '700', marginVertical: 16 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  button: { borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { marginBottom: 12 },
  loader: { marginTop: 32 },
  empty: { textAlign: 'center', marginTop: 32 },
  card: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  cardTitle: { fontSize: 16, marginBottom: 8 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
