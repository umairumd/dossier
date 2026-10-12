// The employee record PDF (A4). Layout follows the "Export record" design:
// overview, attendance by month, report log, optional review page.
import path from "node:path";
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  Answer,
  EmployeeRecord,
  Highlight,
  RecordDay,
  RecordOptions,
  RecordSections,
  Tone,
} from "./build";
import { plainDate, shortDate } from "./build";

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
  // Whole words only: no hyphenation in names or report text.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const C = {
  ink: "#18181b",
  body: "#27272a",
  muted: "#71717a",
  faint: "#a1a1aa",
  line: "#e4e4e7",
  hair: "#f1f1f3",
  panel: "#fafafa",
};

const TONES: Record<Tone, { bg: string; fg: string; bar: string }> = {
  ok: { bg: "#dcfce7", fg: "#166534", bar: "#4ade80" },
  warn: { bg: "#fef3c7", fg: "#92400e", bar: "#fbbf24" },
  danger: { bg: "#fee2e2", fg: "#991b1b", bar: "#f87171" },
  leave: { bg: "#ede9fe", fg: "#5b21b6", bar: "#c4b5fd" },
  off: { bg: "#f4f4f5", fg: "#71717a", bar: "#e4e4e7" },
  wfh: { bg: "#dbeafe", fg: "#1e40af", bar: "#93c5fd" },
  muted: { bg: "#f4f4f5", fg: "#a1a1aa", bar: "#e4e4e7" },
  info: { bg: "#e0f2fe", fg: "#075985", bar: "#60a5fa" },
};

const HIGHLIGHT_DOT: Record<Highlight["tone"], string> = {
  danger: "#f87171",
  warn: "#fbbf24",
  ok: "#4ade80",
  info: "#60a5fa",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Geist",
    fontSize: 9,
    lineHeight: 1.45,
    color: C.body,
    paddingTop: 34,
    paddingBottom: 46,
    paddingHorizontal: 40,
  },
  run: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.faint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginBottom: 4,
  },
  foot: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.faint,
    borderTopWidth: 1,
    borderTopColor: C.hair,
    paddingTop: 6,
  },
  h: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 16,
    marginBottom: 7,
  },
  hText: { fontSize: 10.5, fontWeight: 600, color: C.ink },
  hAside: { fontSize: 7.5, color: C.faint },
  pill: {
    borderRadius: 99,
    paddingHorizontal: 5,
    paddingVertical: 1,
    fontSize: 7,
    fontWeight: 500,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 7,
    color: C.faint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

function Pill({ tone, children }: { tone: Tone; children: string }) {
  const t = TONES[tone];
  return <Text style={[s.pill, { backgroundColor: t.bg, color: t.fg }]}>{children}</Text>;
}

function Heading({ children, aside }: { children: string; aside?: string }) {
  return (
    <View style={s.h} minPresenceAhead={40}>
      <Text style={s.hText}>{children}</Text>
      {aside ? <Text style={s.hAside}>{aside}</Text> : null}
    </View>
  );
}

function RunningHeader({ left, right }: { left: string; right: string }) {
  return (
    <View style={s.run} fixed>
      <Text>{left}</Text>
      <Text>{right}</Text>
    </View>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View style={s.foot} fixed>
      <Text>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function money(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-US")}`;
}

function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// ── Overview ─────────────────────────────────────────────────────

function Tile({ value, small, label, hint }: { value: string; small?: string; label: string; hint?: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.panel,
        borderWidth: 1,
        borderColor: C.hair,
        borderRadius: 7,
        paddingVertical: 8,
        paddingHorizontal: 9,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: 600, color: C.ink, letterSpacing: -0.4, lineHeight: 1.15 }}>
        {value}
        {small ? <Text style={{ fontSize: 9, fontWeight: 400, color: C.faint }}>{small}</Text> : null}
      </Text>
      <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 7, color: C.faint }}>{hint}</Text> : null}
    </View>
  );
}

function FactRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3.5,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.hair,
      }}
    >
      <Text style={{ color: C.body }}>{label}</Text>
      <Text style={{ fontWeight: 500, color: C.ink }}>{value}</Text>
    </View>
  );
}

type Bucket = { label: string; onTime: number; late: number; missed: number; leave: number };

