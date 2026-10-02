import { useEffect, useState } from "react";

export type Lang = "en" | "ru";

export interface Dict {
  appName: string;
  tabShifts: string;
  tabCalendar: string;
  tabReport: string;
  tabSetup: string;
  tabData: string;
  date: string;
  start: string;
  end: string;
  breakMin: string;
  note: string;
  notePlaceholder: string;
  cancel: string;
  updateShift: string;
  addShift: string;
  setRateHint: string;
  shiftsHeading: string;
  noShiftsMonth: string;
  breakSuffix: (n: number) => string;
  edit: string;
  delete: string;
  filterAll: string;
  filterScheduled: string;
  filterWorked: string;
  filterNotes: string;
  noShifts: string;
  customShift: string;
  break: string;
  monthTotal: string;
  allTime: string;
  colMonth: string;
  colTotal: string;
  colHours: string;
  noDataYet: string;
  workplace: string;
  currencySymbol: string;
  rateHistory: string;
  rateHistoryHint: string;
  effectiveFrom: string;
  ratePerHour: string;
  addRate: string;
  fromDate: (d: string) => string;
  shiftTemplates: string;
  name: string;
  namePlaceholder: string;
  add: string;
  update: string;
  payPeriods: string;
  payPeriodsHint: string;
  label: string;
  startDay: string;
  endDay: string;
  addPeriod: string;
  calendarHeading: string;
  exportIcs: string;
  importIcs: string;
  backupRestore: string;
  backupHint: string;
  downloadBackup: string;
  restoreBackup: string;
  confirmRestore: string;
  importedShifts: (n: number) => string;
  backupRestored: string;
  invalidBackup: string;
}

const translations: Record<Lang, Dict> = {
  en: {
    appName: "Shift Control",
    tabShifts: "Shifts",
    tabCalendar: "Calendar",
    tabReport: "Report",
    tabSetup: "Work & Rate",
    tabData: "Backup",

    // ShiftsTab
    date: "Date",
    start: "Start",
    end: "End",
    breakMin: "Break (min)",
    note: "Note",
    notePlaceholder: "Optional",
    cancel: "Cancel",
    updateShift: "Update shift",
    addShift: "Add shift",
    setRateHint: "Set your hourly rate in “Work & Rate” to see pay.",
    shiftsHeading: "Shifts",
    noShiftsMonth: "No shifts this month.",
    breakSuffix: (n: number) => `${n}m break`,
    edit: "Edit",
    delete: "Delete",

    // CalendarTab
    filterAll: "All",
    filterScheduled: "Scheduled",
    filterWorked: "Worked",
    filterNotes: "With notes",
    noShifts: "No shifts.",
    customShift: "+ Custom",
    break: "Break",

    // ReportTab
    monthTotal: "Month total",
    allTime: "All time",
    colMonth: "Month",
    colTotal: "Total",
    colHours: "Hours",
    noDataYet: "No data yet.",

    // SetupTab
    workplace: "Workplace",
    currencySymbol: "Currency symbol",
    rateHistory: "Hourly rate history",
    rateHistoryHint: "Each shift uses the rate in effect on its date.",
    effectiveFrom: "Effective from",
    ratePerHour: "Rate / hour",
    addRate: "Add rate",
    fromDate: (d: string) => `From ${d}`,
    shiftTemplates: "Shift templates",
    name: "Name",
    namePlaceholder: "Morning",
    add: "Add",
    update: "Update",
    payPeriods: "Pay periods",
    payPeriodsHint: "Define how each month splits into pay periods — add, remove or change the day ranges freely.",
    label: "Label",
    startDay: "Start day",
    endDay: "End day",
    addPeriod: "Add period",

    // DataTab
    calendarHeading: "Calendar",
    exportIcs: "Export to calendar (.ics)",
    importIcs: "Import .ics",
    backupRestore: "Backup & restore",
    backupHint: "Data is stored on this device only. Save a backup regularly.",
    downloadBackup: "Download backup",
    restoreBackup: "Restore backup",
    confirmRestore: "Replace all current data with this backup?",
    importedShifts: (n: number) => `Imported ${n} shifts from calendar.`,
    backupRestored: "Backup restored.",
    invalidBackup: "That file isn't a valid backup.",
  },
  ru: {
    appName: "Контроль смен",
    tabShifts: "Смены",
    tabCalendar: "Календарь",
    tabReport: "Отчёт",
    tabSetup: "Настройки",
    tabData: "Бэкап",

    // ShiftsTab
    date: "Дата",
    start: "Начало",
    end: "Конец",
    breakMin: "Перерыв (мин)",
    note: "Заметка",
    notePlaceholder: "Необязательно",
    cancel: "Отмена",
    updateShift: "Обновить смену",
    addShift: "Добавить смену",
    setRateHint: "Укажите ставку в разделе «Работа и ставка», чтобы увидеть оплату.",
    shiftsHeading: "Смены",
    noShiftsMonth: "В этом месяце смен нет.",
    breakSuffix: (n: number) => `перерыв ${n} мин`,
    edit: "Изменить",
    delete: "Удалить",

    // CalendarTab
    filterAll: "Все",
    filterScheduled: "Запланировано",
    filterWorked: "Отработано",
    filterNotes: "С заметками",
    noShifts: "Смен нет.",
    customShift: "+ Своя",
    break: "Перерыв",

    // ReportTab
    monthTotal: "Итого за месяц",
    allTime: "За всё время",
    colMonth: "Месяц",
    colTotal: "Итого",
    colHours: "Часы",
    noDataYet: "Пока нет данных.",

    // SetupTab
    workplace: "Место работы",
    currencySymbol: "Символ валюты",
    rateHistory: "История ставок",
    rateHistoryHint: "Для каждой смены берётся ставка, действующая на её дату.",
    effectiveFrom: "Действует с",
    ratePerHour: "Ставка / час",
    addRate: "Добавить ставку",
    fromDate: (d: string) => `С ${d}`,
    shiftTemplates: "Шаблоны смен",
    name: "Название",
    namePlaceholder: "Утро",
    add: "Добавить",
    update: "Обновить",
    payPeriods: "Периоды выплат",
    payPeriodsHint: "Задайте, как месяц делится на периоды выплат — добавляйте, удаляйте и меняйте диапазоны дней как угодно.",
    label: "Название",
    startDay: "День начала",
    endDay: "День конца",
    addPeriod: "Добавить период",

    // DataTab
    calendarHeading: "Календарь",
    exportIcs: "Экспорт в календарь (.ics)",
    importIcs: "Импорт .ics",
    backupRestore: "Резервная копия",
    backupHint: "Данные хранятся только на этом устройстве. Делайте резервные копии регулярно.",
    downloadBackup: "Скачать резервную копию",
    restoreBackup: "Восстановить из копии",
    confirmRestore: "Заменить все текущие данные этой резервной копией?",
    importedShifts: (n: number) => `Импортировано смен: ${n}.`,
    backupRestored: "Резервная копия восстановлена.",
    invalidBackup: "Это не похоже на файл резервной копии.",
  },
} as const;

const KEY = "shift-control-lang";

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return saved === "ru" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }, [lang]);
  const toggle = () => setLang((l) => (l === "en" ? "ru" : "en"));
  return { lang, t: translations[lang], toggle, locale: lang === "ru" ? "ru-RU" : undefined };
}

export const weekdayShort = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
} as const;
