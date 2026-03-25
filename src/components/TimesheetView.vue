<template>
  <div class="page">
    <!-- 顶部栏 -->
    <div class="topbar">
      <h2 class="title">工时记录表</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:13px;color:#64748B;">{{ roleLabel }}</span>
        <el-button @click="$router.push('/')">消息列表</el-button>
        <el-button type="success" @click="exportExcel">导出 Excel</el-button>
        <el-button @click="logout">退出</el-button>
      </div>
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

const API_BASE = 'https://timesheet-backend-production-badb.up.railway.app'

const roleLabel = computed(() => {
  const r = localStorage.getItem('role')
  return r === 'boss' ? '老板' : r === 'accountant' ? '会计' : ''
})

function getHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
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
    const { data } = await axios.get(`${API_BASE}/timesheet/entries`, {
      params: { page: 1, size: 500 },
      headers: getHeaders()
    })
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
    const resp = await axios.get(`${API_BASE}/timesheet/export`, {
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

onMounted(fetchEntries)
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
