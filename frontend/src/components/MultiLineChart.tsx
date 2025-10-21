import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";

type Series = {
  label: string;
  color: string;
  data: { xLabel: string; y: number }[];
};

export default function MultiLineChart({
  series,
  height = 160,
  gridLines = 4,
}: {
  series: Series[];
  height?: number;
  gridLines?: number;
}) {
  const [plotWidth, setPlotWidth] = useState(0);

  const allPoints = useMemo(
    () =>
      series.flatMap((s) =>
        s.data.map((d) => ({
          ...d,
          color: s.color,
        }))
      ),
    [series]
  );

  const yMax = useMemo(() => {
    if (!allPoints.length) return 1;
    const m = Math.max(...allPoints.map((d) => d.y));
    return Math.ceil(m / 5) * 5;
  }, [allPoints]);

  const yToTop = (y: number) => {
    const ratio = (yMax - y) / (yMax || 1);
    return Math.round(ratio * height * 0.85);
  };

  const onPlotLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== plotWidth) setPlotWidth(w);
  };

  const n = Math.max(series[0]?.data.length || 1, 1);
  const slotW = plotWidth / n;

  if (!allPoints.length)
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Chưa có dữ liệu.</Text>
      </View>
    );

  return (
    <View style={{ height, position: "relative" }} onLayout={onPlotLayout}>
      {/* Grid */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const top = Math.round((i * height * 0.85) / gridLines);
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

      {/* Nhiều line */}
      {series.map((s, si) => (
        <View key={si} style={{ position: "absolute", inset: 0 }}>
          {s.data.map((p, i) => {
            if (i === 0) return null;
            const xA = (i - 0.5) * slotW;
            const xB = (i + 0.5) * slotW;
            const yA = yToTop(s.data[i - 1].y);
            const yB = yToTop(p.y);
            const dx = xB - xA;
            const dy = yB - yA;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            return (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: xA,
                  top: yA,
                  width: len,
                  height: 2,
                  backgroundColor: s.color,
                  transform: [{ rotateZ: `${angle}rad` }],
                }}
              />
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          paddingTop: 4,
        }}
      >
        {series.map((s) => (
          <View
            key={s.label}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: s.color,
              }}
            />
            <Text style={{ fontSize: 12, color: "#334155" }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yTick: {
    position: "absolute",
    right: 0,
    top: -8,
    fontSize: 9,
    color: "#94a3b8",
  },
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
