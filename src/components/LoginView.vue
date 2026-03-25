<template>
  <div class="login-page">
    <div class="login-box">
      <h1 class="title">工时管理系统</h1>
      <p class="subtitle">请登录以查看工时记录</p>

      <el-form @submit.prevent="handleLogin" class="form">
        <el-form-item>
          <el-input
            v-model="username"
            placeholder="用户名"
            size="large"
            prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          style="width: 100%"
          @click="handleLogin"
        >
          登录
        </el-button>
      </el-form>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const API_BASE = 'https://timesheet-backend-production-badb.up.railway.app'

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const form = new URLSearchParams()
    form.append('username', username.value)
    form.append('password', password.value)

    const { data } = await axios.post(`${API_BASE}/auth/login`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('role', data.role)
    router.push('/')
  } catch (e) {
    errorMsg.value = e.response?.data?.detail || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 8px;
  text-align: center;
}

.subtitle {
  font-size: 14px;
  color: #64748B;
  margin: 0 0 32px;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-msg {
  color: #EF4444;
  font-size: 14px;
  text-align: center;
  margin: 16px 0 0;
}
</style>
