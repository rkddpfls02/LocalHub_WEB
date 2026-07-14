<script setup>
import { computed, nextTick, ref } from 'vue'
import { categories, courses, heroImage } from './data'
import { sendChatMessage } from './api/chat'
import FestivalCalendar from './components/FestivalCalendar.vue'
import ReviewBoard from './components/ReviewBoard.vue'
import buriburiLogo from './assets/buriburi-logo.png'

const currentView = ref('home')
const homeQuery = ref('')
const reviewBoard = ref(null)
const chatOpen = ref(false)
const chatText = ref('')
const chatLoading = ref(false)
const chatMessages = ref([
  { from: 'bot', text: '안녕하세요! 부산 장소, 축제, 여행코스를 물어보세요.' }
])

const homeCategories = computed(() => categories)
const festivalCategory = computed(() => categories.find((category) => category.slug === 'festival'))
const searchablePlaces = computed(() => categories.flatMap((category) =>
  category.items.map((place) => ({ ...place, category: category.label, slug: category.slug }))
))
const homeSearchResults = computed(() => {
  const keyword = homeQuery.value.trim().toLowerCase()
  if (!keyword) return []
  return searchablePlaces.value.filter((place) =>
    `${place.title} ${place.area} ${place.category} ${place.text}`.toLowerCase().includes(keyword)
  )
})

function scrollSection(slug, direction) {
  const track = document.querySelector(`#track-${slug}`)
  const card = track?.querySelector('.card')
  if (!track || !card) return

  const gap = Number.parseFloat(getComputedStyle(track).gap) || 0
  track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: 'smooth' })
}

