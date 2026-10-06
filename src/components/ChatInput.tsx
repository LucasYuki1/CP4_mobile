import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_MESSAGE_LENGTH } from '../services/chatService';
import { colors, radius, spacing, typography } from '../theme';
import type { MessageTarget } from '../types/chat';
import type { OutgoingMessage } from '../hooks/useChat';

export type MentionCandidate = { uid: string; name: string };

export type ChatInputProps = {
  onSend: (message: OutgoingMessage) => Promise<boolean>;
  sending: boolean;
  disabled?: boolean;
  /** Integrantes que podem ser mencionados (vazio na conversa individual). */
  candidates: MentionCandidate[];
  /** Destinatario fixo da conversa individual. */
  directRecipientId?: string;
};

/**
 * Campo de mensagem. Em grupos, o botao @ abre a lista de integrantes:
 * nenhum selecionado = mensagem geral; um = mensagem direcionada a ele;
 * varios = mensagem geral com mencoes. Digitar @Nome tambem conta como mencao.
 */
export function ChatInput({
  onSend,
  sending,
  disabled = false,
  candidates,
  directRecipientId,
}: ChatInputProps): React.JSX.Element {
  const [text, setText] = useState<string>('');
  const [selected, setSelected] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const typedMentions = useMemo<string[]>(() => {
    const lower = text.toLocaleLowerCase('pt-BR');
    return candidates
      .filter((candidate) => {
        const firstName = candidate.name.split(' ')[0] ?? candidate.name;
        return lower.includes(`@${firstName.toLocaleLowerCase('pt-BR')}`);
      })
      .map((candidate) => candidate.uid);
  }, [text, candidates]);

  const mentionedUserIds = useMemo<string[]>(
    () => Array.from(new Set([...selected, ...typedMentions])),
    [selected, typedMentions],
  );

  const target = useMemo<MessageTarget>(() => {
    if (directRecipientId) return { type: 'member', memberId: directRecipientId };
    const [only] = selected;
    return selected.length === 1 && only ? { type: 'member', memberId: only } : { type: 'conversation' };
  }, [directRecipientId, selected]);

  const selectedNames = useMemo(
    () =>
      candidates
        .filter((candidate) => selected.includes(candidate.uid))
        .map((candidate) => candidate.name),
    [candidates, selected],
  );

  const canSend = text.trim().length > 0 && !sending && !disabled;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const delivered = await onSend({ text, target, mentionedUserIds });
    // O rascunho so e limpo se o Realtime Database confirmou a gravacao.
    if (delivered) {
      setText('');
      setSelected([]);
    }
  }, [canSend, onSend, text, target, mentionedUserIds]);

  const toggle = useCallback((uid: string) => {
    setSelected((previous) =>
      previous.includes(uid) ? previous.filter((item) => item !== uid) : [...previous, uid],
    );
  }, []);

  const closePicker = useCallback(() => setPickerOpen(false), []);
  const openPicker = useCallback(() => setPickerOpen(true), []);

  return (
    <View style={styles.wrapper}>
      {selectedNames.length > 0 ? (
        <Text style={styles.recipients} numberOfLines={1}>
          {selectedNames.length === 1 ? 'Para: ' : 'Mencionando: '}
          {selectedNames.join(', ')}
        </Text>
      ) : null}
      <View style={styles.container}>
        {candidates.length > 0 ? (
          <Pressable
            onPress={openPicker}
            accessibilityRole="button"
            accessibilityLabel="Selecionar ou mencionar integrante"
            style={[styles.mentionButton, selected.length > 0 ? styles.mentionActive : null]}
          >
            <Text style={styles.mentionLabel}>@</Text>
          </Pressable>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Voce nao pode enviar mensagens aqui' : 'Escreva uma mensagem'}
          placeholderTextColor={colors.muted}
          style={styles.input}
          editable={!disabled}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          accessibilityLabel="Campo de mensagem"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          style={({ pressed }) => [
            styles.button,
            !canSend ? styles.buttonBlocked : null,
            pressed && canSend ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.buttonLabel}>{sending ? '...' : 'Enviar'}</Text>
        </Pressable>
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={closePicker}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Destinatarios</Text>
            <Text style={styles.sheetHint}>
              Nenhum: mensagem geral. Um: mensagem direcionada. Varios: mencoes.
            </Text>
            <FlatList
              data={candidates}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => {
                const active = selected.includes(item.uid);
                return (
                  <Pressable
                    onPress={() => toggle(item.uid)}
                    style={[styles.option, active ? styles.optionActive : null]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={styles.optionLabel}>{item.name}</Text>
                    <Text style={styles.optionCheck}>{active ? '✓' : ''}</Text>
                  </Pressable>
                );
              }}
            />
            <Pressable onPress={closePicker} style={styles.done} accessibilityRole="button">
              <Text style={styles.buttonLabel}>Concluir</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hairline },
  recipients: {
    ...typography.caption,
    color: colors.group,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md },
  mentionButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionActive: { backgroundColor: colors.groupSoft },
  mentionLabel: { ...typography.subtitle, color: colors.group },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    ...typography.body,
    color: colors.ink,
  },
  button: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBlocked: { opacity: 0.4 },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { ...typography.eyebrow, color: colors.surface },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: { ...typography.subtitle, color: colors.ink },
  sheetHint: { ...typography.caption, color: colors.muted },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  optionActive: { backgroundColor: colors.groupSoft },
  optionLabel: { ...typography.body, color: colors.ink },
  optionCheck: { ...typography.subtitle, color: colors.group },
  done: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
