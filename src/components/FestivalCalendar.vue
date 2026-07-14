<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchFestivals } from '../api/festival'

const viewDate = ref(new Date(2026, 7, 1))
const selectedDate = ref('2026-08-01')
const festivals = ref([])
const loading = ref(false)
const errorMessage = ref('')
const weekDays = ['일', '월', '화', '수', '목', '금', '토']
const eventColors = [
  { solid: '#168ac7', soft: '#d9effc' },
  { solid: '#7c5cc4', soft: '#ebe5fa' },
  { solid: '#16866f', soft: '#dff4ee' },
  { solid: '#d06a3b', soft: '#fbe9df' },
  { solid: '#c34f72', soft: '#fae3ea' },
  { solid: '#82711e', soft: '#f5f0d7' }
]

const calendarEvents = computed(() => festivals.value.flatMap((festival) => {
  const duration = festivalDuration(festival)
  if (duration > 30) return []

  return dateRange(festival.startDate, festival.endDate).map((date) => ({
    date,
    title: festival.title,
    area: festival.addr1,
    period: `${festival.startDate} - ${festival.endDate}`,
    type: 'festival',
    color: festivalColor(festival.title),
    showTitle: duration <= 7 || date === festival.startDate
  }))
}))

const longRunningFestivals = computed(() =>
  festivals.value.filter((festival) => festivalDuration(festival) > 30)
)

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth())
const monthLabel = computed(() => `${year.value}년 ${month.value + 1}월`)

const calendarDays = computed(() => {
  const firstDay = new Date(year.value, month.value, 1).getDay()
  const lastDate = new Date(year.value, month.value + 1, 0).getDate()
  const previousLastDate = new Date(year.value, month.value, 0).getDate()
  const totalCells = firstDay + lastDate > 35 ? 42 : 35

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - firstDay + 1
    let date = new Date(year.value, month.value, dayOffset)

    if (dayOffset <= 0) date = new Date(year.value, month.value - 1, previousLastDate + dayOffset)

    const key = formatDate(date)
    const events = eventsForDate(date)
    const titledEvents = events.filter((event) => event.showTitle)
    const continuingEvents = events.filter((event) => !event.showTitle)
    return {
      key,
      day: date.getDate(),
      currentMonth: date.getMonth() === month.value,
      events,
      titledEvents,
      continuingEvents
    }
  })
})

