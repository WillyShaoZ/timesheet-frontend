<template>
  <div class="page">
    <div class="topbar">
      <h2 class="title">操作日志</h2>
      <div style="display:flex;gap:8px;">
        <el-button @click="$router.push('/')">消息</el-button>
        <el-button @click="$router.push('/timesheet')">工时表格</el-button>
        <el-button @click="logout">退出</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="filter" @change="fetchLogs">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="timesheet_entries">工时表</el-radio-button>
        <el-radio-button value="messages">消息</el-radio-button>
      </el-radio-group>
    </div>

    <div class="table-wrap">
      <el-table :data="logs" border stripe size="small" v-loading="loading" style="width:100%">
        <el-table-column prop="created_at" label="时间" width="170" align="center">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="username" label="操作人" width="90" align="center" />
        <el-table-column prop="action" label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="actionType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="table_name" label="对象" width="110" align="center">
          <template #default="{ row }">{{ tableLabel(row.table_name) }}</template>
        </el-table-column>
        <el-table-column prop="record_id" label="记录ID" width="75" align="center" />
        <el-table-column label="改前" min-width="220">
          <template #default="{ row }">
            <span class="json-text">{{ formatValues(row.old_values) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="改后" min-width="220">
          <template #default="{ row }">
            <span class="json-text">{{ formatValues(row.new_values) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="回滚" width="70" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.action === 'UPDATE' || row.action === 'DELETE'"
              size="small" type="warning" text
              @click="restore(row)"
            >还原</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="padding:16px;display:flex;justify-content:center;">
        <el-pagination
          v-model:current-page="page"
          :page-size="50"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchLogs"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const logs = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const filter = ref('')

const API_BASE = 'https://timesheet-backend-production-badb.up.railway.app'

function getHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchLogs() {
  loading.value = true
  try {
    const params = { page: page.value, size: 50 }
    if (filter.value) params.table_name = filter.value
    const { data } = await axios.get(`${API_BASE}/audit/logs`, { params, headers: getHeaders() })
    logs.value = data.items
    total.value = data.total
  } catch (e) {
    if (e.response?.status === 401) logout()
  } finally {
    loading.value = false
  }
}

async function restore(row) {
  await ElMessageBox.confirm(
    `确认将记录 #${row.record_id} 还原到此次操作前的状态？`,
    '还原确认', { type: 'warning' }
  )
  try {
    await axios.post(`${API_BASE}/timesheet/entries/${row.record_id}/restore`, {}, { headers: getHeaders() })
    ElMessage.success('已还原')
    fetchLogs()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '还原失败')
  }
}

function formatTime(t) {
  if (!t) return ''
  return t.replace('T', ' ').slice(0, 19)
}

function formatValues(v) {
  if (!v) return '-'
  try {
    const obj = JSON.parse(v)
    return Object.entries(obj)
      .filter(([, val]) => val !== null && val !== '' && val !== undefined)
      .map(([k, val]) => `${k}:${val}`)
      .join('  ')
  } catch {
    return v
  }
}

function actionLabel(a) {
  return { CREATE: '新建', UPDATE: '修改', DELETE: '删除', RESTORE: '还原' }[a] || a
}
function actionType(a) {
  return { CREATE: 'success', UPDATE: 'warning', DELETE: 'danger', RESTORE: 'info' }[a] || ''
}
function tableLabel(t) {
  return { timesheet_entries: '工时记录', messages: '消息' }[t] || t
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  router.push('/login')
}

onMounted(fetchLogs)
</script>

<style scoped>
.page { min-height: 100vh; background: #F8FAFC; padding: 24px; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: 700; color: #1E293B; margin: 0; }
.filter-bar { margin-bottom: 16px; }
.table-wrap { background: #fff; border-radius: 10px; border: 1px solid #E2E8F0; overflow: hidden; }
.json-text { font-size: 12px; color: #475569; word-break: break-all; }
</style>
