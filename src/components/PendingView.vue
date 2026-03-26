<template>
  <div class="page">
    <div class="topbar">
      <div style="display:flex;align-items:center;gap:12px;">
        <h2 class="title">存疑记录</h2>
        <el-badge v-if="entries.length" :value="entries.length" type="warning" />
      </div>
      <div style="display:flex;gap:8px;">
        <el-button @click="$router.push('/')">消息</el-button>
        <el-button @click="$router.push('/timesheet')">工时表格</el-button>
        <el-button @click="$router.push('/audit')">操作日志</el-button>
        <el-button @click="logout">退出</el-button>
      </div>
    </div>

    <el-empty v-if="!loading && entries.length === 0" description="暂无存疑记录，解析运行正常" />

    <div v-for="entry in entries" :key="entry.id" class="card">
      <!-- AI 存疑原因 -->
      <div class="ai-note">
        <el-icon style="color:#F59E0B;margin-right:6px;"><Warning /></el-icon>
        <span>{{ entry.ai_note }}</span>
      </div>

      <!-- 可编辑字段 -->
      <div class="fields">
        <div class="field">
          <label>日期</label>
          <el-input v-model="entry.date" placeholder="YYYY-MM-DD" size="small" style="width:140px" />
        </div>
        <div class="field">
          <label>工人姓名</label>
          <el-input v-model="entry.name" placeholder="姓名" size="small" style="width:120px" />
        </div>
        <div class="field">
          <label>工地地址</label>
          <el-input v-model="entry.address" placeholder="地址" size="small" style="width:200px" />
        </div>
        <div class="field">
          <label>工时(h)</label>
          <el-input-number v-model="entry.hours" :min="0" :step="0.5" :controls="false" size="small" style="width:80px" />
        </div>
        <div class="field">
          <label>人数</label>
          <el-input-number v-model="entry.people_count" :min="1" :controls="false" size="small" style="width:70px" />
        </div>
        <div class="field">
          <label>工时合计</label>
          <el-input-number v-model="entry.total_hours" :min="0" :step="0.5" :controls="false" size="small" style="width:80px" />
        </div>
        <div class="field">
          <label>核对工时</label>
          <el-input-number v-model="entry.verified_hours" :min="0" :step="0.5" :controls="false" size="small" style="width:80px" />
        </div>
        <div class="field">
          <label>备注</label>
          <el-input v-model="entry.notes" placeholder="备注" size="small" style="width:160px" />
        </div>
      </div>

      <!-- 原始消息 -->
      <div class="raw-msg" v-if="entry.source_message_id">
        原始消息 ID #{{ entry.source_message_id }}
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button type="success" size="small" @click="confirm(entry)">确认无误，加入工时表</el-button>
        <el-button type="danger" size="small" plain @click="reject(entry)">驳回（忽略这条）</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'

const router = useRouter()
const entries = ref([])
const loading = ref(false)

const API_BASE = 'https://timesheet-backend-production-badb.up.railway.app'

function getHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchPending() {
  loading.value = true
  try {
    const { data } = await axios.get(`${API_BASE}/timesheet/pending`, { headers: getHeaders() })
    entries.value = data.items.map(e => ({
      ...e,
      verified_hours: e.verified_hours ?? e.total_hours ?? e.hours,
    }))
  } catch (e) {
    if (e.response?.status === 401) logout()
  } finally {
    loading.value = false
  }
}

async function confirm(entry) {
  try {
    await axios.post(`${API_BASE}/timesheet/entries/${entry.id}/confirm`, {
      name: entry.name,
      address: entry.address,
      date: entry.date,
      hours: entry.hours,
      total_hours: entry.total_hours,
      verified_hours: entry.verified_hours,
      people_count: entry.people_count,
      notes: entry.notes,
    }, { headers: getHeaders() })
    entries.value = entries.value.filter(e => e.id !== entry.id)
    ElMessage.success('已确认，已加入工时表')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function reject(entry) {
  await ElMessageBox.confirm('确认驳回并忽略这条记录？', '提示', { type: 'warning' })
  try {
    await axios.post(`${API_BASE}/timesheet/entries/${entry.id}/reject`, {}, { headers: getHeaders() })
    entries.value = entries.value.filter(e => e.id !== entry.id)
    ElMessage.success('已驳回')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  router.push('/login')
}

onMounted(fetchPending)
</script>

<style scoped>
.page { min-height: 100vh; background: #F8FAFC; padding: 24px; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title { font-size: 20px; font-weight: 700; color: #1E293B; margin: 0; }

.card {
  background: #fff;
  border: 1px solid #FCD34D;
  border-left: 4px solid #F59E0B;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.ai-note {
  display: flex;
  align-items: flex-start;
  background: #FFFBEB;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: #92400E;
  margin-bottom: 14px;
}

.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 12px;
  color: #64748B;
}

.raw-msg {
  font-size: 12px;
  color: #94A3B8;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