const selectedEvents = computed(() => eventsForDate(new Date(`${selectedDate.value}T00:00:00`)))
const selectedLabel = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekDays[date.getDay()]}요일`
})
function dateRange(start, end) {
  const dates = []
  const current = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  while (current <= last) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function eventsForDate(date) {
  const key = formatDate(date)
  return calendarEvents.value.filter((event) => event.date === key)
}

function festivalDuration(festival) {
  const start = new Date(`${festival.startDate}T00:00:00`)
  const end = new Date(`${festival.endDate}T00:00:00`)
  return Math.floor((end - start) / 86400000) + 1
}

function festivalColor(title) {
  let hash = 0
  for (const character of title) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  return eventColors[Math.abs(hash) % eventColors.length]
}

function eventColorStyle(title) {
  const color = festivalColor(title)
  return { '--event-color': color.solid, '--event-soft': color.soft }
}

async function loadFestivals(targetDate) {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await fetchFestivals(targetDate.getFullYear(), targetDate.getMonth() + 1)
    festivals.value = data.items
  } catch (error) {
    festivals.value = []
    errorMessage.value = error instanceof Error ? error.message : '축제 일정을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function moveMonth(amount) {
  const targetDate = new Date(year.value, month.value + amount, 1)
  viewDate.value = targetDate
  selectedDate.value = formatDate(viewDate.value)
  await loadFestivals(targetDate)
}

function selectDay(day) {
  selectedDate.value = day.key
  if (!day.currentMonth) {
    const date = new Date(`${day.key}T00:00:00`)
    viewDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }
}

onMounted(() => loadFestivals(viewDate.value))
</script>

<template>
  <section class="schedule-shell">
    <div class="schedule-topline">
      <div>
        <span>MONTHLY SCHEDULE</span>
        <h2>부산의 이번 달 즐길 거리</h2>
      </div>
      <div class="month-control" aria-label="달력 월 이동">
        <button aria-label="이전 달" :disabled="loading" @click="moveMonth(-1)">←</button>
        <strong>{{ monthLabel }}</strong>
        <button aria-label="다음 달" :disabled="loading" @click="moveMonth(1)">→</button>
      </div>
    </div>

    <div class="schedule-layout">
      <div class="calendar-wrap">
        <div class="week-row">
          <span v-for="day in weekDays" :key="day">{{ day }}</span>
        </div>
        <div class="month-grid">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-day"
            :class="{ muted: !day.currentMonth, selected: selectedDate === day.key }"
            @click="selectDay(day)"
          >
            <span class="day-number">{{ day.day }}</span>
            <span class="day-event-content">
              <span
                v-for="event in day.titledEvents.slice(0, 2)"
                :key="`${event.title}-${event.type}`"
                class="event-chip"
                :class="event.type"
                :title="event.title"
                :style="{ '--event-color': event.color.solid, '--event-soft': event.color.soft }"
              >
                {{ event.title }}
              </span>
              <span v-if="day.continuingEvents.length" class="ongoing-badge">
                <span class="ongoing-colors" aria-hidden="true">
                  <i
                    v-for="event in day.continuingEvents.slice(0, 4)"
                    :key="event.title"
                    :style="{ backgroundColor: event.color.solid }"
                  ></i>
                </span>
                진행 중 {{ day.continuingEvents.length }}
              </span>
              <small v-if="day.titledEvents.length > 2">+{{ day.titledEvents.length - 2 }}</small>
            </span>
          </button>
        </div>
      </div>

      <aside class="day-panel">
        <p>SELECTED DAY</p>
        <h3>{{ selectedLabel }}</h3>
        <div v-if="selectedEvents.length" class="day-events">
          <article v-for="event in selectedEvents" :key="`${event.title}-${event.type}`">
            <span :class="event.type" :style="{ backgroundColor: event.color.solid }"></span>
            <div>
              <strong>{{ event.title }}</strong>
              <p>{{ event.area }}</p>
              <small>{{ event.period }}</small>
            </div>
          </article>
        </div>
        <div v-else-if="loading" class="no-event">축제 일정을 불러오는 중입니다.</div>
        <div v-else-if="errorMessage" class="no-event error-message">{{ errorMessage }}</div>
        <div v-else class="no-event">등록된 일정이 없어요.<br />다른 날짜를 선택해 보세요.</div>

        <div v-if="longRunningFestivals.length" class="long-running-events">
          <span>장기·상시 행사</span>
          <article
            v-for="festival in longRunningFestivals"
            :key="`${festival.title}-${festival.startDate}`"
            :style="eventColorStyle(festival.title)"
          >
            <strong>{{ festival.title }}</strong>
            <p>{{ festival.addr1 }}</p>
            <small>{{ festival.startDate }} - {{ festival.endDate }}</small>
          </article>
        </div>
      </aside>
    </div>

    <div class="calendar-legend">
      <span><i class="festival"></i> 지역 축제</span>
      <span><i class="music"></i> 음악 공연</span>
      <span><i class="weekly"></i> 정기 행사</span>
    </div>
  </section>
</template>

<style scoped>
.schedule-shell { border: 1px solid #c8e6fa; border-radius: 30px; background: #fff; overflow: hidden; box-shadow: 0 24px 70px rgba(45, 114, 159, .13); }
.schedule-topline { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding: 30px 34px; background: linear-gradient(120deg, #eaf7ff, #b9e0fd); }
.schedule-topline span, .day-panel > p { color: #168ac7; font-size: 12px; font-weight: 950; letter-spacing: .12em; }
.schedule-topline h2 { margin: 5px 0 0; color: #073b66; font-size: clamp(24px, 3vw, 34px); letter-spacing: -.04em; }
.month-control { display: flex; align-items: center; gap: 12px; border-radius: 999px; background: rgba(255,255,255,.78); padding: 6px; color: #073b66; }
.month-control button { width: 38px; height: 38px; border: 0; border-radius: 50%; background: #fff; color: #126fa7; cursor: pointer; }
.month-control button:disabled { cursor: wait; opacity: .5; }
.month-control strong { min-width: 104px; text-align: center; }
.schedule-layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; }
.calendar-wrap { min-width: 0; padding: 24px; }
.week-row, .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.week-row { color: #6990aa; text-align: center; font-size: 12px; font-weight: 850; }
.week-row span { padding: 0 0 12px; }
.week-row span:first-child { color: #eb6d79; }
.week-row span:last-child { color: #287fca; }
.month-grid { border-top: 1px solid #cae5f7; border-left: 1px solid #cae5f7; }
.calendar-day { min-width: 0; min-height: 116px; border: 0; border-right: 1px solid #cae5f7; border-bottom: 1px solid #cae5f7; background: #fff; padding: 9px 7px; display: flex; flex-direction: column; align-items: stretch; text-align: left; cursor: pointer; overflow: hidden; }
.calendar-day:hover { background: #f3faff; }
.calendar-day.selected { background: #e7f5ff; box-shadow: inset 0 0 0 2px #49a9df; }
.calendar-day.muted { background: #f8fbfd; color: #afc0ca; }
.day-number { display: flex; flex: none; height: 18px; align-items: flex-start; margin-bottom: 4px; font-size: 12px; font-weight: 850; line-height: 1; }
.day-event-content { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.event-chip { display: block; overflow: hidden; width: 100%; border-radius: 5px; padding: 5px 6px; color: #07476e; font-size: 10px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.event-chip.festival { background: var(--event-soft, #b9e0fd); color: var(--event-color, #07476e); }
.event-chip.music { background: #d9cdfb; color: #4f378e; }
.event-chip.weekly { background: #c8f1e7; color: #12604f; }
.ongoing-badge { max-width: 100%; border-radius: 3px; background: #edf5fa; color: #416b84; padding: 3px 6px; display: flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 850; white-space: nowrap; }
.ongoing-colors { display: flex; gap: 2px; }
.ongoing-colors i { width: 5px; height: 10px; border-radius: 2px; }
.calendar-day small { color: #168ac7; font-weight: 800; }
.day-panel { border-left: 1px solid #cae5f7; background: #f5fbff; padding: 30px 24px; }
.day-panel > p { margin: 0; }
.day-panel > h3 { margin: 7px 0 25px; color: #073b66; font-size: 22px; }
.day-events { display: grid; gap: 10px; }
.day-events article { display: grid; grid-template-columns: 8px 1fr; gap: 11px; border: 1px solid #d5eaf8; border-radius: 14px; background: #fff; padding: 14px; }
.day-events article > span { border-radius: 999px; background: #83c9f2; }
.day-events article > span.music { background: #a78bdf; }
.day-events article > span.weekly { background: #50c6a7; }
.day-events strong { display: block; color: #073b66; font-size: 14px; }
.day-events p { margin: 5px 0; color: #607d91; font-size: 12px; }
.day-events small { color: #168ac7; font-weight: 750; }
.no-event { border: 1px dashed #b8d9ed; border-radius: 14px; padding: 20px 12px; color: #7793a6; text-align: center; font-size: 13px; line-height: 1.6; }
.error-message { border-color: #e5aeb4; color: #b64b57; }
.long-running-events { display: grid; gap: 9px; margin-top: 24px; border-top: 1px solid #d5eaf8; padding-top: 20px; }
.long-running-events > span { color: #168ac7; font-size: 11px; font-weight: 900; letter-spacing: .08em; }
.long-running-events article { border: 1px solid #d5eaf8; border-left: 4px solid var(--event-color); border-radius: 12px; background: var(--event-soft); padding: 12px; }
.long-running-events strong { display: block; color: #073b66; font-size: 13px; }
.long-running-events p { margin: 5px 0; color: #607d91; font-size: 11px; line-height: 1.4; }
.long-running-events small { color: #168ac7; font-size: 10px; font-weight: 750; }
.coming-events { display: grid; gap: 7px; margin-top: 24px; border-top: 1px solid #d5eaf8; padding-top: 20px; }
.coming-events span { color: #7793a6; font-size: 11px; font-weight: 850; }
.coming-events strong { color: #126fa7; font-size: 12px; }
.calendar-legend { display: flex; justify-content: flex-end; gap: 18px; padding: 0 30px 24px; color: #607d91; font-size: 11px; }
.calendar-legend span { display: flex; align-items: center; gap: 6px; }
.calendar-legend i { width: 9px; height: 9px; border-radius: 3px; background: #b9e0fd; }
.calendar-legend i.music { background: #d9cdfb; }
.calendar-legend i.weekly { background: #c8f1e7; }

@media (max-width: 900px) {
  .schedule-layout { grid-template-columns: 1fr; }
  .day-panel { border-top: 1px solid #cae5f7; border-left: 0; }
}
@media (max-width: 650px) {
  .schedule-topline { align-items: stretch; flex-direction: column; padding: 24px 20px; }
  .month-control { justify-content: space-between; }
  .calendar-wrap { padding: 12px; overflow-x: auto; }
  .week-row, .month-grid { min-width: 680px; }
  .calendar-day { min-height: 104px; }
  .calendar-legend { justify-content: flex-start; flex-wrap: wrap; padding: 0 20px 20px; }
}
</style>
