import {
  IconChartLine,
  IconKey,
  IconLayoutGrid,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconStarFilled,
  IconTrash,
  IconX,
} from "@tabler/icons-react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import type { Conversation } from "@honestea/shared";

import { ActionSheet } from "@/components/ui/action-sheet";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { RenameDialog } from "@/components/ui/rename-dialog";
import { cn } from "@/lib/cn";
import { useConfirm } from "@/lib/confirm-context";
import { useConversations } from "@/lib/conversations-context";
import { listMessages, renameConversation, searchConversations } from "@/lib/db/repository";
import { useSelectedModel } from "@/lib/model";
import { generateTitle } from "@/lib/chat";
import { TYPE_EYEBROW } from "@/lib/typography";

export interface SidebarProps {
  onClose: () => void
}

/**
 * App drawer. Sections, top to bottom:
 *  • Brand header — logo + wordmark.
 *  • Matcha "New chat" pill — primary CTA, brand-leading.
 *  • Search + "Recent" eyebrow + conversation list.
 *  • Footer quick-link grid: Models · API Keys · Usage · Settings.
 *
 * Footer entries are stacked icon-text rows rather than chevron rows so
 * the sidebar feels like a dock of tools, not a settings list.
 */
export function Sidebar({ onClose }: SidebarProps) {
  const { conversations, currentId, refresh, startNew, select, remove } =
    useConversations();
  const { modelId } = useSelectedModel();
  const confirm = useConfirm();
  const dark = useColorScheme() === "dark";
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [actionsTarget, setActionsTarget] = useState<Conversation | null>(null);
  const [query, setQuery] = useState("");
  const [resultIds, setResultIds] = useState<string[]>([]);

  // Debounced FTS5 search — 150ms feels instant without thrashing.
  // The empty-query clear also runs inside the timeout so no state is
  // written synchronously during the effect.
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (!q) {
        setResultIds([]);
        return;
      }
      void searchConversations(q).then(setResultIds).catch(() => setResultIds([]));
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const displayConversations = useMemo(() => {
    if (!query.trim()) return conversations;
    const order = new Map(resultIds.map((id, i) => [id, i]));
    const filtered = conversations.filter((c) => order.has(c.id));
    filtered.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return filtered;
  }, [conversations, resultIds, query]);

  const isSearching = query.trim().length > 0;

  // Refresh the conversation list when the drawer opens.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const goTo = (path: string) => {
    onClose();
    router.push(path as never);
  };

  const handleNewChat = async () => {
    await startNew(modelId);
    onClose();
    // Bounce back to chat — without this, tapping "New chat" from
    // /settings or /models just changes the conversation context but
    // leaves the user on the wrong screen.
    router.dismissTo("/");
  };

  const handleSelect = (id: string) => {
    select(id);
    onClose();
    // Same: ensure the chat screen is what's actually visible after a
    // pick from the sidebar, regardless of which screen the user
    // opened the sidebar from.
    router.dismissTo("/");
  };

  const confirmDelete = async (convo: Conversation) => {
    const ok = await confirm({
      title: "Delete chat?",
      message: convo.title ?? "New chat",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) await remove(convo.id);
  };

  const regenerateTitle = async (convo: Conversation) => {
    const msgs = await listMessages(convo.id);
    const firstUser = msgs.find((m) => m.role === "user");
    const firstAssistant = msgs.find(
      (m) => m.role === "assistant" && m.status === "complete",
    );
    if (!firstUser || !firstAssistant) {
      Toast.show({ type: "error", text1: "Send a message first" });
      return;
    }
    const title = await generateTitle({
      userMessage: firstUser.content,
      assistantResponse: firstAssistant.content,
      titleModel: modelId,
    });
    if (!title) {
      Toast.show({ type: "error", text1: "Title generation failed" });
      return;
    }
    await renameConversation(convo.id, title);
    await refresh();
    Toast.show({ type: "success", text1: "Title regenerated" });
  };

  const submitRename = async (id: string, next: string) => {
    setRenameTarget(null);
    const trimmed = next.trim();
    if (!trimmed) return;
    await renameConversation(id, trimmed);
    await refresh();
  };

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-chamomile-900"
      edges={["top", "bottom"]}
    >
      <View className="flex-1 px-3 py-3">
        <View className="mb-5 flex-row items-center gap-2.5 px-1">
          <LogoMark size={32} />
          <Wordmark size={20} />
        </View>

        <Pressable
          onPress={handleNewChat}
          className="mb-5 flex-row items-center justify-center gap-2 rounded-2xl bg-matcha-600 py-3 active:opacity-90 dark:bg-matcha-500"
        >
          <IconPlus size={16} color="#ffffff" strokeWidth={2.5} />
          <Text className="text-[14.5px] font-semibold text-white">
            New chat
          </Text>
        </Pressable>

        {/* ── Search ── */}
        <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <IconSearch
            size={16}
            color={dark ? "#a1a1aa" : "#71717a"}
            strokeWidth={2}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations…"
            placeholderTextColor={dark ? "#71717a" : "#a1a1aa"}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            className="flex-1 text-[14px] text-zinc-900 dark:text-zinc-100"
            style={{ paddingVertical: 0 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <IconX
                size={16}
                color={dark ? "#a1a1aa" : "#71717a"}
                strokeWidth={2}
              />
            </Pressable>
          )}
        </View>

        <View className="mb-2 flex-row items-center px-2">
          <Text
            className="text-zinc-500 dark:text-zinc-400"
            style={TYPE_EYEBROW}
          >
            {isSearching ? "Results" : "Recent"}
          </Text>
        </View>

        {displayConversations.length === 0 ? (
          <View className="flex-1 items-center justify-center px-2">
            <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              {isSearching
                ? `No conversations match "${query.trim()}".`
                : "No conversations yet. Tap New chat to start one."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayConversations}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <ConversationRow
                convo={item}
                active={item.id === currentId}
                onPress={() => handleSelect(item.id)}
                onLongPress={() => setActionsTarget(item)}
              />
            )}
            contentContainerClassName="gap-1 pb-4"
          />
        )}

        <View className="border-t border-chamomile-100 pt-2.5 dark:border-zinc-800">
          <FooterLink
            Icon={IconLayoutGrid}
            label="Models"
            onPress={() => goTo("/model-browser")}
          />
          <FooterLink
            Icon={IconKey}
            label="API Keys"
            onPress={() => goTo("/byok")}
          />
          <FooterLink
            Icon={IconChartLine}
            label="Usage"
            onPress={() => goTo("/settings/usage")}
          />
          <FooterLink
            Icon={IconSettings}
            label="Settings"
            onPress={() => goTo("/settings")}
          />
          <Text
            className="mt-2 px-3 text-zinc-400 dark:text-zinc-600"
            style={{ fontSize: 10, fontWeight: "500" }}
          >
            v0.1.0
          </Text>
        </View>
      </View>

      <ActionSheet
        open={actionsTarget !== null}
        title={actionsTarget?.title ?? "New chat"}
        onClose={() => setActionsTarget(null)}
        actions={
          actionsTarget
            ? [
                {
                  label: "Rename",
                  icon: IconPencil,
                  onPress: () => setRenameTarget(actionsTarget),
                },
                {
                  label: "Regenerate title",
                  icon: IconRefresh,
                  onPress: () => {
                    void regenerateTitle(actionsTarget);
                  },
                },
                {
                  label: "Delete",
                  icon: IconTrash,
                  destructive: true,
                  onPress: () => {
                    void confirmDelete(actionsTarget);
                  },
                },
              ]
            : []
        }
      />

      <RenameDialog
        initial={
          renameTarget
            ? { id: renameTarget.id, title: renameTarget.title }
            : null
        }
        onCancel={() => setRenameTarget(null)}
        onSubmit={submitRename}
      />
    </SafeAreaView>
  );
}