function changeView(view) {
  currentView.value = view
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goHome() {
  homeQuery.value = ''
  changeView('home')
}

async function openPlaceReviews(place) {
  currentView.value = 'detail'
  await nextTick()
  reviewBoard.value?.openPlace(place)
  window.scrollTo({ top: 0 })
}

function goBackFromDetail() {
  currentView.value = 'home'
  window.scrollTo({ top: 0 })
}

async function sendChat() {
  const value = chatText.value.trim()
  if (!value || chatLoading.value) return

  chatMessages.value.push({ from: 'user', text: value })
  chatText.value = ''
  chatLoading.value = true

  const loadingIndex = chatMessages.value.length
  chatMessages.value.push({
    from: 'bot',
    text: '답변을 불러오는 중입니다...',
    loading: true
  })

  try {
    const answer = await sendChatMessage(value)
    chatMessages.value[loadingIndex] = { from: 'bot', text: answer }
  } catch {
    chatMessages.value[loadingIndex] = {
      from: 'bot',
      text: '챗봇 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    }
  } finally {
    chatLoading.value = false
  }
}
</script>

<template>
  <header class="header">
    <div class="container header-inner">
      <a class="brand" href="#top" aria-label="BURIBURI 홈" @click.prevent="goHome">
        <img :src="buriburiLogo" alt="BURIBURI" />
      </a>
      <nav>
        <button @click="goHome">리뷰 게시판</button>
        <button :class="{ active: currentView === 'courses' }" @click="changeView('courses')">여행코스</button>
        <button :class="{ active: currentView === 'festival' }" @click="changeView('festival')">축제 일정</button>
      </nav>
    </div>
  </header>

  <main id="top">
    <section v-if="currentView === 'home'" class="hero">
      <div class="container hero-inner">
        <p class="eyebrow">부산의 장소와 사람을 연결하는 로컬 커뮤니티</p>
        <h1>부산, 어디부터 가볼까요?</h1>
        <p class="hero-copy">
          관광지부터 문화시설, 축제, 레포츠, 숙박, 쇼핑까지<br />
          부산의 장소 정보와 실제 방문 후기를 한곳에서 만나보세요.
        </p>
        <div class="search">
          <span aria-hidden="true">⌕</span>
          <input v-model="homeQuery" type="search" placeholder="장소명, 지역, 카테고리를 입력하세요" aria-label="부산 장소 검색" />
          <button v-if="homeQuery" class="clear-search" type="button" aria-label="검색어 지우기" title="검색어 지우기" @click="homeQuery = ''">×</button>
        </div>
      </div>
    </section>

    <template v-if="currentView === 'home' && homeQuery.trim()">
    <section v-if="homeQuery.trim()" class="container result-section">
      <div class="section-title"><div><p>SEARCH RESULT</p><h2>‘{{ homeQuery }}’ 검색 결과 {{ homeSearchResults.length }}곳</h2></div></div>
      <div v-if="homeSearchResults.length" class="result-grid">
        <article v-for="place in homeSearchResults" :key="`${place.slug}-${place.title}`" class="card clickable-card" tabindex="0" role="button" @click="openPlaceReviews(place)" @keydown.enter="openPlaceReviews(place)">
          <div class="card-image"><img :src="place.image" :alt="place.title" /><span>{{ place.category }}</span></div>
          <p class="area">{{ place.area }}</p><h3>{{ place.title }}</h3><p class="card-text">{{ place.text }}</p>
          <div class="rating"><strong>{{ place.rating.toFixed(1) }}</strong><span>리뷰 {{ place.reviews }}개</span></div>
        </article>
      </div>
      <div v-else class="empty">입력한 조건에 맞는 장소가 없습니다.</div>
    </section>
    </template>

    <ReviewBoard
      v-if="currentView === 'detail'"
      ref="reviewBoard"
      :categories="categories"
      detail-only
      show-back
      @back="goBackFromDetail"
    />

    <template v-if="currentView === 'home' && !homeQuery.trim()">
    <section class="container busan-banner">
      <div class="banner" :style="{ backgroundImage: `url(${heroImage})` }">
        <div class="banner-shade"></div>
        <div class="banner-copy">
          <p>LOCALHUB BUSAN</p>
          <h2>바다와 도시가 만나는 곳,<br />부산을 더 깊게 발견하세요.</h2>
          <div>
            <a href="#places">부산 장소 둘러보기</a>
          </div>
        </div>
      </div>
    </section>

    <section id="places" class="container intro">
      <p>EXPLORE BUSAN</p>
      <h2>관심 있는 카테고리부터 부산을 둘러보세요.</h2>
    </section>

    <section
      v-for="category in homeCategories"
      :key="category.slug"
      class="container category-section"
    >
      <div class="section-title">
        <div>
          <p>{{ category.label }}</p>
          <h2>{{ category.subtitle }}</h2>
        </div>
        <div class="section-buttons">
          <button type="button" :aria-label="`${category.label} 이전 장소`" @click="scrollSection(category.slug, -1)">←</button>
          <button type="button" :aria-label="`${category.label} 다음 장소`" @click="scrollSection(category.slug, 1)">→</button>
        </div>
      </div>

      <div :id="`track-${category.slug}`" class="card-track">
        <article
          v-for="place in category.items"
          :key="place.title"
          class="card clickable-card"
          tabindex="0"
          role="button"
          @click="openPlaceReviews({ ...place, category: category.label, slug: category.slug })"
          @keydown.enter="openPlaceReviews({ ...place, category: category.label, slug: category.slug })"
        >
          <div class="card-image">
            <img :src="place.image" :alt="place.title" loading="lazy" />
            <button class="heart" type="button" aria-label="저장" @click.stop>♡</button>
            <span>{{ category.label }}</span>
          </div>
          <p class="area">{{ place.area }}</p>
          <h3>{{ place.title }}</h3>
          <p class="card-text">{{ place.text }}</p>
          <p v-if="place.period" class="period">{{ place.period }}</p>
          <div class="rating">
            <strong>{{ place.rating.toFixed(1) }}</strong>
            <i v-for="n in 5" :key="n"></i>
            <span>({{ place.reviews }})</span>
          </div>
        </article>
      </div>
    </section>
    </template>

    <section v-if="currentView === 'courses'" class="page-heading container">
      <p>TRIP COURSE</p>
      <h1>부산 여행코스</h1>
      <span>테마와 동선을 확인하고 나에게 맞는 부산 여행을 골라보세요.</span>
    </section>

    <section v-if="currentView === 'courses'" id="courses" class="course-section standalone">
      <div class="container">
        <div class="course-heading">
          <div>
            <p>TRIP COURSE</p>
            <h2>어디부터 갈지 고민될 때,<br />순서대로 따라가는 부산 여행코스</h2>
          </div>
          <a href="#course-list">모든 코스 보기 →</a>
        </div>

        <div class="course-layout">
          <div class="route-map">
            <div class="map-grid"></div>
            <svg viewBox="0 0 600 410" aria-hidden="true">
              <path
                d="M90 315 C160 250, 155 155, 278 165 S420 120, 510 70"
                fill="none"
                stroke="#16e1b2"
                stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="2 18"
              />
            </svg>
            <span class="marker m1">1</span>
            <span class="marker m2">2</span>
            <span class="marker m3">3</span>
            <span class="marker m4">4</span>
            <div class="route-caption">
              <strong>부산 바다 하루 코스</strong>
              <span>광안리 → 해운대 → 청사포 → 송정</span>
            </div>
          </div>

          <div id="course-list" class="course-list">
            <article v-for="course in courses" :key="course.title" class="course-card">
              <img :src="course.image" :alt="course.title" />
              <div>
                <p>{{ course.theme }} · {{ course.duration }}</p>
                <h3>{{ course.title }}</h3>
                <ol>
                  <li v-for="(stop, index) in course.stops" :key="stop">
                    {{ index + 1 }}. {{ stop }}
                  </li>
                </ol>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <template v-if="currentView === 'festival' && festivalCategory">
      <section class="page-heading container">
        <p>FESTIVAL & EVENTS</p>
        <h1>부산 축제 일정</h1>
        <span>부산 곳곳에서 열리는 축제와 공연 일정을 한눈에 확인해 보세요.</span>
      </section>

      <section class="container calendar-section">
        <FestivalCalendar />
      </section>
    </template>

  </main>

  <button class="chat-fab" @click="chatOpen = !chatOpen">
    <span>💬</span><strong>여행 질문</strong>
  </button>

  <transition name="chat">
    <section v-if="chatOpen" class="chat">
      <header>
        <div><strong>LocalHub 챗봇</strong><small>부산 정보를 물어보세요</small></div>
        <button @click="chatOpen = false">×</button>
      </header>
      <div class="messages">
        <p
          v-for="(message, index) in chatMessages"
          :key="index"
          :class="[message.from, { loading: message.loading }]"
        >
          {{ message.text }}
        </p>
      </div>
      <form @submit.prevent="sendChat">
        <input v-model="chatText" :disabled="chatLoading" placeholder="예: 8월 축제 알려줘" />
        <button :disabled="chatLoading || !chatText.trim()">전송</button>
      </form>
    </section>
  </transition>
</template>
