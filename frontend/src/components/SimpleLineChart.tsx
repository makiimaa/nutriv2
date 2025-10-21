import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function SimpleLineChart({
  data,
  height = 160,
  color = "#2f80ed",
  unit = "",
  mode = "line",
  showAvg = true,
  showMinMax = true,
  highlightLast = true,
  gridLines = 4,
}: {
  data: { xLabel: string; y: number }[];
  height?: number;
  color?: string;
  unit?: string;
  mode?: "line" | "bar";
  showAvg?: boolean;
  showMinMax?: boolean;
  highlightLast?: boolean;
  gridLines?: number;
}) {
  const [plotWidth, setPlotWidth] = useState(0);

  const safe = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    return arr
      .filter((d) => d && typeof d.y === "number" && isFinite(d.y))
      .map((d) => ({ xLabel: d.xLabel || "", y: d.y }));
  }, [data]);

  const yMax = useMemo(() => {
    if (!safe.length) return 1;
    const m = Math.max(...safe.map((d) => d.y), 1);
    if (m <= 10) return Math.ceil(m / 2) * 2;
    if (m <= 50) return Math.ceil(m / 5) * 5;
    return Math.ceil(m / 10) * 10;
  }, [safe]);

  const yMin = useMemo(() => {
    if (!safe.length) return 0;
    const m = Math.min(...safe.map((d) => d.y));
    return Math.max(0, Math.floor(m));
  }, [safe]);

  const yAvg = useMemo(() => {
    if (!safe.length) return 0;
    const sum = safe.reduce((a, b) => a + b.y, 0);
    return sum / safe.length;
  }, [safe]);

  const last = safe[safe.length - 1]?.y ?? 0;
  const prev = safe[safe.length - 2]?.y ?? 0;
  const delta = last - prev;
  const trend = delta === 0 ? "flat" : delta > 0 ? "up" : "down";

  const PADDING_TOP = 6;
  const PADDING_BOTTOM = 28;
  const plotHeight = height - PADDING_BOTTOM;

  const yToTop = (y: number) => {
    const clamped = Math.max(0, Math.min(y, yMax));
    const ratio = (yMax - clamped) / (yMax || 1);
    return Math.round(PADDING_TOP + ratio * (plotHeight - PADDING_TOP));
  };

  const avgTop =
    showAvg && yAvg > 0
      ? Math.max(0, Math.min(plotHeight, yToTop(yAvg)))
      : null;

  const points = useMemo(
    () =>
      safe.map((d, i) => ({
        idx: i,
        label: d.xLabel,
        y: d.y,
        top: yToTop(d.y),
      })),

    [safe, yMax]
  );

  const xPositions = useMemo(() => {
    const n = Math.max(points.length, 1);
    const slotW = plotWidth / n;
    return points.map((p) => (p.idx + 0.5) * slotW);
  }, [points, plotWidth]);

  const onPlotLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== plotWidth) setPlotWidth(w);
  };

  if (!safe.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Chưa có dữ liệu.</Text>
      </View>
    );
  }

  const fmt = (v: number, u = unit) =>
    `${Math.round(v * 10) / 10}${u ? ` ${u}` : ""}`;

  const labelStep = Math.max(1, Math.ceil(safe.length / 6));

  return (
    <View style={styles.wrap}>
      {/* Plot area */}
      <View style={{ height, position: "relative" }} onLayout={onPlotLayout}>
        {/* grid + y ticks */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const top =
            Math.round((i * (plotHeight - PADDING_TOP)) / gridLines) +
            PADDING_TOP;
          const val = Math.round(((gridLines - i) * yMax) / gridLines);
          return (
            <View
              key={i}
              style={{ position: "absolute", left: 0, right: 0, top }}
            >
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: i === gridLines ? "#e5e7eb" : "#f1f5f9",
                }}
              />
              <Text style={styles.yTick}>{val}</Text>
            </View>
          );
        })}

        {/* avg dashed */}
        {avgTop !== null && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: avgTop,
              borderTopWidth: 1,
              borderStyle: "dashed",
              borderColor: "#cbd5e1",
            }}
          />
        )}

        {/* bars */}
        {mode === "bar" && (
          <View
            style={{
              position: "absolute",
              inset: 0,
              flexDirection: "row",
              alignItems: "flex-end",
            }}
          >
            {safe.map((d, i) => {
              const h = Math.max(
                2,
                Math.round(
                  (Math.min(d.y, yMax) / (yMax || 1)) *
                    (plotHeight - PADDING_TOP)
                )
              );
              return (
                <View key={i} style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={{
                      width: 8,
                      height: h,
                      backgroundColor: color,
                      borderRadius: 4,
                    }}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* line */}
        {mode === "line" && plotWidth > 0 && (
          <View style={{ position: "absolute", inset: 0 }}>
            {/* shadow dưới line */}
            {points.map((p, i) => {
              if (i === 0) return null;
              const xA = xPositions[i - 1];
              const xB = xPositions[i];
              const yA = points[i - 1].top;
              const yB = p.top;
              const dx = xB - xA;
              const dy = yB - yA;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx);
              return (
                <View
                  key={`sh-${i}`}
                  style={{
                    position: "absolute",
                    left: xA,
                    top: yA,
                    width: len,
                    height: 4,
                    backgroundColor: hexToRgba(color, 0.18),
                    transform: [{ rotateZ: `${angle}rad` }],
                    borderRadius: 4,
                  }}
                />
              );
            })}
            {/* main line */}
            {points.map((p, i) => {
              if (i === 0) return null;
              const xA = xPositions[i - 1];
              const xB = xPositions[i];
              const yA = points[i - 1].top;
              const yB = p.top;
              const dx = xB - xA;
              const dy = yB - yA;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx);
              return (
                <View
                  key={`ln-${i}`}
                  style={{
                    position: "absolute",
                    left: xA,
                    top: yA,
                    width: len,
                    height: 2,
                    backgroundColor: color,
                    transform: [{ rotateZ: `${angle}rad` }],
                    borderRadius: 2,
                  }}
                />
              );
            })}
            {/* dots */}
            {points.map((p, i) => (
              <View
                key={`pt-${i}`}
                style={{
                  position: "absolute",
                  left: xPositions[i] - 5,
                  top: p.top - 5,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: color,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.06)",
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {/* bubble */}
        {highlightLast &&
          mode === "line" &&
          points.length > 0 &&
          plotWidth > 0 && (
            <>
              <View
                style={{
                  position: "absolute",
                  left: xPositions[points.length - 1] - 7,
                  top: points[points.length - 1].top - 7,
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: "#fff",
                  borderWidth: 2,
                  borderColor: color,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: Math.min(
                    Math.max(xPositions[points.length - 1] - 38, 4),
                    (plotWidth || 0) - 76
                  ),
                  top: Math.max(points[points.length - 1].top - 34, 4),
                }}
              >
                <LinearGradient
                  colors={[hexToRgba(color, 0.12), hexToRgba(color, 0.28)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bubble}
                >
                  <Text style={styles.bubbleTxt}>{fmt(last)}</Text>
                </LinearGradient>
              </View>
            </>
          )}
      </View>

      {/* x labels */}
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {safe.map((d, i) => (
          <Text
            key={i}
            style={[styles.xLabel, i % labelStep !== 0 && { opacity: 0.25 }]}
            numberOfLines={1}
          >
            {d.xLabel.slice(5)}
          </Text>
        ))}
      </View>

      {/* footer chips */}
      <View style={styles.footerRow}>
        {showMinMax && (
          <View style={styles.chip}>
            <Text style={styles.chipKey}>Max</Text>
            <Text style={styles.chipVal}>{fmt(yMax)}</Text>
          </View>
        )}
        {showAvg && (
          <View style={styles.chip}>
            <Text style={styles.chipKey}>Avg</Text>
            <Text style={styles.chipVal}>{fmt(yAvg)}</Text>
          </View>
        )}
        {showMinMax && (
          <View style={styles.chip}>
            <Text style={styles.chipKey}>Min</Text>
            <Text style={styles.chipVal}>{fmt(yMin)}</Text>
          </View>
        )}
        <View
          style={[
            styles.chip,
            trend === "up" && { backgroundColor: "rgba(16,185,129,0.12)" },
            trend === "down" && { backgroundColor: "rgba(239,68,68,0.12)" },
          ]}
        >
          <Text style={styles.chipKey}>Last</Text>
          <Text
            style={[
              styles.chipVal,
              trend === "up" && { color: "#065f46" },
              trend === "down" && { color: "#991b1b" },
            ]}
          >
            {fmt(last)} {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}{" "}
            {fmt(Math.abs(delta))}
          </Text>
        </View>
      </View>
    </View>
  );
}

function hexToRgba(hex: string, alpha = 1) {
  try {
    const c = hex.replace("#", "");
    const n = parseInt(
      c.length === 3
        ? c
            .split("")
            .map((x) => x + x)
            .join("")
        : c,
      16
    );
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return `rgba(47,128,237,${alpha})`;
  }
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "#eef2f7",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },

  yTick: {
    position: "absolute",
    right: 0,
    top: -8,
    fontSize: 9,
    color: "#94a3b8",
  },

  xLabel: { flex: 1, fontSize: 10, textAlign: "center", color: "#334155" },

  bubble: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  bubbleTxt: { color: "#0f172a", fontWeight: "800", fontSize: 12 },

  footerRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  chipKey: { color: "#475569", fontWeight: "700", marginRight: 4 },
  chipVal: { color: "#0f172a", fontWeight: "800" },

  emptyBox: {
    borderWidth: 1,
    borderColor: "#eef2f7",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  emptyText: { color: "#64748b" },
});