/**
 * Footer quick-link row — icon + label + subtle press feedback. Sits in
 * the bottom dock alongside Models / API Keys / Usage / Settings. Visually
 * lighter than a normal nav row so the conversation list stays the
 * primary focus.
 */
function FooterLink({
  Icon: IconCmp,
  label,
  onPress,
}: {
  Icon: typeof IconSettings;
  label: string;
  onPress: () => void;
}) {
  const dark = useColorScheme() === "dark";
  const tint = dark ? "#a1a1aa" : "#52525b";
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-3 py-2 active:bg-chamomile-100 dark:active:bg-zinc-900"
    >
      <IconCmp size={18} color={tint} strokeWidth={1.75} />
      <Text className="text-[14px] text-zinc-700 dark:text-zinc-300">
        {label}
      </Text>
    </Pressable>
  );
}

function ConversationRow({
  convo,
  active,
  onPress,
  onLongPress,
}: {
  convo: Conversation;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const dark = useColorScheme() === "dark";
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className={cn(
        "flex-row items-center gap-2 rounded-xl px-2.5 py-2.5 active:bg-chamomile-100 dark:active:bg-zinc-900",
        active && "bg-matcha-500/10 dark:bg-matcha-400/15",
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(
          "flex-1 text-[14px]",
          active
            ? "font-medium text-matcha-800 dark:text-matcha-200"
            : "text-zinc-900 dark:text-zinc-100",
        )}
      >
        {convo.title ?? "New chat"}
      </Text>
      {convo.starred && (
        <IconStarFilled size={13} color={dark ? "#facc15" : "#eab308"} />
      )}
    </Pressable>
  );
}
