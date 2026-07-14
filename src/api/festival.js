const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function fetchFestivals(year, month) {
  const url = new URL('/festivals', API_BASE_URL)
  url.searchParams.set('year', String(year))
  url.searchParams.set('month', String(month))

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('축제 일정을 불러오지 못했습니다.')
  }

  return response.json()
}
