<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">工时消息</h1>
        <p class="subtitle">来自企业微信的实时消息记录</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:13px;color:#64748B;">{{ roleLabel }}</span>
        <el-button type="primary" :loading="loading" @click="fetchMessages">刷新</el-button>
        <el-button @click="logout">退出</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <el-table
        :data="messages"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: '#F8FAFC', color: '#1E293B', fontWeight: '600' }"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="sender" label="发送人" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.sender" type="info" size="small">{{ row.sender }}</el-tag>
            <span v-else style="color: #94A3B8;">未知</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="消息内容" min-width="300">
          <template #default="{ row }">
            <span style="color: #1E293B;">{{ row.content || row.raw_payload }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="received_at" label="收到时间" width="180">
          <template #default="{ row }">
            <span style="color: #64748B; font-size: 13px;">{{ formatTime(row.received_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="processed" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.processed ? 'success' : 'warning'" size="small">
              {{ row.processed ? '已处理' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchMessages"
        />
      </div>
    </el-card>

    <div v-if="!loading && messages.length === 0" class="empty">
      <p>暂无消息，等待企业微信机器人推送</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const messages = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20

const roleLabel = computed(() => {
  const role = localStorage.getItem('role')
  return role === 'boss' ? '老板' : role === 'accountant' ? '会计' : ''
})

const API_BASE = 'https://timesheet-backend-production-badb.up.railway.app'

function getHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchMessages() {
  loading.value = true
  try {
    const { data } = await axios.get(`${API_BASE}/webhook/messages`, {
      params: { page: page.value, size: pageSize },
      headers: getHeaders()
    })
    messages.value = data.items
    total.value = data.total
  } catch (e) {
    if (e.response?.status === 401) {
      logout()
    } else {
      console.error('获取消息失败', e)
    }
  } finally {
    loading.value = false
  }
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  router.push('/login')
}

function formatTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

onMounted(fetchMessages)
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 4px;
}

.subtitle {
  font-size: 14px;
  color: #64748B;
  margin: 0;
}

.table-card {
  border: 1px solid #E2E8F0;
  border-radius: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.empty {
  text-align: center;
  padding: 60px;
  color: #94A3B8;
  font-size: 14px;
}
</style>
