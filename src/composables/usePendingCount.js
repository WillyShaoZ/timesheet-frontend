import { ref, onMounted } from 'vue'
import axios from 'axios'

const pendingCount = ref(0)

export function usePendingCount() {
  const API_BASE = 'https://timesheet-backend-production-badb.up.railway.app'

  async function refreshCount() {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const { data } = await axios.get(`${API_BASE}/timesheet/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      pendingCount.value = data.total
    } catch {
      pendingCount.value = 0
    }
  }

  onMounted(refreshCount)
  return { pendingCount, refreshCount }
}