function buckets(record: EmployeeRecord): { title: string; items: Bucket[] } {
  if (record.weeks.length <= 9) {
    return { title: "Week by week", items: record.weeks };
  }
  const byMonth = record.months.map((month) => {
    const b: Bucket = { label: month.label.split(" ")[0].slice(0, 3), onTime: 0, late: 0, missed: 0, leave: 0 };
    for (const d of month.days) {
      if (d.reportStatus === "on_time") b.onTime += 1;
      if (d.reportStatus === "late") b.late += 1;
      if (d.reportStatus === "missed") b.missed += 1;
      if (d.reportStatus === "leave") b.leave += 1;
    }
    return b;
  });
  return { title: "Month by month", items: byMonth };
}

function Bars({ items }: { items: Bucket[] }) {
  const max = Math.max(1, ...items.map((b) => b.onTime + b.late + b.missed + b.leave));
  const H = 58;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: H + 16, gap: 8 }}>
        {items.map((b, i) => {
          const total = b.onTime + b.late + b.missed + b.leave;
          const seg = (n: number, color: string) =>
            n > 0 ? <View style={{ height: (n / max) * H, backgroundColor: color }} /> : null;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              {total === 0 ? (
                <View style={{ width: 26, height: 2, backgroundColor: C.line }} />
              ) : (
                <View style={{ width: 26, borderRadius: 3, overflow: "hidden", flexDirection: "column-reverse" }}>
                  {seg(b.onTime, TONES.ok.bar)}
                  {seg(b.late, TONES.warn.bar)}
                  {seg(b.missed, TONES.danger.bar)}
                  {seg(b.leave, TONES.off.bar)}
                </View>
              )}
              <Text style={{ fontSize: 6.5, color: C.muted, marginTop: 4, textAlign: "center" }}>{b.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        {(
          [
            ["On time", TONES.ok.bar],
            ["Late", TONES.warn.bar],
            ["Missed", TONES.danger.bar],
            ["Leave", TONES.off.bar],
          ] as const
        ).map(([label, color]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 1.5, backgroundColor: color }} />
            <Text style={{ fontSize: 7, color: C.muted }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Overview({
  record,
  options,
  generatedBy,
  generatedOn,
}: {
  record: EmployeeRecord;
  options: RecordOptions;
  generatedBy: string;
  generatedOn: string;
}) {
  const { person, summary, period } = record;
  const a = summary.attendance;
  const meta = [person.designation, person.departments.join(", ")].filter(Boolean).join(" · ");
  const chart = buckets(record);
  const org = record.orgName ? `${record.orgName} · ` : "";

  return (
    <Page size="A4" style={s.page}>
      <RunningHeader left={`${org}Employee record`} right={period.label} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 14, paddingBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: 600, color: C.ink, letterSpacing: -0.6, lineHeight: 1.15 }}>
            {person.name}
          </Text>
          {meta ? <Text style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{meta}</Text> : null}
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#f4f4f5",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{initials(person.name)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", borderWidth: 1, borderColor: C.line, borderRadius: 7 }}>
        {[
          ["Period", period.asOf ? `${period.label}, as of ${plainDate(period.asOf)}` : period.label],
          ["Manager", person.managerName ?? "None"],
          ["Joined", plainDate(person.joinedOn)],
          ["Working days", String(summary.expected)],
        ].map(([label, value], i) => (
          <View
            key={label}
            style={{
              flex: i === 0 ? 1.6 : 1,
              paddingVertical: 6,
              paddingHorizontal: 9,
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: C.line,
            }}
          >
            <Text style={s.label}>{label}</Text>
            <Text style={{ fontWeight: 500, color: C.ink, fontSize: 8.5 }}>{value}</Text>
          </View>
        ))}
      </View>

      <Heading aside={`Due daily by ${record.deadlineLabel}`}>Reports</Heading>
      <View style={{ flexDirection: "row", gap: 7 }}>
        <Tile
          value={String(summary.submittedOnExpected)}
          small={` / ${summary.expected}`}
          label="Reports submitted"
          hint={`${summary.rate}% of working days`}
        />
        <Tile
          value={`${summary.onTimeRate}%`}
          label="On time"
          hint={`${summary.onTime} of ${summary.submitted} before ${record.deadlineLabel}`}
        />
        <Tile value={summary.usualTime ?? "None"} label="Usual submit time" hint="Average in the period" />
        <Tile
          value={summary.longestStreak ? `${summary.longestStreak.days}` : "0"}
          small={summary.longestStreak?.days === 1 ? " day" : " days"}
          label="Longest streak"
          hint={
            summary.longestStreak
              ? `${shortDate(summary.longestStreak.from)} to ${shortDate(summary.longestStreak.to)}`
              : undefined
          }
        />
      </View>

      {chart.items.length > 1 ? (
        <>
          <Heading aside="Reports by status">{chart.title}</Heading>
          <Bars items={chart.items} />
        </>
      ) : null}

      <Heading aside={a.unmarked > 0 ? `${a.unmarked} working days not marked` : undefined}>Attendance</Heading>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={{ flex: 1 }}>
          <FactRow label="Present" value={String(a.present)} />
          <FactRow label="Late arrivals" value={String(a.late)} />
          <FactRow label="Absent" value={String(a.absent)} />
          <FactRow label="Leave" value={a.halfLeave > 0 ? `${a.leave} + ${a.halfLeave} half days` : String(a.leave)} />
          <FactRow label="Work from home" value={String(a.wfh)} last />
        </View>
        <View style={{ flex: 1 }}>
          {options.leaveAndFines ? (
            <>
              <FactRow label="Leave taken" value={num(summary.leave.taken)} />
              <FactRow label="Leave credited" value={`+${num(summary.leave.credited)}`} />
              {summary.leave.adjusted !== 0 ? (
                <FactRow
                  label="Leave adjusted"
                  value={`${summary.leave.adjusted > 0 ? "+" : ""}${num(summary.leave.adjusted)}`}
                />
              ) : null}
              <FactRow label="Leave balance today" value={num(summary.leave.balanceNow)} />
              <FactRow label="Fines" value={summary.fines > 0 ? money(summary.fines) : "None"} last />
            </>
          ) : (
            <>
              <FactRow label="Holidays" value={String(a.holiday)} />
              <FactRow label="Days off" value={String(a.off)} />
              <FactRow label="Comments received" value={String(summary.comments)} last />
            </>
          )}
        </View>
      </View>

      {record.highlights.length > 0 ? (
        <>
          <Heading aside="Picked out from the records">Worth discussing</Heading>
          <View style={{ gap: 4 }}>
            {record.highlights.map((h, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 6 }} wrap={false}>
                <View
                  style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: HIGHLIGHT_DOT[h.tone], marginTop: 4 }}
                />
                <Text style={{ flex: 1, color: C.body }}>{h.text}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Footer left={`Prepared by ${generatedBy} on ${generatedOn}`} />
    </Page>
  );
}

// ── Attendance ───────────────────────────────────────────────────

const CAL_HEAD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Calendar({ monthKey, days }: { monthKey: string; days: RecordDay[] }) {
  const byDay = new Map(days.map((d) => [d.dayOfMonth, d]));
  const firstWeekday = new Date(`${monthKey}-01T00:00:00Z`).getUTCDay(); // 0 = Sun
  const lead = (firstWeekday + 6) % 7;
  const monthLength = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: monthLength }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {CAL_HEAD.map((d) => (
          <Text key={d} style={{ flex: 1, fontSize: 6.5, color: C.faint, textAlign: "center" }}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 3 }}>
          {row.map((n, c) => {
            const day = n ? byDay.get(n) : undefined;
            const tone = day?.attendance.tone;
            return (
              <View
                key={c}
                style={{
                  flex: 1,
                  height: 21,
                  borderRadius: 4,
                  paddingHorizontal: 3,
                  paddingTop: 2,
                  backgroundColor: day ? TONES[tone!].bg : "transparent",
                  borderWidth: n && !day ? 1 : 0,
                  borderColor: C.hair,
                }}
              >
                {n ? (
                  <Text
                    style={{
                      fontSize: 7,
                      color: !day || tone === "muted" || tone === "off" ? C.faint : C.body,
                    }}
                  >
                    {n}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function reportCell(day: RecordDay): { text: string; color: string } {
  switch (day.reportStatus) {
    case "on_time":
      return { text: day.report!.sentAt, color: C.body };
    case "late":
      return { text: `${day.report!.sentAt} late`, color: TONES.warn.fg };
    case "missed":
      return { text: "Missed", color: TONES.danger.fg };
    case "pending":
      return { text: "Not sent yet", color: C.faint };
    default:
      return day.report ? { text: day.report.sentAt, color: C.body } : { text: "", color: C.faint };
  }
}

function AttendanceMonth({
  record,
  month,
  options,
}: {
  record: EmployeeRecord;
  month: EmployeeRecord["months"][number];
  options: RecordOptions;
}) {
  const counts = new Map<string, { tone: Tone; n: number }>();
  for (const d of month.days) {
    const key = d.attendance.status === "holiday" ? "Holiday" : d.attendance.label;
    const entry = counts.get(key) ?? { tone: d.attendance.tone, n: 0 };
    entry.n += 1;
    counts.set(key, entry);
  }
  const cols = options.leaveAndFines
    ? [52, 74, 34, 70, 40, 0]
    : [52, 74, 34, 70, 0];
  const header = options.leaveAndFines
    ? ["Date", "Status", "In", "Report", "Fine", "Note"]
    : ["Date", "Status", "In", "Report", "Note"];

  return (
    <Page size="A4" style={s.page}>
      <RunningHeader left={`${record.person.name} · Attendance`} right={month.label} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Attendance</Text>
        <Text style={{ fontSize: 7.5, color: C.faint }}>{record.shiftLabel}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 18, marginTop: 10 }}>
        <View style={{ flex: 1.25 }}>
          <Calendar monthKey={month.key} days={month.days} />
        </View>
        <View style={{ flex: 0.75, gap: 4, paddingTop: 12 }}>
          {[...counts.entries()].map(([label, { tone, n }]) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: TONES[tone].bg }} />
              <Text style={{ fontSize: 7.5, color: C.body, flex: 1 }}>{label}</Text>
              <Text style={{ fontSize: 7.5, color: C.ink, fontWeight: 500 }}>{n}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 3 }}>
          {header.map((h, i) => (
            <Text key={h} style={[s.label, cols[i] ? { width: cols[i] } : { flex: 1 }, { paddingRight: 4 }]}>
              {h}
            </Text>
          ))}
        </View>
        {month.days.map((day) => {
          const report = reportCell(day);
          const off = !day.working || day.attendance.tone === "off";
          const statusLabel =
            day.attendance.lateMinutes && day.attendance.status !== null
              ? `${day.attendance.label} ${day.attendance.lateMinutes} min`
              : day.attendance.label;
          const cells = [
            <Text key="d" style={{ width: cols[0], color: off ? C.faint : C.ink, fontWeight: 500 }}>
              {`${day.weekday} ${day.dayOfMonth}`}
            </Text>,
            <View key="s" style={{ width: cols[1] }}>
              <Pill tone={day.attendance.tone}>{statusLabel}</Pill>
            </View>,
            <Text key="i" style={{ width: cols[2], color: C.body }}>{day.attendance.checkIn ?? ""}</Text>,
            <Text key="r" style={{ width: cols[3], color: report.color }}>{report.text}</Text>,
          ];
          if (options.leaveAndFines) {
            cells.push(
              <Text key="f" style={{ width: cols[4], color: day.attendance.fine > 0 ? TONES.danger.fg : C.faint }}>
                {day.attendance.fine > 0 ? Math.round(day.attendance.fine).toLocaleString("en-US") : ""}
              </Text>,
            );
          }
          cells.push(
            <Text key="n" style={{ flex: 1, color: C.muted }}>{day.attendance.note ?? ""}</Text>,
          );
          return (
            <View
              key={day.date}
              wrap={false}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 2.6,
                borderBottomWidth: 1,
                borderBottomColor: C.hair,
                backgroundColor: off ? "#fcfcfc" : "#ffffff",
                fontSize: 8,
              }}
            >
              {cells}
            </View>
          );
        })}
      </View>

      <Footer left={`${record.person.name} · ${record.period.label}`} />
    </Page>
  );
}

// ── Report log ───────────────────────────────────────────────────

function AnswerView({ answer, first }: { answer: Answer; first: boolean }) {
  const labelStyle = [s.label, { marginTop: first ? 0 : 6, marginBottom: 1.5 }];
  if (answer.kind === "fact") {
    return (
      <View style={{ flexDirection: "row", gap: 6, marginTop: first ? 0 : 5 }}>
        <Text style={{ color: C.muted, fontSize: 8 }}>{answer.label}</Text>
        <Text style={{ color: C.ink, fontWeight: 500, fontSize: 8 }}>{answer.value}</Text>
      </View>
    );
  }
  if (answer.kind === "link") {
    return (
      <View>
        <Text style={labelStyle}>{answer.label}</Text>
        <Link src={answer.href} style={{ color: "#1d4ed8", fontSize: 8.5, textDecoration: "none" }}>
          {answer.text}
        </Link>
      </View>
    );
  }
  return (
    <View>
      <Text style={labelStyle}>{answer.label}</Text>
      {answer.lines.length === 1 ? (
        <Text>{answer.lines[0]}</Text>
      ) : (
        answer.lines.map((line, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 4 }}>
            <Text style={{ color: C.faint }}>•</Text>
            <Text style={{ flex: 1 }}>{line}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function commentTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

const STATUS_PILL: Record<RecordDay["reportStatus"], { tone: Tone; label: string }> = {
  on_time: { tone: "ok", label: "On time" },
  late: { tone: "warn", label: "Late" },
  missed: { tone: "danger", label: "Missed" },
  leave: { tone: "leave", label: "Leave" },
  off: { tone: "off", label: "Day off" },
  pending: { tone: "muted", label: "Not sent yet" },
};

function DayEntry({
  day,
  withComments,
  timeZone,
}: {
  day: RecordDay;
  withComments: boolean;
  timeZone: string;
}) {
  const report = day.report!;
  const pill = STATUS_PILL[day.reportStatus];
  const size =
    report.answers.reduce((n, a) => n + (a.kind === "text" ? a.lines.length + 1 : 1), 0) +
    (withComments ? report.comments.length * 2 : 0);
  return (
    <View
      wrap={size > 14}
      style={{
        flexDirection: "row",
        gap: 12,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: C.hair,
      }}
    >
      <View style={{ width: 76 }}>
        <Text style={{ fontSize: 9.5, fontWeight: 600, color: C.ink }}>{shortDate(day.date)}</Text>
        <Text style={{ fontSize: 7.5, color: C.muted, marginBottom: 3 }}>Sent {report.sentAt}</Text>
        <Pill tone={pill.tone}>{day.working ? pill.label : "Day off, sent"}</Pill>
      </View>
      <View style={{ flex: 1 }}>
        {report.answers.length === 0 ? (
          <Text style={{ color: C.faint }}>No details in this report.</Text>
        ) : (
          report.answers.map((answer, i) => <AnswerView key={i} answer={answer} first={i === 0} />)
        )}
        {withComments && report.comments.length > 0 ? (
          <View style={{ marginTop: 7, backgroundColor: C.panel, borderRadius: 5, paddingVertical: 5, paddingHorizontal: 7, gap: 5 }}>
            {report.comments.map((c, i) => (
              <View key={i} wrap={false}>
                <Text style={{ fontSize: 7.5 }}>
                  <Text style={{ fontWeight: 600, color: C.ink }}>{c.authorName}</Text>
                  <Text style={{ color: C.faint }}>{`  ${commentTime(c.createdAt, timeZone)}`}</Text>
                </Text>
                <Text style={{ fontSize: 8 }}>{c.body}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ThinRow({ day }: { day: RecordDay }) {
  const pill = STATUS_PILL[day.reportStatus];
  const note =
    day.reportStatus === "missed"
      ? day.attendance.status === "absent"
        ? "No report · absent"
        : "No report sent"
      : day.reportStatus === "leave"
        ? "On leave"
        : day.reportStatus === "pending"
          ? "Due today"
          : "";
  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: C.hair,
      }}
    >
      <Text style={{ width: 76, fontSize: 9, fontWeight: 600, color: C.ink }}>{shortDate(day.date)}</Text>
      <Text style={{ flex: 1, color: C.muted }}>{note}</Text>
      <Pill tone={pill.tone}>{pill.label}</Pill>
    </View>
  );
}

function ReportLog({
  record,
  sections,
  options,
  timeZone,
}: {
  record: EmployeeRecord;
  sections: RecordSections;
  options: RecordOptions;
  timeZone: string;
}) {
  const templates = [
    ...new Set(record.days.map((d) => d.report?.templateName).filter((n): n is string => Boolean(n))),
  ];
  const rows = record.days.filter(
    (d) =>
      d.report ||
      (options.showMissed && (d.reportStatus === "missed" || d.reportStatus === "leave" || d.reportStatus === "pending")),
  );
  return (
    <Page size="A4" style={s.page}>
      <RunningHeader left={`${record.person.name} · Report log`} right={record.period.label} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10, marginBottom: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>What they worked on</Text>
        <Text style={{ fontSize: 7.5, color: C.faint }}>
          {templates.length > 0 ? `Template: ${templates.join(", ")}` : ""}
        </Text>
      </View>
      {rows.length === 0 ? (
        <Text style={{ color: C.muted, marginTop: 12 }}>No reports in this period.</Text>
      ) : (
        rows.map((day) =>
          day.report ? (
            <DayEntry key={day.date} day={day} withComments={sections.comments} timeZone={timeZone} />
          ) : (
            <ThinRow key={day.date} day={day} />
          ),
        )
      )}
      <Footer left={`${record.person.name} · ${record.period.label}`} />
    </Page>
  );
}

// ── Review page ──────────────────────────────────────────────────

function Lines({ n }: { n: number }) {
  return (
    <View>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ height: 21, borderBottomWidth: 1, borderBottomColor: C.line }} />
      ))}
    </View>
  );
}

function ReviewPage({ record }: { record: EmployeeRecord }) {
  return (
    <Page size="A4" style={s.page}>
      <RunningHeader left={`${record.person.name} · Review`} right={record.period.label} />
      <Text style={{ fontSize: 17, fontWeight: 600, color: C.ink, marginTop: 14 }}>Review discussion</Text>
      <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
        Meeting date ______________________ · Reviewer ______________________
      </Text>

      <Heading>Purpose</Heading>
      <View style={{ gap: 5 }}>
        {["Monthly check-in", "Appraisal or eligibility review", "Attendance or reporting concern", "Audit"].map(
          (label) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <View style={{ width: 9, height: 9, borderWidth: 1, borderColor: C.faint, borderRadius: 2 }} />
              <Text>{label}</Text>
            </View>
          ),
        )}
      </View>

      <Heading>Points discussed</Heading>
      <Lines n={6} />
      <Heading>Employee&apos;s comments</Heading>
      <Lines n={4} />
      <Heading aside="With a date to check back">Agreed next steps</Heading>
      <Lines n={4} />

      <View style={{ flexDirection: "row", gap: 24, marginTop: 28 }}>
        {[`Employee: ${record.person.name}`, "Reviewer"].map((who) => (
          <View key={who} style={{ flex: 1, borderTopWidth: 1, borderTopColor: C.ink, paddingTop: 5 }}>
            <Text style={{ fontSize: 8, color: C.body }}>{who}</Text>
            <Text style={{ fontSize: 7.5, color: C.faint }}>Signature and date</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 7, color: C.faint, marginTop: 16 }}>
        The employee has seen the records in this document. Signing confirms the discussion took place, not
        agreement with every figure.
      </Text>
      <Footer left={`${record.person.name} · ${record.period.label}`} />
    </Page>
  );
}

// ── Document ─────────────────────────────────────────────────────

export function EmployeeRecordDocument({
  record,
  sections,
  options,
  timeZone,
  generatedBy,
  generatedOn,
}: {
  record: EmployeeRecord;
  sections: RecordSections;
  options: RecordOptions;
  timeZone: string;
  generatedBy: string;
  generatedOn: string;
}) {
  registerFonts();
  return (
    <Document
      title={`${record.person.name} · ${record.period.label}`}
      author={generatedBy}
      subject="Employee record"
      creator="Dossier"
      producer="Dossier"
    >
      <Overview record={record} options={options} generatedBy={generatedBy} generatedOn={generatedOn} />
      {sections.attendance
        ? record.months.map((month) => (
            <AttendanceMonth key={month.key} record={record} month={month} options={options} />
          ))
        : null}
      {sections.reports ? (
        <ReportLog record={record} sections={sections} options={options} timeZone={timeZone} />
      ) : null}
      {options.reviewPage ? <ReviewPage record={record} /> : null}
    </Document>
  );
}
