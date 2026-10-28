// The month's attendance for printing on A4 (landscape): the day-by-day grid,
// then a payroll summary with totals and fines. Margins leave room for printers
// that can't print to the edge, and every code is a letter, so it reads in black
// and white too.
import path from "node:path";
import { Document, Font, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { TONE_LEGEND, type AttendanceSheet, type SheetRow, type SheetTone } from "./build";

const FONT_DIR = path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Geist",
    fonts: [
      { src: path.join(FONT_DIR, "Geist-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Geist-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "Geist-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const C = {
  ink: "#18181b",
  body: "#27272a",
  muted: "#71717a",
  faint: "#a1a1aa",
  line: "#e4e4e7",
  strong: "#a1a1aa",
  panel: "#f4f4f5",
};

const TONE: Record<SheetTone, { bg: string; fg: string }> = {
  ok: { bg: "#dcfce7", fg: "#166534" },
  warn: { bg: "#fef3c7", fg: "#92400e" },
  danger: { bg: "#fee2e2", fg: "#991b1b" },
  leave: { bg: "#ede9fe", fg: "#5b21b6" },
  wfh: { bg: "#dbeafe", fg: "#1e40af" },
  off: { bg: "#f4f4f5", fg: "#71717a" },
  muted: { bg: "#ffffff", fg: "#a1a1aa" },
};

// A4 landscape is 842 × 595 pt. 28 pt (~10 mm) sides fit any office printer.
const MARGIN_X = 28;
const NAME_W = 124;
const ROW_H = 12.5;

const SUMMARY_COLUMNS: { key: string; label: string; width: number; align?: "left" }[] = [
  { key: "name", label: "Name", width: 120, align: "left" },
  { key: "department", label: "Department", width: 92, align: "left" },
  { key: "designation", label: "Designation", width: 100, align: "left" },
  { key: "present", label: "Present", width: 38 },
  { key: "onTime", label: "On time", width: 38 },
  { key: "late", label: "Late", width: 32 },
  { key: "veryLate", label: "Very late", width: 38 },
  { key: "fromHome", label: "From home", width: 42 },
  { key: "leaveDays", label: "Leave", width: 34 },
  { key: "halfDays", label: "Half days", width: 38 },
  { key: "absent", label: "Absent", width: 36 },
  { key: "unmarked", label: "Not marked", width: 44 },
  { key: "leaveDeducted", label: "Deducted", width: 46 },
  { key: "fines", label: "Fines (PKR)", width: 48 },
  { key: "balance", label: "Leave left", width: 40 },
];

const s = StyleSheet.create({
  page: {
    fontFamily: "Geist",
    fontSize: 7,
    color: C.body,
    paddingTop: 22,
    paddingBottom: 30,
    paddingHorizontal: MARGIN_X,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 0.75,
    borderBottomColor: C.ink,
  },
  title: { fontSize: 13, fontWeight: 600, color: C.ink },
  sub: { fontSize: 7.5, color: C.muted, marginTop: 2 },
  sectionTitle: { fontSize: 9, fontWeight: 600, color: C.ink, marginBottom: 2 },
  row: { flexDirection: "row", height: ROW_H, borderBottomWidth: 0.5, borderBottomColor: C.line },
  headRow: { flexDirection: "row", height: 20, borderBottomWidth: 0.75, borderBottomColor: C.strong },
  nameCell: { width: NAME_W, paddingRight: 4, justifyContent: "center" },
  dayCell: { flex: 1, alignItems: "center", justifyContent: "center", marginHorizontal: 0.4 },
  badge: { width: "100%", height: ROW_H - 3, borderRadius: 2, alignItems: "center", justifyContent: "center" },
  group: { height: 11, justifyContent: "flex-end", paddingBottom: 1, marginTop: 2 },
  groupText: { fontSize: 6.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  legend: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 7 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 2.5 },
  sumHead: { flexDirection: "row", minHeight: 13, alignItems: "flex-end", paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: C.strong },
  sumRow: { flexDirection: "row", height: 10.5, alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: C.line },
  sumTotal: { flexDirection: "row", height: 12, alignItems: "center", backgroundColor: C.panel, borderBottomWidth: 0.75, borderBottomColor: C.strong },
  footer: {
    position: "absolute",
    bottom: 13,
    left: MARGIN_X,
    right: MARGIN_X,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: C.faint,
  },
});

// Geist has no check mark glyph, so the remote "report sent" tick is drawn.
function CellCode({ code, color, size }: { code: string; color: string; size: number }) {
  if (code === "✓") {
    return (
      <Svg width={size + 2} height={size + 2} viewBox="0 0 12 12">
        <Path d="M2.5 6.5 L5 9 L9.5 3.5" stroke={color} strokeWidth={1.6} fill="none" />
      </Svg>
    );
  }
  return <Text style={{ color, fontWeight: 600, fontSize: size }}>{code}</Text>;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function summaryValues(row: SheetRow): Record<string, string> {
  const t = row.totals;
  return {
    name: row.person.name,
    department: row.person.department ?? "—",
    designation: row.person.designation ?? "—",
    present: fmt(t.onTime + t.late + t.veryLate + t.fromHome),
    onTime: fmt(t.onTime),
    late: fmt(t.late),
    veryLate: fmt(t.veryLate),
    fromHome: fmt(t.fromHome),
    leaveDays: fmt(t.leaveDays),
    halfDays: fmt(t.halfDays),
    absent: fmt(t.absent),
    unmarked: fmt(t.unmarked),
    leaveDeducted: fmt(t.leaveDeducted),
    fines: t.fines.toLocaleString("en-US"),
    balance: row.person.leaveBalance === null ? "—" : fmt(row.person.leaveBalance),
  };
}

function SummaryCell({
  width,
  align,
  children,
  bold,
  color,
}: {
  width: number;
  align?: "left";
  children: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={{ width, paddingHorizontal: 2, alignItems: align === "left" ? "flex-start" : "center" }}>
      <Text
        style={{ fontWeight: bold ? 600 : 400, color: color ?? C.body, maxLines: 1, textOverflow: "ellipsis" }}
      >
        {children}
      </Text>
    </View>
  );
}

export function AttendanceSheetDocument({ sheet }: { sheet: AttendanceSheet }) {
  registerFonts();
  const rows = sheet.groups.flatMap((group) => group.rows);
  const people = rows.length;

  const sum = (pick: (row: SheetRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const totals: Record<string, string> = {
    name: `Total · ${people} ${people === 1 ? "person" : "people"}`,
    department: "",
    designation: "",
    present: fmt(sum((row) => row.totals.onTime + row.totals.late + row.totals.veryLate + row.totals.fromHome)),
    onTime: fmt(sum((row) => row.totals.onTime)),
    late: fmt(sum((row) => row.totals.late)),
    veryLate: fmt(sum((row) => row.totals.veryLate)),
    fromHome: fmt(sum((row) => row.totals.fromHome)),
    leaveDays: fmt(sum((row) => row.totals.leaveDays)),
    halfDays: fmt(sum((row) => row.totals.halfDays)),
    absent: fmt(sum((row) => row.totals.absent)),
    unmarked: fmt(sum((row) => row.totals.unmarked)),
    leaveDeducted: fmt(sum((row) => row.totals.leaveDeducted)),
    fines: sum((row) => row.totals.fines).toLocaleString("en-US"),
    balance: "",
  };

  return (
    <Document title={`${sheet.orgName} attendance · ${sheet.label}`} author="Dossier">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.title}>Attendance · {sheet.label}</Text>
            <Text style={s.sub}>
              {sheet.orgName} · {people} {people === 1 ? "person" : "people"}
            </Text>
          </View>
          <Text style={s.sub}>
            Exported {sheet.generatedOn} by {sheet.generatedBy}
          </Text>
        </View>

        {/* Day by day */}
        <View style={s.headRow}>
          <View style={s.nameCell}>
            <Text style={{ fontWeight: 600, color: C.ink }}>Name</Text>
          </View>
          {sheet.days.map((day) => (
            <View
              key={day.date}
              style={[s.dayCell, day.working ? {} : { backgroundColor: C.panel, borderRadius: 2 }]}
            >
              <Text style={{ fontWeight: 600, color: C.ink, fontSize: 7.5 }}>{day.day}</Text>
              <Text style={{ color: C.muted, fontSize: 5.8 }}>{day.weekday.slice(0, 2)}</Text>
            </View>
          ))}
        </View>

        {sheet.groups.map((group) => (
          <View key={group.title}>
            {sheet.groups.length > 1 ? (
              <View style={s.group} wrap={false} minPresenceAhead={ROW_H * 2}>
                <Text style={s.groupText}>{group.title}</Text>
              </View>
            ) : null}
            {group.rows.map((row) => {
              return (
                <View key={row.person.id} style={s.row} wrap={false}>
                  <View style={s.nameCell}>
                    <Text style={{ color: C.ink, fontWeight: 500, maxLines: 1, textOverflow: "ellipsis" }}>
                      {row.person.name}
                    </Text>
                  </View>
                  {row.cells.map((cell, index) => (
                    <View key={index} style={s.dayCell}>
                      {cell.tone ? (
                        <View style={[s.badge, { backgroundColor: TONE[cell.tone].bg }]}>
                          <CellCode code={cell.code} color={TONE[cell.tone].fg} size={6.4} />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ))}

        <View style={s.legend} wrap={false}>
          {TONE_LEGEND.map((item) => (
            <View key={item.code} style={s.legendItem}>
              <View style={[s.badge, { width: 15, height: 9, backgroundColor: TONE[item.tone].bg }]}>
                <CellCode code={item.code} color={TONE[item.tone].fg} size={5.2} />
              </View>
              <Text style={{ color: C.muted, fontSize: 6.5 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Payroll summary: stays on this page when it fits, otherwise starts the next. */}
        <View style={{ marginTop: 7 }} minPresenceAhead={40}>
          <Text style={s.sectionTitle}>Summary</Text>
          <View style={s.sumHead} wrap={false}>
            {SUMMARY_COLUMNS.map((column) => (
              <View
                key={column.key}
                style={{
                  width: column.width,
                  paddingHorizontal: 2,
                  alignItems: column.align === "left" ? "flex-start" : "center",
                }}
              >
                <Text
                  style={{
                    fontWeight: 600,
                    color: C.ink,
                    fontSize: 6.5,
                    textAlign: column.align === "left" ? "left" : "center",
                  }}
                >
                  {column.label}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row) => {
            const values = summaryValues(row);
            return (
              <View key={row.person.id} style={s.sumRow} wrap={false}>
                {SUMMARY_COLUMNS.map((column) => (
                  <SummaryCell
                    key={column.key}
                    width={column.width}
                    align={column.align}
                    bold={column.key === "name"}
                    color={
                      (column.key === "fines" && row.totals.fines > 0) ||
                      (column.key === "absent" && row.totals.absent > 0)
                        ? TONE.danger.fg
                        : (column.key === "unmarked" && row.totals.unmarked > 0) ||
                            ((column.key === "late" || column.key === "veryLate") &&
                              row.totals[column.key] > 0)
                          ? TONE.warn.fg
                          : column.key === "name"
                            ? C.ink
                            : undefined
                    }
                  >
                    {values[column.key]}
                  </SummaryCell>
                ))}
              </View>
            );
          })}
          <View style={s.sumTotal} wrap={false}>
            {SUMMARY_COLUMNS.map((column) => (
              <SummaryCell key={column.key} width={column.width} align={column.align} bold color={C.ink}>
                {totals[column.key]}
              </SummaryCell>
            ))}
          </View>
          <Text style={{ color: C.faint, fontSize: 5.5, marginTop: 2 }}>
            Present includes late and from-home days (remote days with a report count as from home). Leave counts
            half days as 0.5. Deducted: leave taken from the balance. Not marked: past working days with no entry.
            Leave left: balance today.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>
            {sheet.orgName} · Attendance · {sheet.label}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
