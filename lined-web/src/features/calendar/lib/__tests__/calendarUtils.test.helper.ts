export const locales = {
  english: 'en',
  ukrainian: 'uk',
} as const;

export const dates = {
  julySample: '2026-07-18T10:00:00',
  julyMorning: '2026-07-18T09:00:00',
  marchNow: '2026-03-28T08:10:00',
  marchJustNow: '2026-03-28T08:00:30',
  marchMorning: '2026-03-28T08:00:00',
  marchMorningUtc: '2026-03-28T08:00:00Z',
  marchOneMinuteAgo: '2026-03-28T08:09:00',
  marchTwoMinutesAgo: '2026-03-28T08:08:00',
  marchFiveMinutesAgo: '2026-03-28T08:05:00',
  marchYesterday: '2026-03-27T07:00:00',
  completedTask: '2020-01-01',
  todayTaskDueDate: '2026-03-28',
  freeSlotStart: '2026-03-28T14:00:00',
  freeSlotEnd: '2026-03-28T17:00:00',
  tomorrowFreeSlotStart: '2026-03-29T14:00:00',
  tomorrowFreeSlotEnd: '2026-03-29T17:00:00',
  todayEvent: '2026-03-28T17:00:00',
  tomorrowEvent: '2026-03-29T19:00:00',
} as const;

export const statuses = {
  done: 'DONE',
  todo: 'TODO',
} as const;

export const texts = {
  englishMonthYear: 'July 2026',
  ukrainianMonthYear: 'липень 2026 р.',
  ukrainianFullDate: 'субота, 18 липня 2026 р.',
  ukrainianMorningGreeting: 'Доброго ранку',
  ukrainianOneMinuteAgo: '1 хвилину тому',
  ukrainianTwoMinutesAgo: '2 хвилини тому',
  ukrainianFiveMinutesAgo: '5 хвилин тому',
  ukrainianJustNow: 'Щойно',
  ukrainianYesterday: 'Вчора',
  ukrainianDone: 'Готово',
  ukrainianNoDueDate: 'Без терміну',
  ukrainianToday: 'Сьогодні',
  ukrainianTodayFreeSlot: 'Сьогодні 2–5 PM',
  ukrainianTomorrowFreeSlot: 'Завтра 2–5 PM',
  ukrainianTodayRelativeEvent: 'Сьогодні · 5 PM',
  ukrainianTomorrowRelativeEvent: 'Завтра · 7 PM',
} as const;
