import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { notesService } from '../services/api';
import { useTheme } from '../constants/theme';

interface Note {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function preview(content: string) {
  return content.replace(/\n+/g, ' ').trim().slice(0, 100);
}

export default function Notes() {
  const { logout } = useAuth();
  const t = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotes = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await notesService.list();
      setNotes(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotes(true);
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.logo, { color: t.text }]}>notin</Text>
        <Pressable onPress={logout}>
          <Text style={[styles.logout, { color: t.textMuted }]}>Sair</Text>
        </Pressable>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notes.length === 0 && styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotes(true);
              }}
              tintColor={t.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/note/${item.id}`)}
              style={({ pressed }) => [
                styles.noteItem,
                {
                  backgroundColor: t.surface,
                  borderBottomColor: t.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.noteRow}>
                <Text
                  style={[styles.noteTitle, { color: t.text }]}
                  numberOfLines={1}
                >
                  {item.title ?? 'Sem título'}
                </Text>
                <Text style={[styles.noteDate, { color: t.textMuted }]}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              {item.content ? (
                <Text
                  style={[styles.notePreview, { color: t.textMuted }]}
                  numberOfLines={1}
                >
                  {preview(item.content)}
                </Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: t.textMuted }]}>
                Nenhuma nota ainda
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        onPress={() => router.push('/note/new')}
        style={[styles.fab, { backgroundColor: t.primary }]}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  logout: {
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
  },
  noteItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  noteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  noteDate: {
    fontSize: 12,
  },
  notePreview: {
    fontSize: 13,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: {
    color: '#F3F4F4',
    fontSize: 28,
    lineHeight: 32,
  },
});
