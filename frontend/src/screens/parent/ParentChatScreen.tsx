import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Pressable,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Msg = {
  _id: string;
  content: string;
  senderRole: "parent" | "teacher" | string;
  createdAt?: string;
};

export default function ParentChatScreen() {
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const oldestCursorRef = useRef<string | undefined>(undefined);
  const listRef = useRef<FlatList<Msg>>(null);
  const prependLockRef = useRef(false);

  const boot = async () => {
    try {
      const th = await axiosClient.post("/conversations/thread/init", {});
      setThread(th.data);
      await initialLoad(th.data._id);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không mở được hội thoại"
      );
    }
  };

  const initialLoad = async (id?: string) => {
    setLoading(true);
    try {
      const tid = id || thread._id;
      const r = await axiosClient.get(`/conversations/${tid}/messages`);
      const fetchedDesc: Msg[] = r.data || [];
      const fetchedAsc = [...fetchedDesc].reverse();
      setMessages(fetchedAsc);
      if (fetchedDesc.length) {
        oldestCursorRef.current = fetchedDesc[fetchedDesc.length - 1]._id;
      }

      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: false })
      );
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được tin nhắn"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOlder = async () => {
    if (!thread || !oldestCursorRef.current) return;
    setLoadingOlder(true);
    try {
      const url = `/conversations/${thread._id}/messages?cursor=${oldestCursorRef.current}`;
      const r = await axiosClient.get(url);
      const fetchedAsc: Msg[] = [...(r.data || [])].reverse();
      if (fetchedAsc.length === 0) return;
      prependLockRef.current = true;
      setMessages((prev) => [...fetchedAsc, ...prev]);
      oldestCursorRef.current = r.data[r.data.length - 1]._id;

      setTimeout(() => (prependLockRef.current = false), 300);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải thêm được tin cũ"
      );
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const content = text.trim();
    if (!content || !thread) return;
    try {
      const tempId = `temp_${Date.now()}`;
      const optimistic: Msg = {
        _id: tempId,
        content,
        senderRole: "parent",
        createdAt: new Date().toISOString(),
      };
      setText("");
      setMessages((prev) => [...prev, optimistic]);
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true })
      );

      const msg = await axiosClient.post(
        `/conversations/${thread._id}/messages`,
        { content }
      );

      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...msg.data } : m))
      );
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Gửi thất bại");
    }
  };

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (prependLockRef.current) return;
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true })
    );
  }, [messages.length]);

  const humanTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch {}
    return "";
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const mine = item.senderRole === "parent";
    return (
      <View
        style={[
          styles.row,
          { justifyContent: mine ? "flex-end" : "flex-start" },
        ]}
      >
        {!mine && (
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color="#0b3d2e" />
          </View>
        )}
        <View
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
        >
          <Text
            style={[
              styles.sender,
              mine ? styles.senderMine : styles.senderOther,
            ]}
          >
            {mine ? "Bạn" : "Giáo viên"}
          </Text>
          <Text style={styles.content}>{item.content}</Text>
          {!!item.createdAt && (
            <Text style={styles.time}>{humanTime(item.createdAt)}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#eef7ff", "#f8fffb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trao đổi với giáo viên</Text>
          <Pressable
            onPress={loadOlder}
            disabled={loading || loadingOlder || !thread}
            style={({ pressed }) => [
              styles.loadMoreBtn,
              (loading || loadingOlder || !thread) && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="download-outline" size={16} color="#0b3d2e" />
            <Text style={styles.loadMoreText}>Tải tin cũ</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 8,
            paddingTop: 6,
          }}
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={loadingOlder}
              onRefresh={loadOlder}
              tintColor="#0b3d2e"
            />
          }
          onContentSizeChange={() => {
            if (!prependLockRef.current) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#64748b"
            />
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#94a3b8"
              multiline
            />
            {text.trim().length > 0 && (
              <Pressable onPress={() => setText("")} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={send}
            disabled={!thread || text.trim().length === 0}
            style={({ pressed }) => [
              styles.sendBtn,
              (!thread || text.trim().length === 0) && { opacity: 0.5 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0b3d2e",
    letterSpacing: 0.2,
  },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  loadMoreText: { fontWeight: "700", color: "#0b3d2e" },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(147,197,253,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  bubble: {
    maxWidth: "82%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  bubbleMine: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.3)",
  },
  bubbleOther: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: "rgba(0,0,0,0.06)",
  },
  sender: { fontSize: 11, marginBottom: 2 },
  senderMine: { color: "#065f46", fontWeight: "700" },
  senderOther: { color: "#334155", fontWeight: "700" },
  content: { color: "#0f172a" },
  time: { color: "#64748b", fontSize: 10, marginTop: 4, alignSelf: "flex-end" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 16 : 10,
  },
  inputWrap: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: { flex: 1, color: "#0f172a" },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5a4",
    shadowColor: "#0ea5a4",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
