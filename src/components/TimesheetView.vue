<template>
  <div class="page">
    <!-- 顶部栏 -->
    <div class="topbar">
      <h2 class="title">工时记录表</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:13px;color:#64748B;">{{ roleLabel }}</span>
        <el-button @click="$router.push('/')">消息列表</el-button>
        <el-button @click="$router.push('/audit')">操作日志</el-button>
        <el-button type="success" @click="exportExcel">导出 Excel</el-button>
        <el-button @click="logout">退出</el-button>
      </div>
    </div>

    <!-- 时间段筛选 -->
    <div class="filter-bar">
      <span style="font-size:13px;color:#64748B;margin-right:8px;">时间段：</span>
      <el-button-group>
        <el-button
          v-for="p in periods"
          :key="p.key"
          :type="activePeriod === p.key ? 'primary' : ''"
          size="small"
          @click="selectPeriod(p)"
        >{{ p.label }}</el-button>
      </el-button-group>
      <el-date-picker
        v-model="customRange"
        type="daterange"
        size="small"
        range-separator="~"
        start-placeholder="开始"
        end-placeholder="结束"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="margin-left:12px;width:230px"
        @change="onCustomRange"
      />
    </div>

    <!-- 统计 -->
    <div class="stats">
      <div class="stat-item">
        <div class="stat-val">{{ entries.length }}</div>
        <div class="stat-label">总记录</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">{{ totalHours }}</div>
        <div class="stat-label">总工时(h)</div>
      </div>
      <div class="stat-item">
        <div class="stat-val">¥{{ totalAmount }}</div>
        <div class="stat-label">总金额</div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-wrap">
      <el-table
        :data="entries"
        border
        stripe
        size="small"
        style="width:100%"
        v-loading="loading"
        empty-text="暂无工时记录，运行解析脚本后刷新"
      >
        <el-table-column prop="id" label="序号" width="60" align="center" />
        <el-table-column prop="date" label="日期" width="110" align="center" />
        <el-table-column prop="address" label="地址" min-width="160" />
        <el-table-column prop="name" label="姓名" width="90" align="center" />
        <el-table-column prop="people_count" label="人数" width="60" align="center" />
        <el-table-column prop="hours" label="工时(h)" width="75" align="center" />
        <el-table-column prop="total_hours" label="工时合计" width="80" align="center" />
        <el-table-column label="核对工时" width="90" align="center">
          <template #default="{ row }">
            <el-input-number
              v-model="row.verified_hours"
              :min="0"
              :step="0.5"
              :controls="false"
              size="small"
              style="width:70px"
              @change="val => updateField(row, 'verified_hours', val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="时薪" width="90" align="center">
          <template #default="{ row }">
            <el-input-number
              v-model="row.hourly_rate"
              :min="0"
              :controls="false"
              size="small"
              style="width:70px"
              @change="val => updateField(row, 'hourly_rate', val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="85" align="center">
          <template #default="{ row }">
            {{ computeAmount(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="120" />
        <el-table-column label="操作" width="65" align="center">
          <template #default="{ row }">
            <el-button type="danger" size="small" text @click="deleteEntry(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const entries = ref([])
const loading = ref(false)
const dateFrom = ref('')
const dateTo = ref('')
const activePeriod = ref('this_month')
const customRange = ref(null)

const API_BASE = 'https://timesheet-backend-production-badb.up.railway.app'

const roleLabel = computed(() => {
  const r = localStorage.getItem('role')
  return r === 'boss' ? '老板' : r === 'accountant' ? '会计' : ''
})

function getHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 时间段配置
function getPeriods() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const pad = n => String(n).padStart(2, '0')
  const daysInMonth = new Date(y, m, 0).getDate()

  // 上个月
  const prevM = m === 1 ? 12 : m - 1
  const prevY = m === 1 ? y - 1 : y
  const prevDays = new Date(prevY, prevM, 0).getDate()

  return [
    { key: 'first_half', label: '上半月', from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-15` },
    { key: 'second_half', label: '下半月', from: `${y}-${pad(m)}-16`, to: `${y}-${pad(m)}-${daysInMonth}` },
    { key: 'this_month', label: '本月', from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${daysInMonth}` },
    { key: 'last_month', label: '上月', from: `${prevY}-${pad(prevM)}-01`, to: `${prevY}-${pad(prevM)}-${prevDays}` },
    { key: 'all', label: '全部', from: '', to: '' },
  ]
}

const periods = computed(() => getPeriods())

function selectPeriod(p) {
  activePeriod.value = p.key
  customRange.value = null
  dateFrom.value = p.from
  dateTo.value = p.to
  fetchEntries()
}

function onCustomRange(val) {
  if (val) {
    activePeriod.value = 'custom'
    dateFrom.value = val[0]
    dateTo.value = val[1]
    fetchEntries()
  }
}

const totalHours = computed(() =>
  entries.value.reduce((s, e) => s + (e.total_hours || e.hours || 0), 0).toFixed(1)
)

const totalAmount = computed(() =>
  entries.value.reduce((s, e) => s + (computeAmount(e) || 0), 0).toFixed(0)
)

function computeAmount(row) {
  if (row.amount) return row.amount
  if (row.verified_hours && row.hourly_rate) return (row.verified_hours * row.hourly_rate).toFixed(2)
  return ''
}

async function fetchEntries() {
  loading.value = true
  try {
    const params = { page: 1, size: 500 }
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value
    const { data } = await axios.get(`${API_BASE}/timesheet/entries`, { params, headers: getHeaders() })
    entries.value = data.items
  } catch (e) {
    if (e.response?.status === 401) logout()
  } finally {
    loading.value = false
  }
}

async function updateField(row, field, val) {
  try {
    await axios.patch(`${API_BASE}/timesheet/entries/${row.id}`, { [field]: val }, { headers: getHeaders() })
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

async function deleteEntry(id) {
  await ElMessageBox.confirm('确认删除这条工时记录？', '提示', { type: 'warning' })
  try {
    await axios.delete(`${API_BASE}/timesheet/entries/${id}`, { headers: getHeaders() })
    entries.value = entries.value.filter(e => e.id !== id)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

async function exportExcel() {
  try {
    const params = {}
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value
    const resp = await axios.get(`${API_BASE}/timesheet/export`, {
      params,
      headers: getHeaders(),
      responseType: 'blob'
    })
    const url = URL.createObjectURL(resp.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `工时记录_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  router.push('/login')
}

onMounted(() => {
  // 默认选本月
  const p = periods.value.find(x => x.key === 'this_month')
  dateFrom.value = p.from
  dateTo.value = p.to
  fetchEntries()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F8FAFC;
  padding: 24px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  color: #1E293B;
  margin: 0;
}
.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.stat-item {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 12px 24px;
  text-align: center;
  min-width: 100px;
}
.stat-val {
  font-size: 22px;
  font-weight: 700;
  color: #1E293B;
}
.stat-label {
  font-size: 12px;
  color: #64748B;
  margin-top: 4px;
}
.table-wrap {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #E2E8F0;
  overflow: hidden;
}
</style>
