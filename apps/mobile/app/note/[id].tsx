import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { notesService } from '../../services/api';
import { useTheme } from '../../constants/theme';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const t = useTheme();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const contentRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isNew) return;
    notesService.get(id).then(({ data }) => {
      setTitle(data.title ?? '');
      setContent(data.content ?? '');
      setLoading(false);
    });
  }, [id, isNew]);

  const save = async () => {
    if (!content.trim() && !title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await notesService.create(title.trim() || null, content);
      } else {
        await notesService.update(id, title.trim() || null, content);
      }
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a nota.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Excluir nota',
      'Tem certeza? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await notesService.delete(id);
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={'height'}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: t.primary }]}>← Voltar</Text>
        </Pressable>

        <View style={styles.headerActions}>
          {!isNew && (
            <Pressable onPress={confirmDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Excluir</Text>
            </Pressable>
          )}
          <Pressable
            onPress={save}
            disabled={saving}
            style={[
              styles.saveButton,
              { backgroundColor: t.primary, opacity: saving ? 0.5 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#F3F4F4" size="small" />
            ) : (
              <Text style={styles.saveText}>Salvar</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Editor */}
      <View style={styles.editor}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Título"
          placeholderTextColor={t.textMuted}
          returnKeyType="next"
          onSubmitEditing={() => contentRef.current?.focus()}
          style={[styles.titleInput, { color: t.text }]}
        />

        <TextInput
          ref={contentRef}
          value={content}
          onChangeText={setContent}
          placeholder="Escreva sua nota..."
          placeholderTextColor={t.textMuted}
          multiline
          autoFocus={isNew}
          textAlignVertical="top"
          style={[styles.contentInput, { color: t.text }]}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    color: '#e53e3e',
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 7,
    minWidth: 64,
    alignItems: 'center',
  },
  saveText: {
    color: '#F3F4F4',
    fontWeight: '600',
    fontSize: 14,
  },
  editor: {
    flex: 1,
    padding: 20,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  contentInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
  },
});
