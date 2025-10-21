import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Animated,
  Keyboard,
} from "react-native";
import axiosClient from "../../api/axiosClient";
import { useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get("window");

const UI = {
  padX: 20,
  glass: "rgba(255,255,255,0.9)",
  glassDark: "rgba(255,255,255,0.95)",
  border: "rgba(0,0,0,0.05)",
  borderLight: "rgba(255,255,255,0.3)",
  radius: 16,
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shadowMedium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  shadowStrong: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

type Msg = {
  _id: string;
  content: string;
  senderRole: "teacher" | "parent" | string;
  createdAt?: string;
  timestamp?: string;
};

function fmtTime(s?: string) {
  try {
    const d = s ? new Date(s) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—:—";
  }
}

function isSameDay(a?: string, b?: string) {
  if (!a || !b) return false;
  const da = new Date(a),
    db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dateChipLabel(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (x: Date, y: Date) =>
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate();
  if (same(dt, today)) return "Hôm nay";
  if (same(dt, yest)) return "Hôm qua";
  return dt.toLocaleDateString();
}

export default function TeacherChatDetailScreen() {
  const route = useRoute<any>();
  const threadId = (route.params as any)?.threadId as string;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const oldestCursorRef = useRef<string | undefined>(undefined);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [atBottom, setAtBottom] = useState(true);
  const inputTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      Animated.spring(inputTranslateY, {
        toValue: -e.endCoordinates.height + insets.bottom,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      Animated.spring(inputTranslateY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, [insets.bottom]);

  const initialLoad = async () => {
    setLoading(true);
    try {
      const r = await axiosClient.get(`/conversations/${threadId}/messages`);
      const fetchedAsc: Msg[] = [...r.data].reverse();
      setMessages(fetchedAsc);
      if (r.data.length)
        oldestCursorRef.current = r.data[r.data.length - 1]._id;
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: false })
      );
      setAtBottom(true);
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải được tin nhắn"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialLoad();
  }, [threadId]);

  const loadOlder = async () => {
    if (!oldestCursorRef.current) return;
    setLoading(true);
    try {
      const url = `/conversations/${threadId}/messages?cursor=${oldestCursorRef.current}`;
      const r = await axiosClient.get(url);
      const fetchedAsc: Msg[] = [...r.data].reverse();
      setMessages((prev) => [...fetchedAsc, ...prev]);
      if (r.data.length)
        oldestCursorRef.current = r.data[r.data.length - 1]._id;
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message || "Không tải thêm được tin cũ"
      );
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    try {
      const content = text.trim();
      if (!content) return;
      const msg = await axiosClient.post(
        `/conversations/${threadId}/messages`,
        { content }
      );
      setText("");
      setMessages((prev) => [...prev, msg.data]);
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true })
      );
      setAtBottom(true);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.message || "Gửi thất bại");
    }
  };

  type Pos = "single" | "first" | "middle" | "last";
  const calcPos = (idx: number): Pos => {
    const cur = messages[idx];
    const prev = messages[idx - 1];
    const next = messages[idx + 1];
    const samePrev =
      prev &&
      prev.senderRole === cur.senderRole &&
      isSameDay(
        prev.createdAt || prev.timestamp,
        cur.createdAt || cur.timestamp
      );
    const sameNext =
      next &&
      next.senderRole === cur.senderRole &&
      isSameDay(
        next.createdAt || next.timestamp,
        cur.createdAt || cur.timestamp
      );
    if (!samePrev && !sameNext) return "single";
    if (!samePrev && sameNext) return "first";
    if (samePrev && sameNext) return "middle";
    return "last";
  };

  const showDateChip = (idx: number) => {
    if (idx === 0) return true;
    const a = messages[idx - 1],
      b = messages[idx];
    return !isSameDay(
      a?.createdAt || a?.timestamp,
      b?.createdAt || b?.timestamp
    );
  };

  const showAvatar = (idx: number) => {
    const cur = messages[idx];
    if (cur.senderRole === "teacher") return false;
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    const sameGroup =
      prev &&
      prev.senderRole === cur.senderRole &&
      isSameDay(
        prev.createdAt || prev.timestamp,
        cur.createdAt || cur.timestamp
      );
    return !sameGroup;
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setAtBottom(distanceFromBottom < 40);
  };

  const LoadOlderBtn = () => (
    <Pressable
      onPress={loadOlder}
      disabled={loading}
      style={[st.loadOlderBtn, loading && { opacity: 0.6 }]}
    >
      <View style={st.loadOlderContent}>
        <Ionicons
          name={loading ? "hourglass-outline" : "time-outline"}
          size={16}
          color="#059669"
        />
        <Text style={st.loadOlderText}>
          {loading ? "Đang tải..." : "Tải thêm tin cũ"}
        </Text>
      </View>
    </Pressable>
  );

  const DateChip = ({ d }: { d?: string }) => (
    <View style={st.dateChipWrap}>
      <View style={st.dateChip}>
        <Text style={st.dateChipText}>{dateChipLabel(d)}</Text>
      </View>
    </View>
  );

  const Bubble = ({ item, idx }: { item: Msg; idx: number }) => {
    const isTeacher = item.senderRole === "teacher";
    const pos = calcPos(idx);
    const time = fmtTime(item.createdAt || item.timestamp);

    const radius = UI.radius;
    const rightStyle =
      pos === "single"
        ? { borderRadius: radius }
        : pos === "first"
        ? {
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: radius,
            borderTopRightRadius: radius,
            borderBottomRightRadius: 4,
          }
        : pos === "middle"
        ? {
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: radius,
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
          }
        : {
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: radius,
            borderTopRightRadius: 4,
            borderBottomRightRadius: radius,
          };

    const leftStyle =
      pos === "single"
        ? { borderRadius: radius }
        : pos === "first"
        ? {
            borderTopRightRadius: radius,
            borderBottomRightRadius: radius,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: radius,
          }
        : pos === "middle"
        ? {
            borderTopRightRadius: radius,
            borderBottomRightRadius: radius,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
          }
        : {
            borderTopRightRadius: radius,
            borderBottomRightRadius: radius,
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: 4,
          };

    return (
      <View
        style={{ marginTop: showDateChip(idx) ? 12 : pos === "first" ? 6 : 1 }}
      >
        {showDateChip(idx) && <DateChip d={item.createdAt || item.timestamp} />}

        <View
          style={[
            st.row,
            isTeacher
              ? { justifyContent: "flex-end" }
              : { justifyContent: "flex-start" },
          ]}
        >
          {!isTeacher && showAvatar(idx) && (
            <View style={st.avatarDot}>
              <Ionicons name="person" size={14} color="#059669" />
            </View>
          )}

          <View style={{ maxWidth: screenWidth * 0.78 }}>
            {isTeacher ? (
              <LinearGradient
                colors={["#10b981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[st.bubble, st.teacherBubble, rightStyle]}
              >
                <Text style={st.bubbleRightText}>{item.content}</Text>
              </LinearGradient>
            ) : (
              <View style={[st.bubble, st.bubbleLeft, leftStyle]}>
                <Text style={st.bubbleLeftText}>{item.content}</Text>
              </View>
            )}

            <View
              style={[
                st.timeWrap,
                isTeacher
                  ? { alignSelf: "flex-end", marginRight: 2 }
                  : { alignSelf: "flex-start", marginLeft: 2 },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={10}
                color="#94a3b8"
                style={{ marginRight: 3 }}
              />
              <Text style={st.timeText}>{time}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const ScrollToBottom = () =>
    atBottom ? null : (
      <Pressable
        onPress={() => listRef.current?.scrollToEnd({ animated: true })}
        style={[st.toBottom, UI.shadowStrong]}
      >
        <LinearGradient
          colors={["#10b981", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.toBottomInner}
        >
          <Ionicons name="chevron-down" size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    );

  return (
    <LinearGradient
      colors={["#f0fdf4", "#dcfce7", "#bbf7d0"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />
      <SafeAreaView style={st.safe}>
        <LoadOlderBtn />

        <View
          style={[
            st.messagesContainer,
            { marginBottom: keyboardHeight > 0 ? 80 : 0 },
          ]}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(i) => i._id}
            renderItem={({ item, index }) => <Bubble item={item} idx={index} />}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              atBottom && listRef.current?.scrollToEnd({ animated: false })
            }
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={st.emptyContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color="#86efac"
                />
                <Text style={st.emptyText}>Chưa có tin nhắn nào</Text>
                <Text style={st.emptySubText}>Hãy bắt đầu cuộc trò chuyện</Text>
              </View>
            }
          />

          <ScrollToBottom />
        </View>

        {/* Floating Input Container */}
        <Animated.View
          style={[
            st.floatingInputContainer,
            {
              transform: [{ translateY: inputTranslateY }],
              bottom: Platform.OS === "ios" ? insets.bottom : 0,
            },
            UI.shadowStrong,
          ]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.98)", "rgba(255,255,255,0.95)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.inputBar}
          >
            <View style={st.inputWrap}>
              <TextInput
                style={st.input}
                value={text}
                onChangeText={setText}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={500}
                onFocus={() => {
                  setTimeout(() => {
                    listRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </View>

            <Pressable
              onPress={send}
              style={[st.sendBtn, UI.shadowMedium]}
              hitSlop={10}
              disabled={!text.trim()}
            >
              <LinearGradient
                colors={
                  text.trim() ? ["#10b981", "#059669"] : ["#d1d5db", "#9ca3af"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.sendInner}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: UI.padX,
    paddingTop: 10,
  },

  loadOlderBtn: {
    alignSelf: "center",
    marginBottom: 8,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
  },
  loadOlderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadOlderText: {
    fontWeight: "600",
    color: "#059669",
    fontSize: 13,
  },

  messagesContainer: {
    flex: 1,
  },

  dateChipWrap: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  dateChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
  },
  dateChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 2,
  },
  avatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadow,
  },

  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 1,
  },
  teacherBubble: {
    ...UI.shadowMedium,
  },
  bubbleLeft: {
    backgroundColor: UI.glass,
    borderWidth: 1,
    borderColor: UI.border,
    ...UI.shadowMedium,
  },
  bubbleLeftText: {
    color: "#1f2937",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bubbleRightText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    opacity: 0.8,
  },
  timeText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },

  floatingInputContainer: {
    position: "absolute",
    left: UI.padX,
    right: UI.padX,
    borderRadius: UI.radius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: UI.borderLight,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    minHeight: 44,
    justifyContent: "center",
    ...UI.shadow,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#1f2937",
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    borderRadius: 12,
  },
  sendInner: {
    height: 44,
    width: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  toBottom: {
    position: "absolute",
    right: 6,
    bottom: 8,
  },
  toBottomInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    color: "#4b5563",
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
